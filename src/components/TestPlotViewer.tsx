'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <div>Loading plot...</div>
});

interface PlotData {
  data: any[];
  layout: any;
}

interface MultiPlotData {
  plots: PlotData[];
  titles: string[];
}

export default function TestPlotViewer() {
  const [plotData, setPlotData] = useState<PlotData | null>(null);
  const [multiPlotData, setMultiPlotData] = useState<MultiPlotData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlot = async (plotKey: string) => {
    setLoading(true);
    setError(null);
    setMultiPlotData(null); // Clear multi-plot data when loading single plot

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const url = `${baseUrl}/plot?plotKey=${encodeURIComponent(plotKey)}`;

      console.log('Fetching plot from:', url);

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Received plot data:', data);
      setPlotData(data);

    } catch (err) {
      console.error('Error fetching plot:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMultiplePlots = async () => {
    setLoading(true);
    setError(null);
    setPlotData(null); // Clear single plot data when loading multiple plots

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

      const plotConfigs = [
        { key: 'plots/jheem_real_plot.json', title: 'HIV Incidence' },
        { key: 'plots/prevalence_test.json', title: 'Diagnosed Prevalence' },
        { key: 'plots/adap_proportion_test.json', title: 'ADAP Proportion' }
      ];

      console.log('Fetching multiple plots...');

      // Fetch all plots in parallel
      const promises = plotConfigs.map(async (config) => {
        const url = `${baseUrl}/plot?plotKey=${encodeURIComponent(config.key)}`;
        console.log(`Fetching ${config.title} from:`, url);

        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to fetch ${config.title}: ${errorData.error || `HTTP ${response.status}`}`);
        }

        const data = await response.json();
        return { data, title: config.title };
      });

      const results = await Promise.all(promises);

      const plots = results.map(result => result.data);
      const titles = results.map(result => result.title);

      setMultiPlotData({ plots, titles });
      console.log('Successfully loaded multiple plots:', titles);

    } catch (err) {
      console.error('Error fetching multiple plots:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">JHEEM Plot Viewer Test</h1>

      {/* Test buttons */}
      <div className="mb-6 space-x-4 space-y-2">
        <div className="space-x-4">
          <button
            onClick={() => fetchPlot('plots/test.json')}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Load Test Plot
          </button>

          <button
            onClick={() => fetchPlot('plots/jheem_real_plot.json')}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Load Real JHEEM Plot
          </button>

          <button
            onClick={() => fetchPlot('nonexistent.json')}
            disabled={loading}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Test Error (404)
          </button>
        </div>

        <div>
          <button
            onClick={fetchMultiplePlots}
            disabled={loading}
            className="px-6 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 font-semibold"
          >
            Load Multiple Outcomes
          </button>
        </div>
      </div>

      {/* Status display */}
      {loading && (
        <div className="mb-4 p-4 bg-blue-100 rounded">
          {multiPlotData === null && plotData === null ?
            'Loading plots...' :
            'Loading plot...'
          }
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Single plot display */}
      {plotData && !loading && !multiPlotData && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Single Plot:</h2>
          <div className="border rounded p-4 overflow-hidden">
            <div className="w-full" style={{ height: '500px' }}>
              <Plot
                data={plotData.data}
                layout={{
                  ...plotData.layout,
                  autosize: true,
                  margin: { l: 50, r: 50, t: 50, b: 50 }
                }}
                style={{ width: '100%', height: '100%' }}
                config={{
                  responsive: true,
                  displayModeBar: true,
                }}
                useResizeHandler={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Multi-plot display */}
      {multiPlotData && !loading && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-4">Multiple Outcomes for C.12580 - Cessation Scenario:</h2>
          <div className="space-y-6">
            {multiPlotData.plots.map((plot, index) => (
              <div key={index} className="border rounded p-4 overflow-hidden">
                <h3 className="text-lg font-medium mb-2">{multiPlotData.titles[index]}</h3>
                <div className="w-full" style={{ height: '500px' }}>
                  <Plot
                    data={plot.data}
                    layout={{
                      ...plot.layout,
                      autosize: true,
                      title: undefined, // Remove title since we're showing it as a heading
                      margin: { l: 50, r: 50, t: 30, b: 50 }
                    }}
                    style={{ width: '100%', height: '100%' }}
                    config={{
                      responsive: true,
                      displayModeBar: true,
                    }}
                    useResizeHandler={true}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw data display for debugging - only for single plots to avoid clutter */}
      {plotData && !multiPlotData && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Raw JSON Data:</h3>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-40">
            {JSON.stringify(plotData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
