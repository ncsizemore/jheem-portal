export interface CustomSimulationProgress {
  phase: string;
  message?: string;
  percent?: number;
  simsComplete?: number;
  simsTotal?: number;
  filesComplete?: number;
  filesTotal?: number;
}

/**
 * Keep progress monotonic inside one workflow phase, but allow a later phase
 * to restart at zero with different units (for example simulations → files).
 */
export function selectCustomSimulationProgress(
  previous: CustomSimulationProgress | null,
  next: CustomSimulationProgress | null,
  previousPhase: string | null,
  nextPhase: string | null,
): CustomSimulationProgress | null {
  if (!next) return previousPhase === nextPhase ? previous : null;
  if (!previous || previous.phase !== next.phase) return next;

  const previousPercent = previous.percent;
  const nextPercent = next.percent;
  if (previousPercent == null || nextPercent == null || nextPercent >= previousPercent) {
    return next;
  }
  return previous;
}
