import type { ScenarioConfig } from '@/config/model-configs';

export function formatModelTime(value: number): string {
  const year = Math.floor(value);
  const monthIndex = Math.round((value - year) * 12);
  const date = new Date(Date.UTC(year, monthIndex, 1));
  const month = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    timeZone: 'UTC',
  }).format(date);

  return `${month} ${date.getUTCFullYear()}`;
}

export function formatLagYears(value: number): string {
  const months = Math.round(value * 12);
  return months === 1 ? '1 month' : `${months} months`;
}

export function describeScenarioTimeline(scenario: ScenarioConfig): string | null {
  const timeline = scenario.timeline;
  if (!timeline) return null;

  const parts = [
    `Services stop in ${formatModelTime(timeline.serviceInterruptionStartTime)}.`,
    `Modeled suppression changes begin in ${formatModelTime(timeline.suppressionEffectStartTime)}.`,
  ];

  if (timeline.serviceResumeTime == null) {
    parts.push('Services do not resume in this scenario.');
  } else {
    parts.push(`Services resume in ${formatModelTime(timeline.serviceResumeTime)}.`);
    if (timeline.suppressionRecoveryEndTime != null) {
      parts.push(
        `The modeled suppression effect phases out by ${formatModelTime(timeline.suppressionRecoveryEndTime)}.`
      );
    }
  }

  return parts.join(' ');
}
