'use client';
import { useMemo, useState } from 'react';
import CalibrationChart from './CalibrationChart';
import {
  getCalibrationData,
  type CalibrationOutcome,
  type AgeCategory,
  type CalibrationStateCode,
  CALIBRATION_STATES,
  STATE_NAMES,
  AGE_CATEGORIES,
  OUTCOME_LABELS,
} from '@/data/calibration-data';
export default function CalibrationSection() {
  const [state, setState] = useState<CalibrationStateCode>('CA');
  const [outcome, setOutcome] = useState<CalibrationOutcome | 'both'>('both');
  const [allAges, setAllAges] = useState(false);
  const charts = useMemo(() => {
    const outcomes: CalibrationOutcome[] =
      outcome === 'both' ? ['prevalence', 'diagnoses'] : [outcome];
    const ages: (AgeCategory | 'total')[] = allAges
      ? ['total', ...AGE_CATEGORIES]
      : ['total'];
    return outcomes.flatMap((outcome) =>
      ages.map((age) => ({
        outcome,
        age,
        data: getCalibrationData(state, outcome, age),
      })),
    );
  }, [state, outcome, allAges]);
  return (
    <div data-testid="aging-evidence" className="pt-6">
      <p className="max-w-3xl text-sm leading-relaxed text-muted">
        Model estimates are compared with CDC surveillance data through 2021.
        Black lines show the mean across 1,000 simulations; orange bands show
        95% credible intervals; green points show observed data. The dashed line
        marks the end of the observed period.
      </p>
      <div className="my-6 grid gap-5 border-y border-rule bg-paper p-5 sm:grid-cols-3">
        <div>
          <label htmlFor="aging-fit-state" className="text-sm font-medium">
            Model-fit state
          </label>
          <select
            id="aging-fit-state"
            className="aging-select mt-2"
            value={state}
            onChange={(e) => setState(e.target.value as CalibrationStateCode)}
          >
            {CALIBRATION_STATES.map((code) => (
              <option key={code} value={code}>
                {STATE_NAMES[code]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="aging-fit-outcome" className="text-sm font-medium">
            Model-fit outcome
          </label>
          <select
            id="aging-fit-outcome"
            className="aging-select mt-2"
            value={outcome}
            onChange={(e) =>
              setOutcome(e.target.value as CalibrationOutcome | 'both')
            }
          >
            <option value="both">Both outcomes</option>
            <option value="prevalence">People with diagnosed HIV</option>
            <option value="diagnoses">New diagnoses</option>
          </select>
        </div>
        <div>
          <label htmlFor="aging-fit-groups" className="text-sm font-medium">
            Model-fit age groups
          </label>
          <select
            id="aging-fit-groups"
            className="aging-select mt-2"
            value={allAges ? 'all' : 'total'}
            onChange={(e) => setAllAges(e.target.value === 'all')}
          >
            <option value="total">All ages combined</option>
            <option value="all">Combined and each age group</option>
          </select>
        </div>
      </div>
      <div className="grid min-w-0 gap-8 md:grid-cols-2 xl:grid-cols-3">
        {charts.map((chart) => (
          <section key={`${chart.outcome}-${chart.age}`} className="min-w-0">
            <h3 className="mb-3 text-sm font-medium">
              {STATE_NAMES[state]} · {OUTCOME_LABELS[chart.outcome]}
            </h3>
            <CalibrationChart
              data={chart.data}
              outcome={chart.outcome}
              ageCategory={chart.age}
              stateName={STATE_NAMES[state]}
              height={300}
            />
            <details className="mt-3 border-t border-rule pt-3">
              <summary className="cursor-pointer text-sm text-hopkins-blue">
                View model-fit values
              </summary>
              <div
                className="overflow-x-auto"
                tabIndex={0}
                role="region"
                aria-label={`${STATE_NAMES[state]} ${chart.outcome} ${chart.age} values`}
              >
                <table className="mt-3 w-full min-w-100 text-right text-xs tabular-nums">
                  <caption className="pb-3 text-left">
                    {STATE_NAMES[state]} · {OUTCOME_LABELS[chart.outcome]} ·{' '}
                    {chart.age}
                  </caption>
                  <thead>
                    <tr>
                      {[
                        'Year',
                        'Mean',
                        'Lower 95%',
                        'Upper 95%',
                        'Observed',
                      ].map((label) => (
                        <th key={label} scope="col" className="px-2 py-2">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chart.data.map((row) => (
                      <tr key={row.year} className="border-t border-rule">
                        <th scope="row" className="px-2 py-2 font-normal">
                          {row.year}
                        </th>
                        {[row.mean, row.lower, row.upper, row.observed].map(
                          (value, i) => (
                            <td key={i} className="px-2 py-2">
                              {value === undefined
                                ? '—'
                                : Math.round(value).toLocaleString()}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        ))}
      </div>
    </div>
  );
}
