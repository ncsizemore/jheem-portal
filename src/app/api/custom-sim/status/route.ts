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
import { getModelConfig } from '@/config/model-configs';

const GITHUB_API = 'https://api.github.com';
const GITHUB_REPO = 'ncsizemore/jheem-backend';
const WORKFLOW_FILE = 'run-custom-sim.yml';

/** Map GitHub Actions step names to user-facing phases.
 *  Multiple workflow steps can map to the same phase (e.g., all setup → 'preparing'). */
const PROGRESS_STEPS: Record<string, { label: string; phase: string }> = {
  'Checkout jheem-backend (for config)': { label: 'Setting up environment...', phase: 'preparing' },
  'Load model configuration': { label: 'Loading configuration...', phase: 'preparing' },
  'Configure AWS credentials': { label: 'Preparing...', phase: 'preparing' },
  'Download base simset from GitHub Release': { label: 'Downloading simulation data...', phase: 'preparing' },
  'Login to GitHub Container Registry': { label: 'Preparing container...', phase: 'preparing' },
  'Checkout jheem-portal (for aggregation scripts)': { label: 'Preparing...', phase: 'preparing' },
  'Setup Node.js': { label: 'Preparing...', phase: 'preparing' },
  'Install portal dependencies': { label: 'Preparing...', phase: 'preparing' },
  'Run custom simulation': { label: 'Running simulation...', phase: 'simulating' },
  'Aggregate location data': { label: 'Processing results...', phase: 'processing' },
  'Upload to S3': { label: 'Uploading results...', phase: 'uploading' },
  'Invalidate CloudFront cache': { label: 'Finalizing...', phase: 'uploading' },
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

/** Fetch job logs and parse simulation progress percentage */
async function getSimulationProgress(jobId: number, token: string): Promise<{ current: number; total: number; percent: number } | null> {
  try {
    // GitHub returns 302 → Azure Blob Storage URL for the raw logs
    const response = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/actions/jobs/${jobId}/logs`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      console.log(`[sim-progress] logs API returned ${response.status} for job ${jobId}`);
      return null;
    }

    const logs = await response.text();
    console.log(`[sim-progress] fetched ${logs.length} bytes of logs for job ${jobId}`);

    // GitHub Actions logs include timestamps like "2026-03-12T14:46:22.2686241Z   🔄 Simulation progress: 76 of 80 (95%)"
    const matches = [...logs.matchAll(/Simulation progress:\s*(\d+)\s*of\s*(\d+)\s*\((\d+)%\)/g)];
    console.log(`[sim-progress] found ${matches.length} progress matches`);

    if (matches.length === 0) return null;

    const last = matches[matches.length - 1];
    return {
      current: Number(last[1]),
      total: Number(last[2]),
      percent: Number(last[3]),
    };
  } catch (err) {
    console.log(`[sim-progress] error fetching logs for job ${jobId}:`, err);
    return null;
  }
}



function getProgressFromSteps(steps: StepInfo[]) {
  // Find the currently running step (or the last completed one)
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

  // No active step — might be between steps or queued
  if (completedSteps.length > 0) {
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

        // If currently simulating, try to get simulation % from logs
        let simulationProgress = null;
        if (progress.phase === 'simulating' && job?.id) {
          simulationProgress = await getSimulationProgress(job.id, githubToken);
        }

        return NextResponse.json({
          status: 'running',
          runId: Number(runId),
          ...progress,
          simulationProgress,
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

    let simulationProgress = null;
    if (progress.phase === 'simulating' && job?.id) {
      simulationProgress = await getSimulationProgress(job.id, githubToken);
    }

    return NextResponse.json({
      status: 'running',
      runId: matchingRun.id,
      ...progress,
      simulationProgress,
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
