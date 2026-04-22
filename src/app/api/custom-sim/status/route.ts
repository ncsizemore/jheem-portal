/**
 * API route: Custom Simulation Status
 *
 * GET /api/custom-sim/status?model={id}&loc={location}&key={scenarioKey}[&runId={id}]
 *
 * Checks simulation progress via the GitHub Actions API.
 * - If data already exists on CloudFront: returns { status: "complete", dataUrl }
 * - If a matching workflow run is found: returns step-level progress
 * - If no run found: returns { status: "not_found" }
 *
 * When runId is provided, fetches that specific run directly (efficient).
 * Otherwise, searches recent runs by matching the run-name pattern.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getModelConfig } from '@/config/model-configs';
import { logTrigger, buildEntry } from '@/lib/trigger-log';

// --- Upstash Redis for simulation progress ---
let redisClient: Redis | null = null;
function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redisClient = new Redis({ url, token });
  return redisClient;
}

interface SimProgress {
  percent: number;
  simsComplete: number;
  simsTotal: number;
}

async function getSimProgress(modelId: string, location: string, scenarioKey: string): Promise<SimProgress | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const data = await redis.get<SimProgress>(`progress:${modelId}:${location}:${scenarioKey}`);
    if (data && typeof data.percent === 'number') return data;
    return null;
  } catch {
    return null;
  }
}

// Portal model ID → backend model ID (same mapping as route.ts).
// The workflow writes progress keys using the backend ID.
const BACKEND_MODEL_ID_MAP: Record<string, string> = {
  'ryan-white': 'ryan-white-msa',
};

const GITHUB_API = 'https://api.github.com';
const GITHUB_REPO = 'ncsizemore/jheem-backend';
const WORKFLOW_FILE = 'run-custom-sim.yml';

// Same format whitelist as the trigger route. See notes there.
const LOCATION_FORMAT = /^[A-Z]{2}$|^C\.\d+$/;

/** Map GitHub Actions step names to user-facing phases.
 *  Multiple workflow steps can map to the same phase (e.g., all setup → 'preparing'). */
const PROGRESS_STEPS: Record<string, { label: string; phase: string }> = {
  'Checkout jheem-backend (for config)': { label: 'Initializing workflow...', phase: 'preparing' },
  'Load model configuration': { label: 'Loading model configuration...', phase: 'preparing' },
  'Configure AWS credentials': { label: 'Configuring credentials...', phase: 'preparing' },
  'Download base simset from GitHub Release': { label: 'Downloading base simulation data...', phase: 'preparing' },
  'Login to GitHub Container Registry': { label: 'Pulling simulation container...', phase: 'preparing' },
  'Checkout jheem-portal (for aggregation scripts)': { label: 'Preparing data pipeline...', phase: 'preparing' },
  'Setup Node.js': { label: 'Preparing data pipeline...', phase: 'preparing' },
  'Install portal dependencies': { label: 'Installing dependencies...', phase: 'preparing' },
  'Run custom simulation': { label: 'Running simulation — this may take several minutes...', phase: 'simulating' },
  'Aggregate location data': { label: 'Aggregating results...', phase: 'processing' },
  'Upload to S3': { label: 'Uploading results...', phase: 'uploading' },
  'Invalidate CloudFront cache': { label: 'Finalizing — results almost ready...', phase: 'uploading' },
};

interface StepInfo {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
  started_at: string | null;
  completed_at: string | null;
}


async function githubFetch(path: string, token: string) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }
  return response.json();
}



function getProgressFromSteps(steps: StepInfo[]) {
  const activeStep = steps.find((s) => s.status === 'in_progress');
  const completedSteps = steps.filter((s) => s.status === 'completed' && s.conclusion === 'success');
  const failedStep = steps.find((s) => s.conclusion === 'failure');

  if (failedStep) {
    return {
      phase: 'failed',
      label: `Failed at: ${failedStep.name}`,
      stepName: failedStep.name,
    };
  }

  if (activeStep) {
    const progress = PROGRESS_STEPS[activeStep.name];
    return {
      phase: progress?.phase ?? 'running',
      label: progress?.label ?? `Running: ${activeStep.name}`,
      stepName: activeStep.name,
      startedAt: activeStep.started_at,
    };
  }

  // No active step — might be in a brief gap between steps.
  // Look at the NEXT pending step (the one about to run) rather than the
  // last completed step, so we never regress to an earlier phase.
  if (completedSteps.length > 0) {
    const lastCompletedIdx = steps.findIndex(
      (s) => s.name === completedSteps[completedSteps.length - 1].name
    );
    // Find next non-completed step
    const nextStep = steps.slice(lastCompletedIdx + 1).find(
      (s) => s.status !== 'completed'
    );
    if (nextStep) {
      const progress = PROGRESS_STEPS[nextStep.name];
      if (progress) {
        return {
          phase: progress.phase,
          label: progress.label,
          stepName: nextStep.name,
        };
      }
    }
    // Fallback: use last completed step
    const last = completedSteps[completedSteps.length - 1];
    const progress = PROGRESS_STEPS[last.name];
    return {
      phase: progress?.phase ?? 'running',
      label: progress?.label ?? `Completed: ${last.name}`,
      stepName: last.name,
    };
  }

  return { phase: 'queued', label: 'Waiting to start...', stepName: null };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('model');
    const location = searchParams.get('loc');
    const scenarioKey = searchParams.get('key');
    const runId = searchParams.get('runId');

    // Condensed status log: just the query params, no body. Status
    // polls run every ~10s during a sim so volume is high (~30-60 per
    // legit run); we keep entries small. Anyone scraping this endpoint
    // for runIds or fishing for run state will still show up in logs.
    logTrigger(
      buildEntry(request, 'status', {
        query: {
          model: modelId ?? '',
          loc: location ?? '',
          key: scenarioKey ?? '',
          ...(runId ? { runId } : {}),
        },
      })
    );

    if (!modelId || !location || !scenarioKey) {
      return NextResponse.json(
        { error: 'Missing required params: model, loc, key' },
        { status: 400 }
      );
    }

    const config = getModelConfig(modelId);
    if (!config) {
      return NextResponse.json({ error: `Unknown model: ${modelId}` }, { status: 400 });
    }

    if (!LOCATION_FORMAT.test(location) || !config.locations.includes(location)) {
      return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
    }

    // The workflow writes Redis keys using the backend model ID
    const backendModelId = BACKEND_MODEL_ID_MAP[modelId] || modelId;

    const dataUrl = `${config.dataUrl}/custom/${location}/${scenarioKey}.json`;

    // --- Check if data already exists on CloudFront ---
    const cacheCheck = await fetch(dataUrl, { method: 'HEAD' });
    if (cacheCheck.ok) {
      return NextResponse.json({
        status: 'complete',
        dataUrl,
      });
    }

    // --- Check GitHub Actions for run status ---
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json(
        { error: 'Server configuration error: missing GitHub token' },
        { status: 500 }
      );
    }

    // If we have a specific run ID, check it directly
    if (runId) {
      try {
        const run = await githubFetch(`/repos/${GITHUB_REPO}/actions/runs/${runId}`, githubToken);

        if (run.status === 'completed') {
          if (run.conclusion === 'success') {
            // Run finished — data should be on CloudFront now
            return NextResponse.json({ status: 'complete', dataUrl });
          }
          // Run failed
          const jobsData = await githubFetch(`/repos/${GITHUB_REPO}/actions/runs/${runId}/jobs`, githubToken);
          const steps: StepInfo[] = jobsData.jobs?.[0]?.steps ?? [];
          const failedStep = steps.find((s: StepInfo) => s.conclusion === 'failure');
          return NextResponse.json({
            status: 'failed',
            error: failedStep ? `Failed at: ${failedStep.name}` : 'Simulation failed',
          });
        }

        // Run still in progress — get step details
        const jobsData = await githubFetch(`/repos/${GITHUB_REPO}/actions/runs/${runId}/jobs`, githubToken);
        const job = jobsData.jobs?.[0];
        const steps: StepInfo[] = job?.steps ?? [];
        const progress = getProgressFromSteps(steps);

        // If we're in the simulation phase, check Redis for live progress %
        const simProgress = progress.phase === 'simulating'
          ? await getSimProgress(backendModelId, location, scenarioKey)
          : null;

        return NextResponse.json({
          status: 'running',
          runId: Number(runId),
          ...progress,
          ...(simProgress && { simulationProgress: simProgress }),
          startedAt: run.run_started_at,
        });
      } catch {
        // Run ID invalid or API error — fall through to search
      }
    }

    // --- Search for matching run by display_title ---
    // run-name format: "custom-sim: {location} {parameters_json}"
    const runsData = await githubFetch(
      `/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=10&event=workflow_dispatch`,
      githubToken
    );

    const matchingRun = runsData.workflow_runs?.find((run: { display_title: string; status: string }) => {
      // Match runs that contain the location in their display title
      return run.display_title.includes(location) &&
        (run.status === 'in_progress' || run.status === 'queued');
    });

    if (!matchingRun) {
      return NextResponse.json({ status: 'not_found' });
    }

    // Found a matching run — get step details
    const jobsData = await githubFetch(
      `/repos/${GITHUB_REPO}/actions/runs/${matchingRun.id}/jobs`,
      githubToken
    );
    const job = jobsData.jobs?.[0];
    const steps: StepInfo[] = job?.steps ?? [];
    const progress = getProgressFromSteps(steps);

    // If we're in the simulation phase, check Redis for live progress %
    const simProgress = progress.phase === 'simulating'
      ? await getSimProgress(backendModelId, location, scenarioKey)
      : null;

    return NextResponse.json({
      status: 'running',
      runId: matchingRun.id,
      ...progress,
      ...(simProgress && { simulationProgress: simProgress }),
      startedAt: matchingRun.run_started_at,
    });
  } catch (error) {
    console.error('Custom sim status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
