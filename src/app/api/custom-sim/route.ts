/** Cache lookup and explicit launch endpoint for custom simulations. */

import { NextRequest, NextResponse } from 'next/server';
import { getModelConfig } from '@/config/model-configs';
import { logTrigger, buildEntry } from '@/lib/trigger-log';
import { stashNotify, buildReturnUrl } from '@/lib/notify';
import { checkLaunchRateLimit, releaseDispatch, reserveDispatch } from '@/lib/customSimRateLimit';
import { buildCustomSimulationScenarioKey } from '@/utils/customSimulationScenario';
import { normalizeCustomSimulationParameters, parseCustomSimulationAction } from '@/utils/customSimulationInput';
import { buildCustomSimulationRequestId, buildCustomSimulationRunTitle } from '@/utils/customSimulationRequest';

const GITHUB_API = 'https://api.github.com';
const GITHUB_REPO = 'ncsizemore/jheem-backend';
const WORKFLOW_FILE = 'run-custom-sim.yml';
const MAX_BODY_BYTES = 4096;
const LOCATION_FORMAT = /^[A-Z]{2}$|^C\.\d+$/;
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 254;

const BACKEND_MODEL_ID_MAP: Record<string, string> = {
  'ryan-white': 'ryan-white-msa',
};

interface WorkflowRun {
  id: number;
  display_title: string;
  status: string;
}

async function readLimitedJson(request: NextRequest): Promise<
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; response: NextResponse }
> {
  const mediaType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (mediaType !== 'application/json') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 }),
    };
  }

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return { ok: false, response: NextResponse.json({ error: 'Request body is too large' }, { status: 413 }) };
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return { ok: false, response: NextResponse.json({ error: 'Request body is required' }, { status: 400 }) };
  }

  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > MAX_BODY_BYTES) {
      await reader.cancel();
      return { ok: false, response: NextResponse.json({ error: 'Request body is too large' }, { status: 413 }) };
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();

  try {
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return { ok: false, response: NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 }) };
    }
    return { ok: true, body: body as Record<string, unknown> };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Malformed JSON request body' }, { status: 400 }) };
  }
}

async function findActiveRun(expectedTitles: ReadonlySet<string>, githubToken: string): Promise<WorkflowRun | null> {
  const response = await fetch(
    `${GITHUB_API}/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=100&event=workflow_dispatch`,
    {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
      },
    },
  );
  if (!response.ok) throw new Error(`GitHub run lookup failed: ${response.status}`);
  const data = await response.json();
  return data.workflow_runs?.find(
    (run: WorkflowRun) =>
      expectedTitles.has(run.display_title) &&
      (run.status === 'in_progress' || run.status === 'queued'),
  ) ?? null;
}

export async function POST(request: NextRequest) {
  const parsed = await readLimitedJson(request);
  if (!parsed.ok) return parsed.response;

  const body = parsed.body;
  const action = parseCustomSimulationAction(body.action);
  const modelId = body.modelId;
  const location = body.location;
  const email = body.email;

  // Persist only an allowlisted, PII-minimized request summary.
  logTrigger(buildEntry(request, 'trigger', {
    body: {
      action: action ?? 'invalid',
      modelId: typeof modelId === 'string' ? modelId : '',
      location: typeof location === 'string' ? location : '',
      parameterKeys: body.parameters && typeof body.parameters === 'object' && !Array.isArray(body.parameters)
        ? Object.keys(body.parameters).slice(0, 20)
        : [],
      emailProvided: typeof email === 'string' && email.length > 0,
    },
  }));

  try {
    if (!action) {
      return NextResponse.json({ error: 'action must be lookup or launch' }, { status: 400 });
    }
    if (typeof modelId !== 'string' || typeof location !== 'string' || body.parameters === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: modelId, location, parameters' },
        { status: 400 },
      );
    }

    const config = getModelConfig(modelId);
    if (!config) return NextResponse.json({ error: `Unknown model: ${modelId}` }, { status: 400 });
    if (!config.customSimulation) {
      return NextResponse.json({ error: `Model ${modelId} does not support custom simulations` }, { status: 400 });
    }
    if (!LOCATION_FORMAT.test(location) || !config.locations.includes(location)) {
      return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
    }

    if (email !== undefined && email !== null && email !== '') {
      if (typeof email !== 'string' || email.length > EMAIL_MAX_LENGTH || !EMAIL_FORMAT.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
      if (action !== 'launch') {
        return NextResponse.json({ error: 'Email notification requires an explicit launch' }, { status: 400 });
      }
    }

    const normalized = normalizeCustomSimulationParameters(config.customSimulation, body.parameters);
    if (!normalized.ok) return NextResponse.json({ error: normalized.error }, { status: 400 });

    const parameters = normalized.parameters;
    const scenarioKey = buildCustomSimulationScenarioKey(config.customSimulation, parameters);
    const backendModelId = BACKEND_MODEL_ID_MAP[modelId] || modelId;
    const requestId = buildCustomSimulationRequestId(backendModelId, location, scenarioKey);
    const expectedTitle = buildCustomSimulationRunTitle(requestId);
    const serializedParameters = JSON.stringify(parameters);
    const compatibleTitles = new Set([
      expectedTitle,
      `custom-sim: legacy:${backendModelId}:${location}:${serializedParameters}`,
      `custom-sim: ${backendModelId} ${location} ${serializedParameters}`,
    ]);
    const dataUrl = `${config.dataUrl}/custom/${location}/${scenarioKey}.json`;

    let cacheCheck: Response;
    try {
      cacheCheck = await fetch(dataUrl, { method: 'HEAD', cache: 'no-store' });
    } catch {
      return NextResponse.json({ error: 'Result cache is temporarily unavailable' }, { status: 503 });
    }
    if (cacheCheck.ok) {
      return NextResponse.json({ status: 'cached', scenarioKey, requestId, dataUrl });
    }
    if (cacheCheck.status >= 500) {
      return NextResponse.json({ error: 'Result cache is temporarily unavailable' }, { status: 503 });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json({ error: 'Server configuration error: missing GitHub token' }, { status: 500 });
    }

    let matchingRun: WorkflowRun | null;
    try {
      matchingRun = await findActiveRun(compatibleTitles, githubToken);
    } catch (error) {
      console.error('GitHub run lookup failed:', error);
      return NextResponse.json({ error: 'Simulation service is temporarily unavailable' }, { status: 503 });
    }

    if (matchingRun) {
      if (action === 'launch' && typeof email === 'string' && email) {
        const limit = await checkLaunchRateLimit(request);
        if (!limit.allowed) {
          const unavailable = limit.reason === 'unavailable';
          return NextResponse.json(
            { error: unavailable ? 'Simulation launch protection is temporarily unavailable' : 'Simulation launch limit reached; please try again later' },
            { status: unavailable ? 503 : 429, headers: { 'Retry-After': String(limit.retryAfter) } },
          );
        }
        stashNotify(backendModelId, location, scenarioKey, {
          email,
          url: buildReturnUrl(backendModelId, location, parameters, config),
        });
      }
      return NextResponse.json({
        status: 'running',
        scenarioKey,
        requestId,
        dataUrl,
        runId: matchingRun.id,
      });
    }

    // A lookup is side-effect free. In particular, opening or crawling a shared
    // URL cannot launch compute on a cache miss.
    if (action === 'lookup') {
      return NextResponse.json({ status: 'not_found', scenarioKey, requestId, dataUrl });
    }

    const limit = await checkLaunchRateLimit(request);
    if (!limit.allowed) {
      const unavailable = limit.reason === 'unavailable';
      return NextResponse.json(
        { error: unavailable ? 'Simulation launch protection is temporarily unavailable' : 'Simulation launch limit reached; please try again later' },
        { status: unavailable ? 503 : 429, headers: { 'Retry-After': String(limit.retryAfter) } },
      );
    }

    const reservation = await reserveDispatch(requestId);
    if (reservation === 'unavailable') {
      return NextResponse.json({ error: 'Simulation launch protection is temporarily unavailable' }, { status: 503 });
    }
    if (reservation === 'existing') {
      return NextResponse.json({ status: 'running', scenarioKey, requestId, dataUrl });
    }

    let dispatchResponse: Response;
    try {
      dispatchResponse = await fetch(
        `${GITHUB_API}/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ref: 'master',
            inputs: {
              model_id: backendModelId,
              location,
              parameters: serializedParameters,
              request_id: requestId,
            },
          }),
        },
      );
    } catch (error) {
      await releaseDispatch(requestId);
      console.error('GitHub dispatch request failed:', error);
      return NextResponse.json({ error: 'Failed to trigger simulation' }, { status: 502 });
    }

    if (!dispatchResponse.ok) {
      await releaseDispatch(requestId);
      const errorText = await dispatchResponse.text();
      console.error('GitHub dispatch failed:', dispatchResponse.status, errorText);
      return NextResponse.json({ error: 'Failed to trigger simulation' }, { status: 502 });
    }

    if (typeof email === 'string' && email) {
      stashNotify(backendModelId, location, scenarioKey, {
        email,
        url: buildReturnUrl(backendModelId, location, parameters, config),
      });
    }

    return NextResponse.json({ status: 'triggered', scenarioKey, requestId, dataUrl });
  } catch (error) {
    console.error('Custom sim API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
