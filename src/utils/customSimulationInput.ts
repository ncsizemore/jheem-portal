import type { CustomSimulationConfig } from '@/config/model-configs';

export type CustomSimulationAction = 'lookup' | 'launch';

export const CUSTOM_SIMULATION_PARAMETER_MIN = 0;
export const CUSTOM_SIMULATION_PARAMETER_MAX = 100;
export const CUSTOM_SIMULATION_PARAMETER_STEP = 1;

export function normalizeCustomSimulationParameterValue(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(Math.min(
    CUSTOM_SIMULATION_PARAMETER_MAX,
    Math.max(CUSTOM_SIMULATION_PARAMETER_MIN, value),
  ));
}

export function parseCustomSimulationAction(value: unknown): CustomSimulationAction | null {
  // Safe compatibility default: stale clients may omit action, but an omitted
  // action must never launch compute merely by opening a shared URL.
  if (value === undefined) return 'lookup';
  return value === 'lookup' || value === 'launch' ? value : null;
}

export function normalizeCustomSimulationParameters(
  config: CustomSimulationConfig,
  value: unknown,
): { ok: true; parameters: Record<string, number> } | { ok: false; error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'parameters must be a JSON object' };
  }

  const supplied = value as Record<string, unknown>;
  const allowed = new Set(config.parameters.map((parameter) => parameter.id));
  const unknown = Object.keys(supplied).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    return { ok: false, error: `Unknown simulation parameter: ${unknown[0]}` };
  }

  const parameters: Record<string, number> = {};
  for (const definition of config.parameters) {
    const raw = supplied[definition.id];
    if (raw === undefined || raw === null) {
      parameters[definition.id] = definition.default;
      continue;
    }
    if (typeof raw !== 'number' || !Number.isFinite(raw) || !Number.isInteger(raw)) {
      return { ok: false, error: `${definition.id} must be a whole number from 0 to 100` };
    }
    if (raw < CUSTOM_SIMULATION_PARAMETER_MIN || raw > CUSTOM_SIMULATION_PARAMETER_MAX) {
      return {
        ok: false,
        error: `${definition.id} must be between ${CUSTOM_SIMULATION_PARAMETER_MIN} and ${CUSTOM_SIMULATION_PARAMETER_MAX}`,
      };
    }
    parameters[definition.id] = raw;
  }

  return { ok: true, parameters };
}
