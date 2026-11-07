import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import CopyCitation from "@/components/study/CopyCitation";
import StateResultsForm from "@/components/study/StateResultsForm";
import {
  ajphStateLevelConfig,
  croiStateLevelConfig,
  type ModelConfig,
} from "@/config/model-configs";

export const metadata: Metadata = {
  title: "Ryan White services & state HIV outcomes | JHEEM",
  description:
    "Explore how interruptions to Ryan White services could affect HIV outcomes in two state-level studies: 11 states through 2030 and 30 states through 2031.",
};

const paperTitle =
  "Projected Increase in HIV Incidence in 11 States if Ryan White Ends: A Simulation Study";
const authors =
  "Schnure M, Forster R, Jones JL, Lesko CR, Batey DS, Butler I, Ward D, Musgrove K, Althoff KN, Jain MK, Gebo KA, Dowdy DW, Shah M, Kasaie P, Fojo AT";
const paperUrl = "https://doi.org/10.2105/AJPH.2025.308409";
const citation = `${authors}. ${paperTitle}. Am J Public Health. 2026;116(5):732–735. doi:10.2105/AJPH.2025.308409`;

function scenarioChoices(config: ModelConfig) {
  return config.scenarios.map((scenario) => {
    const timeline = scenario.timeline;
    const months = timeline?.serviceResumeTime
      ? Math.round(
          (timeline.serviceResumeTime - timeline.serviceInterruptionStartTime) *
            12,
        )
      : null;
    // Keep the distinguishing assumption visible in narrow native selectors.
    const label = scenario.id.endsWith("_conservative")
      ? `${months ? `${months} months` : "Cessation"} (conservative)`
      : months
        ? `${months}-month interruption`
        : "Permanent cessation";
    return {
      id: scenario.id,
      label,
    };
  });
}

// Published AJPH estimates, not a calculation from either interactive release.
const publishedScenarios = [
  {
    name: "Brief interruption",
    gap: "18 months",
    increase: "26%",
    additional: "26,951",
  },
  {
    name: "Prolonged interruption",
    gap: "42 months",
    increase: "52%",
    additional: "53,594",
  },
  {
    name: "Permanent cessation",
    gap: "Services do not resume",
    increase: "68%",
    additional: "69,695",
  },
];

export default function RyanWhiteStateLevelPage() {
  return (
    <div className="editorial-page bg-white text-ink">
      <header className="border-b border-rule">
        <div className="site-container grid gap-7 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hopkins-blue">
              Ryan White · State-level studies
            </p>
            <h1 className="editorial-title mt-5 max-w-3xl text-[2.6rem] leading-[1.08] sm:text-[3.4rem]">
              What would losing Ryan White services mean for your state?
            </h1>
          </div>
          <div className="self-end">
            <p className="text-lg leading-relaxed text-muted">
              We modeled how temporary interruptions and permanent loss of
              services could affect new HIV infections and other outcomes across
              U.S. states.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Both studies compare disrupted services with continued Ryan White
              services. Their locations, dates, and assumptions differ.
            </p>
            <a
              href="#local-results"
              className="editorial-link mt-5 inline-block text-sm"
            >
              Choose a study and state <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      </header>

      <section
        id="local-results"
        aria-labelledby="local-results-heading"
        className="scroll-mt-6 border-b border-rule sm:scroll-mt-44"
      >
        <div className="site-container py-10 sm:py-12">
          <h2 id="local-results-heading" className="editorial-section-title">
            Explore your state
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Choose the study that covers your state and time period, then
            compare a scenario with continued services.
          </p>
          <div className="mt-7 grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
            <section
              aria-labelledby="ajph-heading"
              className="min-w-0 border-t-2 border-hopkins-blue bg-paper p-6 sm:p-8"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Published study · AJPH · 2026
              </p>
              <h3
                id="ajph-heading"
                className="mt-3 font-serif text-[2rem] leading-tight tracking-[-0.02em]"
              >
                {ajphStateLevelConfig.locations.length} states ·{" "}
                <span className="whitespace-nowrap">2025–2030</span>
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Interruptions begin in July 2025. Compare an 18-month or
                42-month interruption with permanent cessation.
              </p>
              <StateResultsForm
                id="ajph"
                action="/ryan-white-state-level/explorer/ajph"
                label="Explore 11-state results"
                locations={ajphStateLevelConfig.locations}
                scenarios={scenarioChoices(ajphStateLevelConfig)}
              />
            </section>
            <section
              aria-labelledby="croi-heading"
              className="min-w-0 border-t-2 border-hopkins-blue bg-paper p-6 sm:p-8"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Conference study · CROI · 2026
              </p>
              <h3
                id="croi-heading"
                className="mt-3 font-serif text-[2rem] leading-tight tracking-[-0.02em]"
              >
                {croiStateLevelConfig.locations.length} states ·{" "}
                <span className="whitespace-nowrap">2026–2031</span>
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Interruptions begin in July 2026. Compare a 30-month
                interruption with permanent cessation, including conservative
                impact assumptions.
              </p>
              <StateResultsForm
                id="croi"
                action="/ryan-white-state-level/explorer/croi"
                label="Explore 30-state results"
                locations={croiStateLevelConfig.locations}
                scenarios={scenarioChoices(croiStateLevelConfig)}
              />
            </section>
          </div>
          <p className="mt-6 text-sm leading-relaxed text-muted">
            State not listed?{" "}
            <Link href="/ryan-white" className="editorial-link">
              Explore our city-level study
            </Link>{" "}
            or{" "}
            <Link href="/work-with-us#contact" className="editorial-link">
              discuss a local question with our team
            </Link>
            .
          </p>
        </div>
      </section>

      <section
        id="findings"
        aria-labelledby="findings-heading"
        className="scroll-mt-44 border-b border-rule"
      >
        <div className="site-container grid gap-8 py-12 sm:py-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.3fr)] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Findings from the 11-state publication
            </p>
            <h2 id="findings-heading" className="editorial-section-title mt-4">
              Longer interruptions,
              <br />
              greater effects.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted">
              Losing care and support services can disrupt HIV treatment. The
              model estimates how that could reduce viral suppression—the
              control of HIV through treatment—and increase transmission.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted">
              The published study projected more new infections under all three
              scenarios, with substantial differences between states.
            </p>
            <a
              href={paperUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="editorial-link mt-5 inline-block text-sm"
            >
              Read the paper <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div>
            <table className="w-full border-collapse text-left text-sm">
              <caption className="pb-5 text-left text-base font-medium leading-relaxed">
                Additional new HIV infections, 2025–2030
                <br />
                <span className="font-normal text-muted">
                  Across the 11 study states, compared with continued services
                </span>
              </caption>
              <thead className="border-y border-rule text-xs text-muted">
                <tr>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Scenario / service gap
                  </th>
                  <th scope="col" className="py-3 text-right font-medium">
                    Projected increase
                  </th>
                </tr>
              </thead>
              <tbody>
                {publishedScenarios.map((scenario) => (
                  <tr key={scenario.name} className="border-b border-rule">
                    <th scope="row" className="py-4 pr-4 font-medium">
                      {scenario.name}
                      <span className="mt-1 block font-normal text-muted">
                        {scenario.gap}
                      </span>
                    </th>
                    <td className="py-4 text-right">
                      <span className="font-serif text-[2.25rem] tabular-nums text-hopkins-blue">
                        +{scenario.increase}
                      </span>
                      <span className="mt-1 block text-xs tabular-nums text-muted">
                        {scenario.additional} additional
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-5 text-sm leading-relaxed text-muted">
              With permanent cessation, projected increases ranged from 45% in
              Texas to 126% in Missouri. The estimate of 69,695 additional
              infections had a 95% credible interval of 18,943–123,628.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              These figures summarize the 11-state AJPH publication. The
              30-state CROI study uses different dates and assumptions; its
              results are available separately above.
            </p>
          </div>
        </div>
      </section>

      <section
        id="publication"
        aria-labelledby="publication-heading"
        className="scroll-mt-44"
      >
        <div className="site-container grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Publication · American Journal of Public Health · 2026
            </p>
            <h2
              id="publication-heading"
              className="mt-4 font-serif text-2xl leading-snug sm:text-[1.875rem]"
            >
              {paperTitle}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {authors}.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <a
                href={paperUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="editorial-link"
              >
                Read the publication <span aria-hidden="true">↗</span>
              </a>
              <CopyCitation citation={citation} />
            </div>
            <p className="mt-3 text-xs text-muted">
              116(5):732–735 · doi:10.2105/AJPH.2025.308409
            </p>
            <div className="mt-8 border-t border-rule pt-6">
              <h3 className="text-base font-medium">
                The 30-state study at CROI 2026
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Melissa Schnure presents the expanded state-level analysis.
              </p>
              <a
                href="https://www.croiwebcasts.org/console/player/55174?mediaType=slideVideo"
                target="_blank"
                rel="noopener noreferrer"
                className="editorial-link mt-3 inline-block text-sm"
              >
                Watch the conference presentation{" "}
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          <div className="space-y-7 border-t border-rule pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
            <div>
              <h3 className="text-base font-medium">
                How well do the models fit?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Compare model estimates with observed HIV and service data for
                each study.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                <Link
                  href="/ryan-white-state-level/calibration?model=ajph"
                  prefetch={false}
                  className="editorial-link"
                >
                  11-state model fit <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/ryan-white-state-level/calibration?model=croi"
                  prefetch={false}
                  className="editorial-link"
                >
                  30-state model fit <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
            <div>
              <h3 className="text-base font-medium">
                Have a different scenario in mind?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Choose a study and specify changes in viral suppression to run a
                custom simulation.
              </p>
              <Link
                href="/ryan-white-state-level/custom"
                prefetch={false}
                className="editorial-link mt-3 inline-block text-sm"
              >
                Set up a custom scenario <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
