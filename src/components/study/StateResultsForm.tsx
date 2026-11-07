import Link from "next/link";
import { STATE_CODE_TO_NAME } from "@/data/states";

// Server-rendered: choosing a result needs neither map summaries nor page hydration.
export default function StateResultsForm({
  id,
  action,
  label,
  locations,
  scenarios,
}: {
  id: string;
  action: string;
  label: string;
  locations: string[];
  scenarios: { id: string; label: string }[];
}) {
  const states = locations
    .map((code) => ({ code, name: STATE_CODE_TO_NAME[code] }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const selectClass =
    "w-full min-w-0 rounded-none border border-[#9caeb8] bg-white px-3 py-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopkins-blue";

  return (
    <>
      <form
        action={action}
        method="get"
        aria-label={label}
        className="mt-6 space-y-5"
      >
        <div>
          <label
            htmlFor={`${id}-location`}
            className="mb-2 block text-sm font-medium"
          >
            State
          </label>
          <select
            id={`${id}-location`}
            name="loc"
            required
            defaultValue=""
            className={selectClass}
          >
            <option value="" disabled>
              Choose a state…
            </option>
            {states.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={`${id}-scenario`}
            className="mb-2 block text-sm font-medium"
          >
            Scenario
          </label>
          <select
            id={`${id}-scenario`}
            name="scenario"
            defaultValue="cessation"
            className={selectClass}
          >
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center justify-between gap-4 bg-hopkins-blue px-4 py-3 text-sm font-medium text-white hover:bg-ink"
        >
          View results <span aria-hidden="true">→</span>
        </button>
      </form>
      <Link
        href={action}
        prefetch={false}
        className="editorial-link mt-5 inline-block text-sm"
      >
        Browse the map
      </Link>
      <details className="mt-5 border-t border-rule pt-4">
        <summary className="cursor-pointer text-sm font-medium text-hopkins-blue focus-visible:outline-2 focus-visible:outline-offset-4">
          View all {states.length} states
        </summary>
        <ul className="mt-4 grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
          {states.map((state) => (
            <li key={state.code}>
              <Link
                href={`${action}?loc=${state.code}&scenario=cessation`}
                prefetch={false}
                className="editorial-link leading-relaxed"
              >
                {state.name}
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
