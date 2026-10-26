export default function ChartLegend({
  scenarioLabel = 'Scenario',
  baseline,
  observations,
}: {
  scenarioLabel?: string;
  baseline: boolean;
  observations: boolean;
}) {
  return (
    <ul
      aria-label="Chart legend"
      className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink"
    >
      <li className="flex items-center gap-2">
        <svg aria-hidden="true" width="24" height="12">
          <path d="M0 6h24" stroke="#275f83" strokeWidth="2.5" />
        </svg>
        {scenarioLabel}
      </li>
      {baseline && (
        <li className="flex items-center gap-2">
          <svg aria-hidden="true" width="24" height="12">
            <path
              d="M0 6h24"
              stroke="#79858b"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
          </svg>
          Baseline
        </li>
      )}
      {observations && (
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full bg-[#ad654c]"
          />
          Observed data
        </li>
      )}
    </ul>
  );
}
