'use client';
import { AVAILABLE_STATES } from '@/data/hiv-age-catalog';
export default function StateSelector({
  selectedStates,
  onStateChange,
  maxStates = 25,
}: {
  selectedStates: string[];
  onStateChange: (states: string[]) => void;
  maxStates?: number;
}) {
  return (
    <details className="aging-state-picker">
      <summary className="cursor-pointer text-sm font-medium text-hopkins-blue">
        Choose states{' '}
        <span className="font-normal text-muted">
          ({selectedStates.length} selected)
        </span>
      </summary>
      <fieldset className="mt-5">
        <legend className="text-sm text-muted">
          Choose up to {maxStates} locations. Combined states includes all 24
          study states.
        </legend>
        <div className="my-3 flex flex-wrap gap-5 text-sm">
          {maxStates >= AVAILABLE_STATES.length && (
            <button
              type="button"
              className="editorial-link min-h-11"
              onClick={() => onStateChange([...AVAILABLE_STATES])}
            >
              Select all locations
            </button>
          )}
          <button
            type="button"
            className="editorial-link min-h-11"
            onClick={() => onStateChange([])}
          >
            Clear selection
          </button>
        </div>
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-3 lg:grid-cols-5">
          {AVAILABLE_STATES.map((name) => (
            <label
              key={name}
              className="flex min-h-11 cursor-pointer items-center gap-3 text-sm has-disabled:cursor-default has-disabled:text-muted"
            >
              <input
                type="checkbox"
                checked={selectedStates.includes(name)}
                disabled={
                  !selectedStates.includes(name) &&
                  selectedStates.length >= maxStates
                }
                onChange={() =>
                  onStateChange(
                    selectedStates.includes(name)
                      ? selectedStates.filter((x) => x !== name)
                      : [...selectedStates, name],
                  )
                }
                className="h-4 w-4 accent-hopkins-blue"
              />
              {name === 'Total' ? 'Combined states' : name}
            </label>
          ))}
        </div>
      </fieldset>
    </details>
  );
}
