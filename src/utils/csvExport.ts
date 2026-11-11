/**
 * CSV Export Utilities for HIV Age Projections
 * Handles exporting chart data to CSV format for all view modes
 */

import type { StateAgeData } from '@/data/hiv-age-projections';

import { AGES, type AgeGroup } from '@/lib/aging-state';

export type ViewMode = 'state' | 'race' | 'sex';

/**
 * Export state data to CSV format
 * @param data - Array of state age data
 * @param yearRange - Year range filter [start, end]
 * @param normalized - Whether data is in normalized (%) format
 * @param viewMode - Current view mode (affects column headers)
 */
export function exportToCSV(
  data: StateAgeData[],
  yearRange: [number, number],
  normalized: boolean,
  viewMode: ViewMode = 'state',
  ages: readonly AgeGroup[] = AGES,
): void {
  // Build CSV headers
  const headers = buildHeaders(viewMode, normalized, ages);

  // Build CSV rows from data
  const rows = data.flatMap((state) => {
    // Extract state name and demographic info from state_name
    const { stateName, demographic } = parseStateName(
      state.state_name,
      viewMode,
    );

    return state.data
      .filter(
        (yearData) =>
          yearData.year >= yearRange[0] && yearData.year <= yearRange[1],
      )
      .map((yearData) => {
        const row = [stateName];

        // Add demographic column if applicable
        if (viewMode !== 'state') {
          row.push(demographic);
        }

        // Add year
        row.push(yearData.year.toString());

        // Calculate total for percentage calculations if needed
        let total = 0;
        if (normalized) {
          total = Object.values(yearData.age_cohorts).reduce(
            (sum, val) => sum + val,
            0,
          );
        }

        // Add age cohort data
        row.push(
          ...ages.map((age) =>
            formatValue(yearData.age_cohorts[age], normalized, total),
          ),
        );

        return row;
      });
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCSVValue).join(','))
    .join('\n');

  // Trigger download
  downloadCSV(csvContent, viewMode, yearRange);
}

/**
 * Build CSV headers based on view mode
 */
function buildHeaders(
  viewMode: ViewMode,
  normalized: boolean,
  ages: readonly AgeGroup[],
): string[] {
  const baseHeaders = ['State'];

  // Add demographic column header
  if (viewMode === 'race') {
    baseHeaders.push('Race and ethnicity');
  } else if (viewMode === 'sex') {
    baseHeaders.push('Transmission Category');
  }

  // Add year header
  baseHeaders.push('Year');

  // Add age cohort headers
  const suffix = normalized ? ' (%)' : '';
  baseHeaders.push(...ages.map((age) => `Age ${age}${suffix}`));

  return baseHeaders;
}

/**
 * Parse state name to extract state and demographic info
 * Format: "California - Black" or "California"
 */
function parseStateName(
  fullName: string,
  viewMode: ViewMode,
): { stateName: string; demographic: string } {
  if (viewMode === 'state') {
    return {
      stateName: fullName === 'Total' ? 'Combined study states' : fullName,
      demographic: '',
    };
  }

  const parts = fullName.split(' - ');
  return {
    stateName:
      parts[0] === 'Total' ? 'Combined study states' : parts[0] || fullName,
    demographic: parts[1] || '',
  };
}

/**
 * Format numeric value for CSV (handle normalized percentages)
 * @param value - Raw case count value
 * @param normalized - Whether to convert to percentage
 * @param total - Total for percentage calculation (only used if normalized=true)
 */
function formatValue(
  value: number,
  normalized: boolean,
  total: number = 0,
): string {
  if (normalized) {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return percentage.toFixed(1); // 1 decimal place for percentages
  }
  return value.toFixed(0); // Whole numbers for case counts
}

/**
 * Escape CSV value (handle quotes and commas)
 */
function escapeCSVValue(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Trigger browser download of CSV file
 */
function downloadCSV(
  csvContent: string,
  viewMode: ViewMode,
  yearRange: [number, number],
): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  // Generate filename with view mode and date
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `hiv-age-projections-${viewMode}-${yearRange[0]}-${yearRange[1]}-${timestamp}.csv`;

  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
