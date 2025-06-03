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

export default function TestPlotViewer() {
  const [plotData, setPlotData] = useState<PlotData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlot = async (plotKey: string) => {
    setLoading(true);
    setError(null);
    
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">JHEEM Plot Viewer Test</h1>
      
      {/* Test buttons */}
      <div className="mb-6 space-x-4">
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

      {/* Status display */}
      {loading && (
        <div className="mb-4 p-4 bg-blue-100 rounded">
          Loading plot...
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Plot display */}
      {plotData && !loading && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Plot:</h2>
          <div className="border rounded p-4">
            <Plot
              data={plotData.data}
              layout={{
                ...plotData.layout,
                autosize: true,
              }}
              style={{ width: '100%', height: '500px' }}
              config={{
                responsive: true,
                displayModeBar: true,
              }}
            />
          </div>
        </div>
      )}

      {/* Raw data display for debugging */}
      {plotData && (
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
