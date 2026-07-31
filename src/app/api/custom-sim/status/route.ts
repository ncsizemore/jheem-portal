/** Exact-identity status endpoint for custom simulations. */

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getModelConfig } from '@/config/model-configs';
import { logTrigger, buildEntry } from '@/lib/trigger-log';
import { buildCustomSimulationScenarioKey } from '@/utils/customSimulationScenario';
import { normalizeCustomSimulationParameters } from '@/utils/customSimulationInput';
import {
  buildCustomSimulationRequestId,
  buildCustomSimulationRunTitle,
  isCanonicalCustomSimulationScenarioKey,
} from '@/utils/customSimulationRequest';

let redisClient: Redis | null = null;
function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redisClient = new Redis({ url, token });
  return redisClient;
}

interface RedisProgress {
  phase: string;
  message?: string;
  percent?: number;
  simsComplete?: number;
  simsTotal?: number;
  filesComplete?: number;
  filesTotal?: number;
}

async function getRedisProgress(modelId: string, location: string, scenarioKey: string): Promise<RedisProgress | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const data = await redis.get<RedisProgress>(`progress:${modelId}:${location}:${scenarioKey}`);
    return data && typeof data.phase === 'string' ? data : null;
  } catch {
    return null;
  }
}

const BACKEND_MODEL_ID_MAP: Record<string, string> = {
  'ryan-white': 'ryan-white-msa',
};
const GITHUB_API = 'https://api.github.com';
const GITHUB_REPO = 'ncsizemore/jheem-backend';
const WORKFLOW_FILE = 'run-custom-sim.yml';
const WORKFLOW_PATH_PREFIX = `.github/workflows/${WORKFLOW_FILE}@`;
const LOCATION_FORMAT = /^[A-Z]{2}$|^C\.\d+$/;
const RUN_ID_FORMAT = /^\d+$/;
const PUBLICATION_GRACE_MS = 10 * 60 * 1000;

const PROGRESS_STEPS: Record<string, { label: string; phase: string }> = {
  'Checkout jheem-backend (for config)': { label: 'Initializing workflow...', phase: 'preparing' },
  'Load model configuration': { label: 'Loading model configuration...', phase: 'preparing' },
  'Configure AWS credentials': { label: 'Configuring credentials...', phase: 'preparing' },
  'Check for an already-published result': { label: 'Checking for existing results...', phase: 'preparing' },
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
  started_at: string | null;
}

interface WorkflowRun {
  id: number;
  display_title: string;
  status: string;
  conclusion: string | null;
  event: string;
  path?: string;
  run_started_at: string | null;
  completed_at: string | null;
}

async function githubFetch(path: string, token: string) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
  return response.json();
}

function getProgressFromSteps(steps: StepInfo[]) {
  const activeStep = steps.find((step) => step.status === 'in_progress');
  const completedSteps = steps.filter((step) => step.status === 'completed' && step.conclusion === 'success');
  const failedStep = steps.find((step) => step.conclusion === 'failure');

  if (failedStep) return { phase: 'failed', label: `Failed at: ${failedStep.name}`, stepName: failedStep.name };
  if (activeStep) {
    const progress = PROGRESS_STEPS[activeStep.name];
    return {
      phase: progress?.phase ?? 'running',
      label: progress?.label ?? `Running: ${activeStep.name}`,
      stepName: activeStep.name,
      startedAt: activeStep.started_at,
    };
  }
  if (completedSteps.length > 0) {
    const last = completedSteps[completedSteps.length - 1];
    const lastIndex = steps.findIndex((step) => step.name === last.name);
    const next = steps.slice(lastIndex + 1).find((step) => step.status !== 'completed');
    const progress = next ? PROGRESS_STEPS[next.name] : PROGRESS_STEPS[last.name];
    return {
      phase: progress?.phase ?? 'running',
      label: progress?.label ?? `Completed: ${last.name}`,
      stepName: next?.name ?? last.name,
    };
  }
  return { phase: 'queued', label: 'Waiting to start...', stepName: null };
}

function isExpectedWorkflow(run: WorkflowRun): boolean {
  return run.event === 'workflow_dispatch' &&
    (run.path === undefined || run.path === `.github/workflows/${WORKFLOW_FILE}` || run.path.startsWith(WORKFLOW_PATH_PREFIX));
}

function matchesLegacyRunTitle(
  title: string,
  backendModelId: string,
  location: string,
  scenarioKey: string,
  customSimulation: NonNullable<ReturnType<typeof getModelConfig>>['customSimulation'],
): boolean {
  if (!customSimulation) return false;
  const prefixes = [
    `custom-sim: legacy:${backendModelId}:${location}:`,
    `custom-sim: ${backendModelId} ${location} `,
  ];
  const prefix = prefixes.find((candidate) => title.startsWith(candidate));
  if (!prefix) return false;
  try {
    const rawParameters: unknown = JSON.parse(title.slice(prefix.length));
    const normalized = normalizeCustomSimulationParameters(customSimulation, rawParameters);
    return normalized.ok &&
      buildCustomSimulationScenarioKey(customSimulation, normalized.parameters) === scenarioKey;
  } catch {
    return false;
  }
}

function isExpectedRun(
  run: WorkflowRun,
  expectedTitle: string,
  legacy: {
    allowed: boolean;
    backendModelId: string;
    location: string;
    scenarioKey: string;
    customSimulation: NonNullable<ReturnType<typeof getModelConfig>>['customSimulation'];
  },
): boolean {
  if (!isExpectedWorkflow(run)) return false;
  return run.display_title === expectedTitle ||
    (legacy.allowed && matchesLegacyRunTitle(
      run.display_title,
      legacy.backendModelId,
      legacy.location,
      legacy.scenarioKey,
      legacy.customSimulation,
    ));
}

async function cacheExists(dataUrl: string): Promise<boolean> {
  try {
    return (await fetch(dataUrl, { method: 'HEAD', cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function responseForRun(
  run: WorkflowRun,
  githubToken: string,
  backendModelId: string,
  location: string,
  scenarioKey: string,
  dataUrl: string,
) {
  if (run.status === 'completed') {
    if (run.conclusion === 'success') {
      if (await cacheExists(dataUrl)) return NextResponse.json({ status: 'complete', dataUrl });

      const completedAt = run.completed_at ? Date.parse(run.completed_at) : Date.now();
      if (Number.isFinite(completedAt) && Date.now() - completedAt > PUBLICATION_GRACE_MS) {
        return NextResponse.json({
          status: 'failed',
          error: 'The simulation finished, but its published result is unavailable. Please try again.',
        });
      }
      return NextResponse.json({
        status: 'running',
        runId: run.id,
        phase: 'finalizing',
        label: 'Finalizing publication — results almost ready...',
        startedAt: run.run_started_at,
      });
    }

    const jobsData = await githubFetch(`/repos/${GITHUB_REPO}/actions/runs/${run.id}/jobs`, githubToken);
    const steps: StepInfo[] = jobsData.jobs?.[0]?.steps ?? [];
    const failedStep = steps.find((step) => step.conclusion === 'failure');
    return NextResponse.json({
      status: 'failed',
      error: failedStep ? `Failed at: ${failedStep.name}` : 'Simulation failed',
    });
  }

  const jobsData = await githubFetch(`/repos/${GITHUB_REPO}/actions/runs/${run.id}/jobs`, githubToken);
  const steps: StepInfo[] = jobsData.jobs?.[0]?.steps ?? [];
  const progress = getProgressFromSteps(steps);
  const redisProgress = progress.phase === 'simulating' || progress.phase === 'processing'
    ? await getRedisProgress(backendModelId, location, scenarioKey)
    : null;

  return NextResponse.json({
    status: 'running',
    runId: run.id,
    ...progress,
    ...(redisProgress && {
      phase: redisProgress.phase,
      label: redisProgress.message ?? progress.label,
      simulationProgress: redisProgress,
    }),
    startedAt: run.run_started_at,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('model');
    const location = searchParams.get('loc');
    const scenarioKey = searchParams.get('key');
    const suppliedRequestId = searchParams.get('requestId');
    const runId = searchParams.get('runId');

    logTrigger(buildEntry(request, 'status', {
      query: {
        model: modelId ?? '', loc: location ?? '', key: scenarioKey ?? '',
        ...(suppliedRequestId ? { requestId: suppliedRequestId } : {}),
        ...(runId ? { runId } : {}),
      },
    }));

    if (!modelId || !location || !scenarioKey) {
      return NextResponse.json({ error: 'Missing required params: model, loc, key' }, { status: 400 });
    }
    const config = getModelConfig(modelId);
    if (!config?.customSimulation) {
      return NextResponse.json({ error: `Unknown or unsupported model: ${modelId}` }, { status: 400 });
    }
    if (!LOCATION_FORMAT.test(location) || !config.locations.includes(location)) {
      return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
    }
    if (!isCanonicalCustomSimulationScenarioKey(config.customSimulation, scenarioKey)) {
      return NextResponse.json({ error: 'Invalid scenario key' }, { status: 400 });
    }

    const backendModelId = BACKEND_MODEL_ID_MAP[modelId] || modelId;
    const expectedRequestId = buildCustomSimulationRequestId(backendModelId, location, scenarioKey);
    const expectedTitle = buildCustomSimulationRunTitle(expectedRequestId);
    const legacyMatch = {
      allowed: suppliedRequestId === null,
      backendModelId,
      location,
      scenarioKey,
      customSimulation: config.customSimulation,
    };
    if (suppliedRequestId && suppliedRequestId !== expectedRequestId) {
      return NextResponse.json({ error: 'Request identity does not match the simulation' }, { status: 409 });
    }
    if (runId && (!RUN_ID_FORMAT.test(runId) || !Number.isSafeInteger(Number(runId)))) {
      return NextResponse.json({ error: 'Invalid run ID' }, { status: 400 });
    }

    const dataUrl = `${config.dataUrl}/custom/${location}/${scenarioKey}.json`;
    if (await cacheExists(dataUrl)) return NextResponse.json({ status: 'complete', dataUrl });

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json({ error: 'Server configuration error: missing GitHub token' }, { status: 500 });
    }

    if (runId) {
      try {
        const run = await githubFetch(`/repos/${GITHUB_REPO}/actions/runs/${runId}`, githubToken) as WorkflowRun;
        if (!isExpectedRun(run, expectedTitle, legacyMatch)) {
          return NextResponse.json({ error: 'Run ID does not match the requested simulation' }, { status: 409 });
        }
        return responseForRun(run, githubToken, backendModelId, location, scenarioKey, dataUrl);
      } catch (error) {
        console.warn('Direct custom-simulation run lookup failed; recovering by exact title:', error);
      }
    }

    const runsData = await githubFetch(
      `/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=100&event=workflow_dispatch`,
      githubToken,
    );
    const matchingRun = runsData.workflow_runs?.find(
      (run: WorkflowRun) => isExpectedRun(run, expectedTitle, legacyMatch),
    ) as WorkflowRun | undefined;
    if (!matchingRun) return NextResponse.json({ status: 'not_found' });

    return responseForRun(matchingRun, githubToken, backendModelId, location, scenarioKey, dataUrl);
  } catch (error) {
    console.error('Custom sim status error:', error);
    return NextResponse.json({ error: 'Simulation status is temporarily unavailable' }, { status: 503 });
  }
}
