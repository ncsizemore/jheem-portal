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
import { logTrigger, buildEntry } from '@/lib/trigger-log';

const GITHUB_API = 'https://api.github.com';
const GITHUB_REPO = 'ncsizemore/jheem-backend';
const WORKFLOW_FILE = 'run-custom-sim.yml';

// Location codes are either two-letter state codes (e.g., 'CA') or
// CBSA codes (e.g., 'C.12580'). This regex is the first line of defense
// before the membership check against the model's allowed location list,
// and ensures no path-traversal or shell-metacharacter sequences ever
// reach the GHA workflow inputs.
const LOCATION_FORMAT = /^[A-Z]{2}$|^C\.\d+$/;

// Pragmatic email format check. Not RFC-perfect — that's not the goal.
// Goal is to reject obviously malformed values before they reach the
// workflow's email-send step. The workflow now passes EMAIL through an
// env: block (no shell injection), so this is defense in depth + a
// guard against using us as a phishing relay.
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 254;

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
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
    const { modelId, location, parameters, email } = body as {
      modelId?: string;
      location?: string;
      parameters?: Record<string, number>;
      email?: string;
    };

    // Log the trigger attempt up front. Fire-and-forget — does not
    // block the response. We log BEFORE validation so rejected
    // requests still appear in the forensic log (that's the data we
    // most want during the post-incident observability window).
    logTrigger(buildEntry(request, 'trigger', { body }));

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

    // Validate location: format whitelist + membership check.
    // Both checks are required: the regex blocks path-traversal /
    // shell-metacharacter inputs even for models we add later, and the
    // membership check ensures we only run sims for locations the model
    // actually supports (otherwise the workflow fails at the simset
    // download step and burns GHA minutes for nothing).
    if (typeof location !== 'string' || !LOCATION_FORMAT.test(location)) {
      return NextResponse.json(
        { error: 'Invalid location format' },
        { status: 400 }
      );
    }
    if (!config.locations.includes(location)) {
      return NextResponse.json(
        { error: `Unknown location for model ${modelId}` },
        { status: 400 }
      );
    }

    // Validate email format if provided. Reject obviously malformed
    // values to prevent abuse of the notification step as a phishing
    // relay (the workflow now handles email safely at the shell level,
    // but we don't want to send branded mail to attacker-chosen targets).
    if (email !== undefined && email !== null && email !== '') {
      if (
        typeof email !== 'string' ||
        email.length > EMAIL_MAX_LENGTH ||
        !EMAIL_FORMAT.test(email)
      ) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
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
            ...(email && { email }),
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
