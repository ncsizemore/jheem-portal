/**
 * API route: Custom Simulation Trigger
 *
 * POST /api/custom-sim
 *   - Derives scenario key from parameters (using model-configs.ts)
 *   - Checks CloudFront cache for existing results
 *   - If cached: returns data URL immediately
 *   - If already running (via GitHub API): returns running status
 *   - If neither: triggers GitHub Actions workflow
 *
 * Request body:
 *   { modelId, location, parameters: { adap_loss: 50, oahs_loss: 30, ... } }
 *
 * Response:
 *   { status: "cached"|"running"|"triggered", scenarioKey, dataUrl }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getModelConfig } from '@/config/model-configs';

const GITHUB_API = 'https://api.github.com';
const GITHUB_REPO = 'ncsizemore/jheem-backend';
const WORKFLOW_FILE = 'run-custom-sim.yml';

// Reverse mapping: portal model ID -> models.json model ID
// (portal uses 'ryan-white', models.json uses 'ryan-white-msa')
const BACKEND_MODEL_ID_MAP: Record<string, string> = {
  'ryan-white': 'ryan-white-msa',
};

function deriveScenarioKey(
  config: NonNullable<ReturnType<typeof getModelConfig>>,
  parameters: Record<string, number>
): string {
  const customSim = config.customSimulation;
  if (!customSim) throw new Error(`Model ${config.id} does not support custom simulations`);

  return customSim.parameters
    .map((p) => `${p.keyPrefix}${parameters[p.id] ?? p.default}`)
    .join('-');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId, location, parameters } = body;

    if (!modelId || !location || !parameters) {
      return NextResponse.json(
        { error: 'Missing required fields: modelId, location, parameters' },
        { status: 400 }
      );
    }

    // Look up model config (synced from models.json)
    const config = getModelConfig(modelId);
    if (!config) {
      return NextResponse.json(
        { error: `Unknown model: ${modelId}` },
        { status: 400 }
      );
    }

    if (!config.customSimulation) {
      return NextResponse.json(
        { error: `Model ${modelId} does not support custom simulations` },
        { status: 400 }
      );
    }

    // Validate and clamp parameter values
    const validatedParams: Record<string, number> = {};
    for (const paramDef of config.customSimulation.parameters) {
      const raw = parameters[paramDef.id];
      if (raw === undefined || raw === null || typeof raw !== 'number' || !isFinite(raw)) {
        validatedParams[paramDef.id] = paramDef.default;
      } else {
        validatedParams[paramDef.id] = Math.round(Math.min(100, Math.max(0, raw)));
      }
    }

    const scenarioKey = deriveScenarioKey(config, validatedParams);
    const dataUrl = `${config.dataUrl}/custom/${location}/${scenarioKey}.json`;

    // --- Check cache: does this result already exist on CloudFront? ---
    const cacheCheck = await fetch(dataUrl, { method: 'HEAD' });

    if (cacheCheck.ok) {
      return NextResponse.json({
        status: 'cached',
        scenarioKey,
        dataUrl,
      });
    }

    // --- Check GitHub Actions for in-progress run (dedup) ---
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json(
        { error: 'Server configuration error: missing GitHub token' },
        { status: 500 }
      );
    }

    try {
      const runsResponse = await fetch(
        `${GITHUB_API}/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=10&event=workflow_dispatch`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (runsResponse.ok) {
        const runsData = await runsResponse.json();
        const matchingRun = runsData.workflow_runs?.find(
          (run: { display_title: string; status: string }) =>
            run.display_title.includes(location) &&
            (run.status === 'in_progress' || run.status === 'queued')
        );

        if (matchingRun) {
          return NextResponse.json({
            status: 'running',
            scenarioKey,
            dataUrl,
            runId: matchingRun.id,
          });
        }
      }
    } catch {
      // GitHub API check failed — proceed to trigger
    }

    // --- Trigger GitHub Actions workflow ---
    const backendModelId = BACKEND_MODEL_ID_MAP[modelId] || modelId;

    const dispatchResponse = await fetch(
      `${GITHUB_API}/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'master',
          inputs: {
            model_id: backendModelId,
            location,
            parameters: JSON.stringify(validatedParams),
          },
        }),
      }
    );

    if (!dispatchResponse.ok) {
      const errorText = await dispatchResponse.text();
      console.error('GitHub dispatch failed:', dispatchResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to trigger simulation' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      status: 'triggered',
      scenarioKey,
      dataUrl,
    });
  } catch (error) {
    console.error('Custom sim API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
