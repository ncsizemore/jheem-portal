import type { CustomSimulationConfig } from '@/config/model-configs';

export function buildCustomSimulationScenarioKey(
  customSimulation: CustomSimulationConfig,
  parameters: Record<string, number>,
): string {
  const parameterKey = customSimulation.parameters
    .map((parameter) => `${parameter.keyPrefix}${parameters[parameter.id] ?? parameter.default}`)
    .join('-');

  return customSimulation.cacheKeyPrefix
    ? `${customSimulation.cacheKeyPrefix}-${parameterKey}`
    : parameterKey;
}
