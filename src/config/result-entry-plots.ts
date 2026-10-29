import entries from './result-entry-plots.json';
import type {
  ResultPlotRef,
  ResultReleaseBinding,
  ResultSelection,
} from '@/types/result-data';

export interface ResultEntryPlot {
  manifest: string;
  selection: ResultSelection;
  plot: ResultPlotRef;
}
const entryPlots: Record<string, Record<string, ResultEntryPlot>> = entries;

/** Only the exact requested default of this pinned release may load early. */
export function getResultEntryPlot(
  binding: ResultReleaseBinding | undefined,
  model: string,
  location: string,
  selection: ResultSelection,
): ResultPlotRef | undefined {
  const entry = entryPlots[model]?.[location];
  if (!entry || binding?.locations[location]?.sha256 !== entry.manifest) return;
  if (
    (Object.keys(entry.selection) as (keyof ResultSelection)[]).every(
      (key) => selection[key] === entry.selection[key],
    )
  )
    return entry.plot;
}
