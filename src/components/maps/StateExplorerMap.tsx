'use client';

/**
 * State-level choropleth map component
 *
 * Displays Ryan White state-level analysis data on an interactive map.
 * Accepts a ModelConfig to support different analyses (AJPH, CROI, etc.)
 * Data fetched from CloudFront based on config.dataUrl.
 */

import { updateAnalysisQuery } from '@/hooks/useAnalysisQuery';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { GeographicMapProps } from './GeographicMap';
import { useMapPreviewPosition } from './useMapPreviewPosition';
import ExplorerMapPanel from './ExplorerMapPanel';
import { IMPACT_COLORS, getImpactColor } from './mapScales';
const GeographicMap = dynamic(() => import('./GeographicMap'), {
  ssr: false,
});
import {
  useStateSummaries,
  type StateSummary,
  getStatusMetrics,
  getStatusYear,
} from '@/hooks/useStateSummaries';
import type { ModelConfig } from '@/config/model-configs';
import { STATE_CODE_TO_NAME, STATE_NAME_TO_CODE } from '@/data/states';

interface StateChoroplethExplorerProps {
  config: ModelConfig;
}

// Construct model-specific headline for impact metric
// Handles both old format (full headline) and new format (just period)
// TODO: Simplify once all workflows regenerate data with new format
function getImpactHeadline(modelId: string, headlineOrPeriod: string): string {
  // Extract period from either format
  // Old: "Relative increase in new HIV infections if funding stops, 2025-2030"
  // New: "2025-2030"
  const periodMatch = headlineOrPeriod.match(/\d{4}-\d{4}/);
  const period = periodMatch ? periodMatch[0] : headlineOrPeriod;

  const context =
    modelId === 'cdc-testing' ? 'if testing stops' : 'if funding stops';
  return `Relative increase in new HIV infections ${context}, ${period}`;
}

export default function StateExplorerMap({
  config,
}: StateChoroplethExplorerProps) {
  const calibrationModel =
    config.id === 'ryan-white-state-croi' ? 'croi' : 'ajph';
  const { summaries, loading, error } = useStateSummaries(config.dataUrl);

  const [hoveredStateData, setHoveredStateData] = useState<StateSummary | null>(
    null,
  );
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const previewPlacement = useMapPreviewPosition(hoverPosition, 260);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Navigation depends on study coverage, not the summary request.
  const availableStates = useMemo(
    () =>
      config.locations
        .map((code) => ({
          code,
          name: STATE_CODE_TO_NAME[code] || code,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [config.locations],
  );

  // Compute impact range for dynamic color scaling
  const impactRange = useMemo(() => {
    if (!summaries?.states) return { min: 0, max: 100 };
    const values = Object.values(summaries.states)
      .map((s) => s.impact.cessationIncreasePercent)
      .filter(Number.isFinite);
    if (!values.length) return { min: 0, max: 0 };
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [summaries]);

  // Hover timeout management (allows moving from map to hover card)
  const startHideTimeout = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredStateData(null);
      setHoverPosition(null);
    }, 200);
  }, []);

  const cancelHideTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const mapLocations = useMemo(
    () =>
      availableStates.map((state) => {
        const data = summaries?.states[state.code];
        return {
          ...state,
          color: data
            ? getImpactColor(
                data.impact.cessationIncreasePercent,
                impactRange.min,
                impactRange.max,
              )
            : undefined,
        };
      }),
    [availableStates, summaries, impactRange],
  );
  const previewLocation: GeographicMapProps['onPreview'] = useCallback(
    (code, position) => {
      cancelHideTimeout();
      setHoveredStateData(summaries?.states[code] || null);
      setHoverPosition(position);
    },
    [summaries, cancelHideTimeout],
  );
  const selectLocation = useCallback(
    (code: string) => updateAnalysisQuery({ loc: code }),
    [],
  );
  const clearPreview = useCallback(() => {
    cancelHideTimeout();
    setHoveredStateData(null);
    setHoverPosition(null);
  }, [cancelHideTimeout]);

  // Count states with data
  const stateCount = config.locations.length;

  const impactHeadline = summaries
    ? getImpactHeadline(
        config.id,
        Object.values(summaries.states)[0]?.impact.headline || '',
      )
    : 'Relative increase in cumulative HIV infections';
  return (
    <div className="atlas-explorer">
      <div key="map-mode" className="atlas-layout">
        <ExplorerMapPanel
          id="state-explorer-instructions"
          eyebrow={
            config.id === 'cdc-testing'
              ? 'CDC-funded testing · State study'
              : 'Ryan White · State study'
          }
          title="Explore state projections"
          description={
            <>
              Compare how changes to{' '}
              {config.id === 'cdc-testing'
                ? 'CDC-funded HIV testing'
                : 'Ryan White services'}{' '}
              could affect HIV outcomes in {stateCount} states.
            </>
          }
          calibrationHref={
            config.calibration
              ? `/ryan-white-state-level/calibration?model=${calibrationModel}`
              : undefined
          }
          status={
            loading || error
              ? error
                ? 'Map estimates are unavailable. You can still choose a state to explore its results.'
                : 'Loading map estimates… You can choose a state now.'
              : undefined
          }
          legend={
            <>
              <h2 className="atlas-key-title">Projected increase (%)</h2>
              <p className="atlas-key-note">{impactHeadline}.</p>
              <div className="atlas-color-key" aria-hidden="true">
                {IMPACT_COLORS.map((color) => (
                  <div key={color}>
                    <i style={{ backgroundColor: color }} />
                  </div>
                ))}
              </div>
              <div className="atlas-impact-range" aria-label="Impact range">
                <span>
                  {summaries ? `+${impactRange.min.toFixed(0)}%` : '—'}
                </span>
                <span>
                  {summaries ? `+${impactRange.max.toFixed(0)}%` : '—'}
                </span>
              </div>
              <p className="atlas-key-note">
                Darker states indicate a larger projected increase. Scale
                reflects this study’s range.
              </p>
              <div className="atlas-outside-key">
                <i aria-hidden="true" />
                Outside study
              </div>
              {mapLocations.some((state) => !state.color) && (
                <p className="atlas-key-note">
                  Gray states in this study: estimates unavailable.
                </p>
              )}
            </>
          }
        >
          <label htmlFor="state-explorer-location">Choose a state</label>
          <select
            id="state-explorer-location"
            value=""
            onChange={(event) => {
              if (event.target.value)
                updateAnalysisQuery({ loc: event.target.value });
            }}
          >
            <option value="">Select a state to explore…</option>
            {availableStates.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        </ExplorerMapPanel>

        <GeographicMap
          mode="state"
          title={
            config.id === 'cdc-testing'
              ? 'The impact of ending HIV testing'
              : 'The impact of ending Ryan White services'
          }
          subtitle={`${stateCount} states · Projected increase in new HIV infections`}
          locations={mapLocations}
          onSelect={selectLocation}
          onPreview={previewLocation}
          onLeave={startHideTimeout}
          onMove={clearPreview}
        />

        {/* Custom hover card */}
        {hoveredStateData &&
          hoverPosition &&
          (() => {
            const state = hoveredStateData;
            const impactColor = getImpactColor(
              state.impact.cessationIncreasePercent,
              impactRange.min,
              impactRange.max,
            );

            const handleCardClick = () => {
              const stateCode = STATE_NAME_TO_CODE[state.name];
              if (stateCode) {
                updateAnalysisQuery({ loc: stateCode });
              }
            };

            return (
              <div
                className="fixed z-50 pointer-events-auto"
                ref={previewPlacement.ref}
                style={previewPlacement.style}
                onMouseEnter={cancelHideTimeout}
                onMouseLeave={startHideTimeout}
                onClick={handleCardClick}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleCardClick();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Explore ${state.name}`}
              >
                <div className="atlas-preview cursor-pointer">
                  {/* Header */}
                  <h3 className="text-ink mb-3">{state.name}</h3>

                  {/* Current Status - Dynamic metrics from config */}
                  <div className="py-2 border-y border-slate-100">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-[10px] uppercase tracking-wide text-slate-500">
                        Model Estimate {getStatusYear(state)}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {getStatusMetrics(state).map((metric, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between"
                        >
                          <span className="text-xs text-slate-500">
                            {metric.label}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">
                            {metric.format === 'percent'
                              ? `${metric.value.toFixed(0)}%`
                              : metric.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Impact */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 max-w-[180px] leading-snug">
                        {getImpactHeadline(config.id, state.impact.headline)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: impactColor }}
                        />
                        <span className="text-sm font-semibold text-ink">
                          +{state.impact.cessationIncreasePercent}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Click hint */}
                  <div className="atlas-preview-action">
                    <span>Explore projections</span>
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
