import type { PlotDataFile } from '@/types/native-plotting';

export const DIMENSIONS = ['age', 'race', 'sex', 'risk'] as const;
export type Dimension = (typeof DIMENSIONS)[number];
export const DIMENSION_LABELS: Record<Dimension, string> = {
  age: 'Age',
  race: 'Race / ethnicity',
  sex: 'Sex / population group',
  risk: 'Injection drug use',
};

export function canonicalFacet(key: string): string {
  const parts = key.split('+');
  return DIMENSIONS.filter((dim) => parts.includes(dim)).join('+') || 'none';
}

export function facetLabel(key: string): string {
  return key === 'none'
    ? 'Whole population'
    : canonicalFacet(key)
        .split('+')
        .map((dim) => DIMENSION_LABELS[dim as Dimension])
        .join(' + ');
}

// A file name is not sufficient evidence of its dimensions. Some legacy files
// requested several dimensions but contain only age (or an aggregate baseline).
export function getFacetChoices(plots: Record<string, PlotDataFile> = {}) {
  const choices = new Map<string, { key: string; label: string }>();
  for (const [key, plot] of Object.entries(plots)) {
    if (
      key !== 'none' &&
      key.split('+').some((dim) => !DIMENSIONS.includes(dim as Dimension))
    )
      continue;
    const canonical = canonicalFacet(key);
    const count = canonical === 'none' ? 0 : canonical.split('+').length;
    if (
      !plot.sim?.length ||
      !plot.sim.every((point) =>
        Array.from(
          { length: count },
          (_, i) => point[`facet.by${i + 1}` as 'facet.by1'],
        ).every(Boolean),
      )
    )
      continue;
    if (!choices.has(canonical))
      choices.set(canonical, { key, label: facetLabel(key) });
  }
  return [...choices.values()].sort((a, b) => {
    if (a.key === 'none') return -1;
    if (b.key === 'none') return 1;
    return (
      a.key.split('+').length - b.key.split('+').length ||
      a.label.localeCompare(b.label)
    );
  });
}

export function resolveFacet(
  requested: string,
  choices: { key: string }[],
): string {
  return (
    choices.find(
      (choice) => canonicalFacet(choice.key) === canonicalFacet(requested),
    )?.key ??
    choices.find((choice) => choice.key === 'none')?.key ??
    choices[0]?.key ??
    ''
  );
}
