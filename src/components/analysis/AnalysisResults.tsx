'use client';
import { useState, useRef, useId, useMemo } from 'react';
import type { ScenarioConfig } from '@/config/model-configs';
import type {
  PlotDataFile,
  FacetPanel,
  ChartDisplayOptions,
} from '@/types/native-plotting';
import type {
  FacetDimension,
  FacetDimensionState,
} from '@/hooks/useAnalysisState';
import NativeSimulationChart from '@/components/NativeSimulationChart';
import ChartLegend from './ChartLegend';
import ResultsTable, { ObservationsTable } from './ResultsTable';
import DisplayOptionsPopover from './DisplayOptionsPopover';
import { exportToCsv } from '@/utils/exportCsv';
import { exportToPng } from '@/utils/exportPng';
import type { AnalysisExportContext } from '@/utils/analysisExport';
import {
  getOutcomeDefinition,
  OUTCOME_DEFINITIONS,
  SUMMARY_LABELS,
  summaryDescription,
} from '@/utils/outcomeDefinitions';
import { getValueRange } from '@/utils/transformPlotData';
import { facetLabel } from '@/utils/analysisFacets';
import { describeScenarioTimeline } from '@/utils/modelTimeline';

export interface AnalysisResultsProps {
  loading?: boolean;
  loadError?: string;
  onRetry?: () => void;
  // Data
  chartPanels: FacetPanel[];
  plotData: PlotDataFile | null;

  // Selections
  selectedOutcome: string;
  selectedStatistic: string;
  selectedFacet: string;
  facetDimensions: FacetDimensionState;
  availableFacetDimensions: FacetDimensionState;

  // Available options for dropdowns
  availableOutcomes: string[];
  availableStatistics: string[];

  // Callbacks
  setSelectedOutcome: (outcome: string) => void;
  setSelectedStatistic: (statistic: string) => void;
  toggleFacetDimension: (dim: FacetDimension) => void;

  facetChoices?: { key: string; label: string }[];
  setSelectedFacet?: (key: string) => void;
  selectionNotice?: string;
  modelName?: string;
  modelId?: string;
  timeline?: ScenarioConfig['timeline'];
  scenarioDescription?: string;
  // Display context
  interventionStartYear?: number;
  locationName?: string;
  scenarioLabel?: string;

  /** Map outcome keys to display names (for the dropdown) */
  getOutcomeDisplayName?: (outcome: string) => string;
}

export default function AnalysisResults({
  loading = false,
  loadError,
  onRetry,
  chartPanels,
  plotData,
  selectedOutcome,
  selectedStatistic,
  selectedFacet,
  facetDimensions,
  availableFacetDimensions,
  availableOutcomes,
  availableStatistics,
  setSelectedOutcome,
  setSelectedStatistic,
  toggleFacetDimension,
  interventionStartYear,
  locationName = '',
  scenarioLabel = 'Scenario',
  getOutcomeDisplayName,
  facetChoices,
  setSelectedFacet,
  selectionNotice,
  modelName = 'JHEEM',
  timeline,
  scenarioDescription = '',
}: AnalysisResultsProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [separateScales, setSeparateScales] = useState(false);
  const [options, setOptions] = useState<ChartDisplayOptions>({
    showConfidenceInterval: true,
    showBaseline: true,
    showObservations: true,
  });
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [pagination, setPagination] = useState({ selection: '', page: 0 });
  const figureRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const definition = getOutcomeDefinition(
    selectedOutcome,
    plotData?.metadata.outcome_metadata?.display_name,
  );
  const units =
    plotData?.metadata.y_label ||
    plotData?.metadata.outcome_metadata?.units ||
    '';
  const statistic = plotData?.metadata.statistic || selectedStatistic;
  const individual = statistic === 'individual.simulation';
  const intervals = chartPanels.some((p) =>
    p.data.some((d) => d.lower != null || d.baselineLower != null),
  );
  const observations = chartPanels.some((p) => p.observations.length > 0);
  const baseline = chartPanels.some(
    (p) =>
      p.data.some((d) => d.baselineValue != null) ||
      p.individualSimulations?.some((line) => line.simset === 'Baseline'),
  );
  const faceted = chartPanels.length > 1;
  const selection = `${locationName}/${scenarioLabel}/${selectedOutcome}/${statistic}/${selectedFacet}`;
  const page =
    pagination.selection === selection
      ? Math.min(
          pagination.page,
          Math.max(0, Math.ceil(chartPanels.length / 6) - 1),
        )
      : 0;
  const visiblePanels = chartPanels.slice(page * 6, (page + 1) * 6);
  const summary = summaryDescription(
    statistic,
    intervals && options.showConfidenceInterval,
  );
  const timelineText = timeline
    ? describeScenarioTimeline({
        id: '',
        label: scenarioLabel,
        description: scenarioDescription,
        timeline,
      }) || ''
    : scenarioDescription;
  const sharedDomain = useMemo<[number, number] | undefined>(() => {
    if (!faceted || separateScales) return undefined;
    const ranges = chartPanels.map((p) =>
      getValueRange(
        p.data,
        options.showObservations ? p.observations : [],
        options.showBaseline,
        options.showConfidenceInterval,
        p.individualSimulations,
        plotData?.metadata.outcome_metadata?.display_as_percent,
      ),
    );
    return [0, Math.max(...ranges.map((range) => range[1]))];
  }, [chartPanels, faceted, separateScales, options, plotData]);
  const groups = [
    'HIV outcomes',
    'Prevention and testing',
    'Ryan White services',
    'Other outcomes',
  ].filter((group) =>
    availableOutcomes.some((key) => getOutcomeDefinition(key).group === group),
  );
  const orderedOutcomes = [
    ...new Set([
      ...Object.keys(OUTCOME_DEFINITIONS).filter((key) =>
        availableOutcomes.includes(key),
      ),
      ...availableOutcomes,
    ]),
  ];
  const exportContext = (csv = false): AnalysisExportContext => ({
    title: definition.label,
    definition: [definition.description, definition.note]
      .filter(Boolean)
      .join(' '),
    units,
    location: locationName,
    scenario: scenarioLabel,
    summary: csv ? SUMMARY_LABELS[statistic] || statistic : summary,
    model: modelName,
    generated: plotData?.metadata.generation_time || '',
    timeline: timelineText,
    url: window.location.href,
    scope: csv
      ? 'All population groups, model series, intervals, and available observations.'
      : `${faceted ? `Population groups ${page * 6 + 1}–${Math.min((page + 1) * 6, chartPanels.length)} of ${chartPanels.length}. ${separateScales ? 'Separate vertical scales.' : 'Shared vertical scale.'}` : 'Whole population.'} ${!observations ? 'No observed data in this selection.' : options.showObservations ? 'Observed data shown.' : 'Observed data hidden.'}`,
  });
  const exportArgs = {
    locationName,
    scenario: scenarioLabel,
    outcome: selectedOutcome,
    statistic,
    facet: selectedFacet,
  };
  async function downloadPng() {
    setExporting(true);
    setMessage('');
    try {
      await exportToPng({
        ...exportArgs,
        containerRef: figureRef,
        context: exportContext(),
        legend: `Solid blue: ${scenarioLabel}.${options.showBaseline && baseline ? ' Dashed gray: baseline.' : ''}${options.showObservations && observations ? ' Rust dots: observed data.' : ''}`,
      });
      setMessage('Figure downloaded.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create the figure. Please retry.',
      );
    } finally {
      setExporting(false);
    }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage('Link copied to this analysis.');
    } catch {
      setMessage('Copy the address from your browser to share this analysis.');
    }
  }
  const control =
    'w-full rounded border border-rule bg-white px-3 py-2.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopkins-blue';
  const action =
    'rounded px-2 py-2 text-sm sm:px-3 text-muted hover:bg-paper hover:text-ink disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-hopkins-blue';
  return (
    <div className="results-workspace mx-auto w-full max-w-6xl flex-none px-4 py-4 text-ink sm:px-8 sm:py-8">
      <div className="grid gap-3 lg:gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="order-2 lg:order-1">
          <p className="mb-2 hidden lg:block text-xs font-medium uppercase tracking-widest text-muted">
            Model results
          </p>
          <h2 className="sr-only lg:not-sr-only text-2xl font-semibold tracking-tight sm:text-3xl">
            {definition.label}
          </h2>
          <p
            id={`${id}-definition`}
            className="mt-0 max-w-2xl text-sm lg:mt-3 leading-6 text-muted"
          >
            {definition.description}
          </p>
        </div>
        <div className="order-1 lg:order-2">
          <label
            htmlFor={`${id}-outcome`}
            className="mb-1.5 block text-xs font-medium text-muted"
          >
            Outcome
          </label>
          <select
            id={`${id}-outcome`}
            value={selectedOutcome}
            onChange={(e) => setSelectedOutcome(e.target.value)}
            className={control}
            aria-describedby={`${id}-definition`}
          >
            {groups.map((group) => (
              <optgroup label={group} key={group}>
                {orderedOutcomes
                  .filter((key) => getOutcomeDefinition(key).group === group)
                  .map((key) => (
                    <option value={key} key={key}>
                      {
                        getOutcomeDefinition(key, getOutcomeDisplayName?.(key))
                          .label
                      }
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
      <details className="mt-5 border-y border-rule py-3">
        <summary className="cursor-pointer text-sm font-medium">
          Adjust analysis{' '}
          <span className="sr-only ml-2 font-normal text-muted sm:not-sr-only">
            {SUMMARY_LABELS[statistic] || statistic} ·{' '}
            {facetLabel(selectedFacet || 'none')}
          </span>
        </summary>
        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-muted">
            Summarize simulations
            <select
              aria-label="Summarize simulations"
              value={selectedStatistic}
              onChange={(e) => setSelectedStatistic(e.target.value)}
              className={`${control} mt-1.5`}
            >
              {availableStatistics.map((s) => (
                <option key={s} value={s}>
                  {SUMMARY_LABELS[s] || s}
                </option>
              ))}
            </select>
          </label>
          {facetChoices && setSelectedFacet ? (
            <label className="text-xs font-medium text-muted">
              Population breakdown
              <select
                aria-label="Population breakdown"
                value={selectedFacet}
                onChange={(e) => setSelectedFacet(e.target.value)}
                className={`${control} mt-1.5`}
              >
                {facetChoices.map((choice) => (
                  <option key={choice.key} value={choice.key}>
                    {choice.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div
              role="group"
              aria-label="Break down by"
              className="flex flex-wrap gap-2"
            >
              {(['age', 'race', 'sex', 'risk'] as const).map((dim) => (
                <button
                  key={dim}
                  aria-pressed={facetDimensions[dim]}
                  disabled={!availableFacetDimensions[dim]}
                  onClick={() => toggleFacetDimension(dim)}
                  className={action}
                >
                  {dim}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="pb-2 text-xs leading-5 text-muted">
          Available breakdowns depend on the outcome. Population groups follow
          the model’s categories; “MSM” means men who have sex with men.
        </p>
      </details>
      {selectionNotice && (
        <p role="status" className="mt-3 text-sm text-muted">
          {selectionNotice}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-1 sm:gap-2">
        <div
          role="group"
          aria-label="Result view"
          className="flex rounded border border-rule p-0.5"
        >
          {(['chart', 'table'] as const).map((mode) => (
            <button
              key={mode}
              aria-pressed={view === mode}
              onClick={() => setView(mode)}
              className={`${action} ${view === mode ? 'bg-ink !text-white' : ''}`}
            >
              {mode === 'chart' ? 'Chart' : 'Table'}
            </button>
          ))}
        </div>
        <button
          className={action}
          disabled={!chartPanels.length}
          onClick={() => {
            exportToCsv({
              ...exportArgs,
              panels: chartPanels,
              context: exportContext(true),
            });
            setMessage(
              'CSV downloaded with all groups and available observations.',
            );
          }}
        >
          CSV
        </button>
        <button
          className={action}
          disabled={!chartPanels.length || view !== 'chart' || exporting}
          onClick={downloadPng}
        >
          {exporting ? 'Creating figure…' : 'PNG'}
        </button>
        <button className={`${action} hidden sm:block`} onClick={copyLink}>
          Copy link
        </button>
        {view === 'chart' && (
          <DisplayOptionsPopover
            options={options}
            showIntervalControl={!individual && intervals}
            showBaselineControl={baseline}
            showObservationsControl={observations}
            onChange={setOptions}
          />
        )}
      </div>
      <p role="status" aria-live="polite" className="mt-2 text-sm text-muted">
        {message}
      </p>
      <div
        data-testid="analysis-chart-region"
        role="region"
        aria-label={`${definition.label} results`}
        aria-busy={loading}
        aria-describedby={`${id}-definition`}
        className="mt-4"
      >
        {loading ? (
          <p role="status" className="py-12 text-muted">
            Loading selected result…
          </p>
        ) : loadError ? (
          <div role="alert" className="py-12 text-muted">
            <p>{loadError}</p>
            <button
              className={`${action} mt-3 border border-rule`}
              onClick={onRetry}
            >
              Retry loading result
            </button>
          </div>
        ) : !chartPanels.length ? (
          <p role="status" className="py-12 text-muted">
            No results are available for this selection.
          </p>
        ) : view === 'table' ? (
          <ResultsTable
            panels={chartPanels}
            title={definition.label}
            scenario={scenarioLabel}
            units={units}
            selection={selection}
          />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <ChartLegend
                scenarioLabel={scenarioLabel}
                baseline={options.showBaseline && baseline}
                observations={options.showObservations && observations}
              />
              {faceted && (
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={separateScales}
                    onChange={(e) => setSeparateScales(e.target.checked)}
                  />
                  Separate scales
                </label>
              )}
            </div>
            {faceted && (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
                <span>
                  {page * 6 + 1}–{Math.min((page + 1) * 6, chartPanels.length)}{' '}
                  of {chartPanels.length} groups ·{' '}
                  {separateScales
                    ? 'Each panel has its own vertical scale'
                    : 'All panels share a vertical scale'}
                </span>
                {chartPanels.length > 6 && (
                  <div className="flex gap-3">
                    <button
                      disabled={page === 0}
                      className={action}
                      onClick={() =>
                        setPagination({ selection, page: page - 1 })
                      }
                    >
                      Previous groups
                    </button>
                    <button
                      disabled={(page + 1) * 6 >= chartPanels.length}
                      className={action}
                      onClick={() =>
                        setPagination({ selection, page: page + 1 })
                      }
                    >
                      Next groups
                    </button>
                  </div>
                )}
              </div>
            )}
            <div
              ref={figureRef}
              className={faceted ? 'grid gap-x-8 gap-y-6 lg:grid-cols-2' : ''}
            >
              {visiblePanels.map((panel) => (
                <div
                  key={`${selection}/${panel.facetValue}`}
                  data-export-panel={panel.facetLabel}
                  className={
                    faceted ? 'min-w-0 border-t border-rule pt-4' : 'min-w-0'
                  }
                >
                  <NativeSimulationChart
                    panel={panel}
                    outcomeLabel={definition.label}
                    description={undefined}
                    units={units}
                    displayAsPercent={
                      plotData?.metadata.outcome_metadata?.display_as_percent ||
                      false
                    }
                    options={options}
                    height={faceted ? 300 : 380}
                    interventionStartYear={interventionStartYear}
                    timeline={timeline}
                    locationName={locationName}
                    scenarioLabel={scenarioLabel}
                    compact={faceted}
                    showLegend={false}
                    sharedDomain={sharedDomain}
                  />
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">{summary}</p>
            {faceted && (
              <p className="mt-1 text-xs text-muted">
                PNG includes the groups currently shown. CSV includes every
                group.
              </p>
            )}
          </>
        )}
      </div>
      <div className="mt-5 border-t border-rule pt-4 text-sm leading-6 text-muted">
        {timelineText && (
          <p>{timelineText} Values are annual model summaries.</p>
        )}
        <button className={`${action} -ml-3 sm:hidden`} onClick={copyLink}>
          Copy link to this analysis
        </button>
        <details className="mt-3">
          <summary className="cursor-pointer font-medium text-ink">
            About this result
          </summary>
          <div className="mt-3 space-y-2">
            {definition.note && <p>{definition.note}</p>}
            <p>
              Baseline is the model’s comparison scenario without the selected
              interruption or intervention. The bands describe variation across
              simulations, not the probability of a particular policy outcome.
            </p>
            <p>
              {modelName} · Results generated:{' '}
              {plotData?.metadata.generation_time
                ? new Date(
                    plotData.metadata.generation_time,
                  ).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'UTC',
                  })
                : loading
                  ? 'loading…'
                  : 'unavailable'}
              .
            </p>
            <p>
              CSV includes model values, available uncertainty bounds, and
              observed data with sources. Display settings affect the chart and
              PNG only.
            </p>
          </div>
        </details>
      </div>
      {plotData && (
        <ObservationsTable key={selection} panels={chartPanels} units={units} />
      )}
    </div>
  );
}
