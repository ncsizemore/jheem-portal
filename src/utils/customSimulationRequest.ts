import type { CustomSimulationConfig } from '@/config/model-configs';

export const CUSTOM_SIMULATION_RUN_CONTRACT_VERSION = 'v1';

export function buildCustomSimulationRequestId(
  backendModelId: string,
  location: string,
  scenarioKey: string,
): string {
  return `${CUSTOM_SIMULATION_RUN_CONTRACT_VERSION}:${backendModelId}:${location}:${scenarioKey}`;
}

export function buildCustomSimulationRunTitle(requestId: string): string {
  return `custom-sim: ${requestId}`;
}

export function isCanonicalCustomSimulationScenarioKey(
  config: CustomSimulationConfig,
  scenarioKey: string,
): boolean {
  const prefix = config.cacheKeyPrefix ? `${config.cacheKeyPrefix}-` : '';
  if (!scenarioKey.startsWith(prefix)) return false;

  const parts = scenarioKey.slice(prefix.length).split('-');
  if (parts.length !== config.parameters.length) return false;

  return config.parameters.every((parameter, index) => {
    const part = parts[index];
    if (!part.startsWith(parameter.keyPrefix)) return false;
    const rawValue = part.slice(parameter.keyPrefix.length);
    if (!/^(0|[1-9]\d{0,2})$/.test(rawValue)) return false;
    const value = Number(rawValue);
    return value >= 0 && value <= 100;
  });
}
