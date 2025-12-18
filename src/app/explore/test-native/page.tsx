'use client';

import React, { useState, useEffect, useMemo } from 'react';
import NativeSimulationChart from '@/components/NativeSimulationChart';
import { transformPlotData } from '@/utils/transformPlotData';
import type { PlotDataFile, ChartDisplayOptions } from '@/types/native-plotting';

// Available test files - organized by outcome, statistic, and facet
const TEST_FILES = [
  // === MEAN AND INTERVAL ===
  // Incidence
  { id: 'incidence_mean_none', label: '📊 Incidence - Mean (Unfaceted)', file: 'incidence_mean.and.interval_unfaceted.json' },
  { id: 'incidence_mean_sex', label: '📊 Incidence - Mean (By Sex)', file: 'incidence_mean.and.interval_facet_sex.json' },
  { id: 'incidence_mean_age', label: '📊 Incidence - Mean (By Age)', file: 'incidence_mean.and.interval_facet_age.json' },
  { id: 'incidence_mean_race', label: '📊 Incidence - Mean (By Race)', file: 'incidence_mean.and.interval_facet_race.json' },
  // Diagnosed Prevalence
  { id: 'prevalence_mean_none', label: '📊 Prevalence - Mean (Unfaceted)', file: 'diagnosed.prevalence_mean.and.interval_unfaceted.json' },
  { id: 'prevalence_mean_sex', label: '📊 Prevalence - Mean (By Sex)', file: 'diagnosed.prevalence_mean.and.interval_facet_sex.json' },
  { id: 'prevalence_mean_age', label: '📊 Prevalence - Mean (By Age)', file: 'diagnosed.prevalence_mean.and.interval_facet_age.json' },
  { id: 'prevalence_mean_race', label: '📊 Prevalence - Mean (By Race)', file: 'diagnosed.prevalence_mean.and.interval_facet_race.json' },
  // Testing
  { id: 'testing_mean_none', label: '📊 Testing - Mean (Unfaceted)', file: 'testing_mean.and.interval_unfaceted.json' },
  { id: 'testing_mean_sex', label: '📊 Testing - Mean (By Sex)', file: 'testing_mean.and.interval_facet_sex.json' },
  { id: 'testing_mean_age', label: '📊 Testing - Mean (By Age)', file: 'testing_mean.and.interval_facet_age.json' },
  { id: 'testing_mean_race', label: '📊 Testing - Mean (By Race)', file: 'testing_mean.and.interval_facet_race.json' },
  // Suppression
  { id: 'suppression_mean_none', label: '📊 Suppression - Mean (Unfaceted)', file: 'suppression_mean.and.interval_unfaceted.json' },
  { id: 'suppression_mean_sex', label: '📊 Suppression - Mean (By Sex)', file: 'suppression_mean.and.interval_facet_sex.json' },
  { id: 'suppression_mean_age', label: '📊 Suppression - Mean (By Age)', file: 'suppression_mean.and.interval_facet_age.json' },
  { id: 'suppression_mean_race', label: '📊 Suppression - Mean (By Race)', file: 'suppression_mean.and.interval_facet_race.json' },
  // Awareness
  { id: 'awareness_mean_none', label: '📊 Awareness - Mean (Unfaceted)', file: 'awareness_mean.and.interval_unfaceted.json' },
  { id: 'awareness_mean_age', label: '📊 Awareness - Mean (By Age)', file: 'awareness_mean.and.interval_facet_age.json' },
  // New Diagnoses
  { id: 'new_mean_none', label: '📊 New Diagnoses - Mean (Unfaceted)', file: 'new_mean.and.interval_unfaceted.json' },
  { id: 'new_mean_sex', label: '📊 New Diagnoses - Mean (By Sex)', file: 'new_mean.and.interval_facet_sex.json' },
  { id: 'new_mean_age', label: '📊 New Diagnoses - Mean (By Age)', file: 'new_mean.and.interval_facet_age.json' },
  { id: 'new_mean_race', label: '📊 New Diagnoses - Mean (By Race)', file: 'new_mean.and.interval_facet_race.json' },

  // === INDIVIDUAL SIMULATIONS ===
  // Incidence
  { id: 'incidence_ind_none', label: '📈 Incidence - Individual (Unfaceted)', file: 'incidence_individual.simulation_unfaceted.json' },
  { id: 'incidence_ind_sex', label: '📈 Incidence - Individual (By Sex)', file: 'incidence_individual.simulation_facet_sex.json' },
  { id: 'incidence_ind_age', label: '📈 Incidence - Individual (By Age)', file: 'incidence_individual.simulation_facet_age.json' },
  { id: 'incidence_ind_race', label: '📈 Incidence - Individual (By Race)', file: 'incidence_individual.simulation_facet_race.json' },
  // Diagnosed Prevalence
  { id: 'prevalence_ind_none', label: '📈 Prevalence - Individual (Unfaceted)', file: 'diagnosed.prevalence_individual.simulation_unfaceted.json' },
  { id: 'prevalence_ind_sex', label: '📈 Prevalence - Individual (By Sex)', file: 'diagnosed.prevalence_individual.simulation_facet_sex.json' },
  { id: 'prevalence_ind_age', label: '📈 Prevalence - Individual (By Age)', file: 'diagnosed.prevalence_individual.simulation_facet_age.json' },
  { id: 'prevalence_ind_race', label: '📈 Prevalence - Individual (By Race)', file: 'diagnosed.prevalence_individual.simulation_facet_race.json' },
  // Testing
  { id: 'testing_ind_none', label: '📈 Testing - Individual (Unfaceted)', file: 'testing_individual.simulation_unfaceted.json' },
  { id: 'testing_ind_sex', label: '📈 Testing - Individual (By Sex)', file: 'testing_individual.simulation_facet_sex.json' },
  { id: 'testing_ind_age', label: '📈 Testing - Individual (By Age)', file: 'testing_individual.simulation_facet_age.json' },
  { id: 'testing_ind_race', label: '📈 Testing - Individual (By Race)', file: 'testing_individual.simulation_facet_race.json' },
  // Suppression
  { id: 'suppression_ind_none', label: '📈 Suppression - Individual (Unfaceted)', file: 'suppression_individual.simulation_unfaceted.json' },
  { id: 'suppression_ind_sex', label: '📈 Suppression - Individual (By Sex)', file: 'suppression_individual.simulation_facet_sex.json' },
  { id: 'suppression_ind_age', label: '📈 Suppression - Individual (By Age)', file: 'suppression_individual.simulation_facet_age.json' },
  { id: 'suppression_ind_race', label: '📈 Suppression - Individual (By Race)', file: 'suppression_individual.simulation_facet_race.json' },
  // Awareness
  { id: 'awareness_ind_none', label: '📈 Awareness - Individual (Unfaceted)', file: 'awareness_individual.simulation_unfaceted.json' },
  { id: 'awareness_ind_age', label: '📈 Awareness - Individual (By Age)', file: 'awareness_individual.simulation_facet_age.json' },
  // New Diagnoses
  { id: 'new_ind_none', label: '📈 New Diagnoses - Individual (Unfaceted)', file: 'new_individual.simulation_unfaceted.json' },
  { id: 'new_ind_sex', label: '📈 New Diagnoses - Individual (By Sex)', file: 'new_individual.simulation_facet_sex.json' },
  { id: 'new_ind_age', label: '📈 New Diagnoses - Individual (By Age)', file: 'new_individual.simulation_facet_age.json' },
  { id: 'new_ind_race', label: '📈 New Diagnoses - Individual (By Race)', file: 'new_individual.simulation_facet_race.json' },
];

export default function TestNativePlotting() {
  const [plotData, setPlotData] = useState<PlotDataFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState(TEST_FILES[0].file);

  // Display options
  const [displayOptions, setDisplayOptions] = useState<ChartDisplayOptions>({
    showConfidenceInterval: true,
    showBaseline: true,
    showObservations: true,
  });

  // Load data when file selection changes
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/test-data/${selectedFile}`);
        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.status}`);
        }
        const data: PlotDataFile = await response.json();
        setPlotData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setPlotData(null);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedFile]);

  // Transform data for charts
  const chartPanels = useMemo(() => {
    if (!plotData) return [];
    return transformPlotData(plotData);
  }, [plotData]);

  // Debug info
  const debugInfo = useMemo(() => {
    if (!plotData) return null;
    return {
      metadata: plotData.metadata,
      simPointCount: plotData.sim?.length || 0,
      obsPointCount: Array.isArray(plotData.obs) ? plotData.obs.length : 0,
      panelCount: chartPanels.length,
      sampleSimPoint: plotData.sim?.[0],
      sampleObsPoint: Array.isArray(plotData.obs) ? plotData.obs[0] : null,
    };
  }, [plotData, chartPanels]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading test data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-xl font-bold mb-2">Error Loading Data</p>
          <p>{error}</p>
          <p className="text-sm text-gray-500 mt-4">
            Make sure test data files are in /public/test-data/
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Native Plotting Test (V2)
              </h1>
              <p className="text-sm text-gray-500">
                Testing pre-aggregated data from prepare_plot_local
              </p>
            </div>
            {plotData && (
              <div className="text-right text-xs text-gray-400">
                <p>{plotData.metadata.plot_title}</p>
                <p>Generated: {plotData.metadata.generation_time}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Controls</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Test File
              </label>
              <select
                value={selectedFile}
                onChange={e => setSelectedFile(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {TEST_FILES.map(f => (
                  <option key={f.id} value={f.file}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Display options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={displayOptions.showConfidenceInterval}
                    onChange={e => setDisplayOptions(prev => ({
                      ...prev,
                      showConfidenceInterval: e.target.checked,
                    }))}
                    className="mr-2 rounded"
                  />
                  Show Confidence Intervals
                </label>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={displayOptions.showBaseline}
                    onChange={e => setDisplayOptions(prev => ({
                      ...prev,
                      showBaseline: e.target.checked,
                    }))}
                    className="mr-2 rounded"
                  />
                  Show Baseline
                </label>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={displayOptions.showObservations}
                    onChange={e => setDisplayOptions(prev => ({
                      ...prev,
                      showObservations: e.target.checked,
                    }))}
                    className="mr-2 rounded"
                  />
                  Show Observations
                </label>
              </div>
            </div>
          </div>

          {/* Data summary */}
          {plotData && (
            <div className="bg-gray-50 rounded-lg p-4 mt-4 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-500">Outcome</p>
                  <p className="font-medium">{plotData.metadata.outcome_metadata?.display_name || plotData.metadata.outcome}</p>
                </div>
                <div>
                  <p className="text-gray-500">Scenario</p>
                  <p className="font-medium capitalize">{plotData.metadata.scenario.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-gray-500">Faceting</p>
                  <p className="font-medium capitalize">{plotData.metadata.facet === 'none' ? 'None' : `By ${plotData.metadata.facet}`}</p>
                </div>
                <div>
                  <p className="text-gray-500">Units</p>
                  <p className="font-medium">{plotData.metadata.y_label}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Charts */}
        <div className="space-y-6">
          {chartPanels.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No data available</p>
            </div>
          ) : chartPanels.length === 1 ? (
            // Single chart for unfaceted view
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {plotData && (
                <NativeSimulationChart
                  panel={chartPanels[0]}
                  outcomeLabel={plotData.metadata.outcome_metadata?.display_name || plotData.metadata.outcome}
                  units={plotData.metadata.y_label}
                  displayAsPercent={plotData.metadata.outcome_metadata?.display_as_percent || false}
                  options={displayOptions}
                  height={500}
                />
              )}
            </div>
          ) : (
            // Grid of charts for faceted view
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {chartPanels.map(panel => (
                <div
                  key={panel.facetValue}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                >
                  {plotData && (
                    <NativeSimulationChart
                      panel={panel}
                      outcomeLabel={plotData.metadata.outcome_metadata?.display_name || plotData.metadata.outcome}
                      units={plotData.metadata.y_label}
                      displayAsPercent={plotData.metadata.outcome_metadata?.display_as_percent || false}
                      options={displayOptions}
                      height={350}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Debug info (collapsible) */}
        <details className="mt-8 bg-gray-100 rounded-xl p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-600">
            Debug: Raw Data Structure
          </summary>
          <div className="mt-4 overflow-x-auto">
            <pre className="text-xs text-gray-600 bg-white p-4 rounded-lg">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </details>

        {/* Transformed data debug */}
        <details className="mt-4 bg-gray-100 rounded-xl p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-600">
            Debug: Transformed Chart Data
          </summary>
          <div className="mt-4 overflow-x-auto">
            <pre className="text-xs text-gray-600 bg-white p-4 rounded-lg">
              {JSON.stringify({
                panelCount: chartPanels.length,
                panels: chartPanels.map(p => ({
                  facetValue: p.facetValue,
                  facetLabel: p.facetLabel,
                  dataPointCount: p.data.length,
                  observationCount: p.observations.length,
                  sampleDataPoint: p.data[0],
                  sampleObservation: p.observations[0],
                })),
              }, null, 2)}
            </pre>
          </div>
        </details>
      </div>
    </div>
  );
}
