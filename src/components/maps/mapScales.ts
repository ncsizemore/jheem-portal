// Display encodings only. Preserve the existing suppression thresholds and
// logarithmic marker diameters; these do not alter any scientific estimate.
export const SUPPRESSION_BANDS = [
  { min: -Infinity, color: '#bad3d1', label: '<64', description: 'Below 64%' },
  {
    min: 64,
    color: '#94bbb9',
    label: '64–<67',
    description: '64% to below 67%',
  },
  {
    min: 67,
    color: '#6b9fa4',
    label: '67–<72',
    description: '67% to below 72%',
  },
  {
    min: 72,
    color: '#477f8f',
    label: '72–<77',
    description: '72% to below 77%',
  },
  {
    min: 77,
    color: '#2c6078',
    label: '77–<82',
    description: '77% to below 82%',
  },
  { min: 82, color: '#163e59', label: '≥82', description: '82% or higher' },
];

export function getSuppressionColor(rate: number) {
  return SUPPRESSION_BANDS.findLast((band) => rate >= band.min)!.color;
}

export function getMarkerSize(prevalence: number): number {
  const normalized = Math.max(
    0,
    Math.min(
      1,
      (Math.log(prevalence) - Math.log(5000)) /
        (Math.log(50000) - Math.log(5000)),
    ),
  );
  return 14 + normalized * 14;
}

export const IMPACT_COLORS = [
  '#f1ddc3',
  '#e9c49d',
  '#dca877',
  '#c88a57',
  '#b36a3e',
  '#96502f',
  '#763a28',
  '#55291f',
];
export function getImpactColor(
  value: number,
  min: number,
  max: number,
): string {
  if (max === min) return IMPACT_COLORS[Math.floor(IMPACT_COLORS.length / 2)];
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return IMPACT_COLORS[
    Math.min(
      IMPACT_COLORS.length - 1,
      Math.floor(normalized * IMPACT_COLORS.length),
    )
  ];
}
