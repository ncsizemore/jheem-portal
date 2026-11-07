import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import CopyCitation from "@/components/study/CopyCitation";
import StateResultsForm from "@/components/study/StateResultsForm";
import { cdcTestingConfig } from "@/config/model-configs";

export const metadata: Metadata = {
  title: "CDC-funded HIV testing & state outcomes | JHEEM",
  description:
    "Explore how interruptions to CDC-funded HIV testing could affect new infections across 18 U.S. states, compared with continued funding.",
};

const paperTitle =
  "The Potential Effect of Ending Centers for Disease Control and Prevention Funding for HIV Tests: A Modeling Study in 18 States";
const authors =
  "Balasubramanian R, Schnure M, Forster R, Hanage WP, Batey DS, Althoff KN, Gebo KA, Dowdy DW, Shah M, Kasaie P, Fojo AT";
const paperUrl = "https://doi.org/10.1093/cid/ciag038";
const citation = `${authors}. ${paperTitle}. Clin Infect Dis. 2026;82(4):e746–e754. doi:10.1093/cid/ciag038`;
// Published estimates and recovery dates: CID Figure 2 and Results, ciag038.
// Funding resumes at the start of the recovery year; testing recovers over that year.
const publishedScenarios = [
  {
    id: "brief_interruption",
    name: "Brief interruption",
    recovery: "Testing recovers during 2027",
    increase: "3.9%",
  },
  {
    id: "prolonged_interruption",
    name: "Prolonged interruption",
    recovery: "Testing recovers during 2029",
    increase: "8.2%",
  },
  {
    id: "cessation",
    name: "Permanent cessation",
    recovery: "CDC-funded testing does not resume",
    increase: "9.9%",
  },
];
const scenarioChoices = cdcTestingConfig.scenarios.map((scenario) => {
  const published = publishedScenarios.find((item) => item.id === scenario.id)!;
  return { id: scenario.id, label: published.name };
});

export default function CdcTestingLandingPage() {
  return (
    <div className="editorial-page bg-white text-ink">
      <header className="border-b border-rule">
        <div className="site-container grid gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16 lg:py-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hopkins-blue">
              CDC-funded HIV testing · State-level study
            </p>
            <h1 className="editorial-title mt-5 max-w-2xl text-[2.6rem] leading-[1.08] sm:text-[3.4rem]">
              What happens if funding for HIV testing stops?
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              We modeled how interruptions to CDC-funded testing could affect
              new HIV infections in {cdcTestingConfig.locations.length} U.S.
              states. Explore the consequences of a temporary gap or permanent
              loss of funding.
            </p>
            <a
              href="#local-results"
              className="editorial-link mt-5 inline-block text-sm lg:hidden"
            >
              Explore your state <span aria-hidden="true">↓</span>
            </a>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted">
              Each scenario compares disrupted testing with continued CDC
              funding. The modeled interruptions begin in October 2025.
            </p>
            <p className="mt-7 border-t border-rule pt-5 text-sm leading-relaxed text-muted">
              Balasubramanian and colleagues ·{" "}
              <cite className="not-italic">Clinical Infectious Diseases</cite> ·
              2026
              <br />
              <a
                href="#publication"
                className="editorial-link mt-2 inline-block"
              >
                Publication and methods <span aria-hidden="true">↓</span>
              </a>
            </p>
          </div>
          <section
            id="local-results"
            aria-labelledby="local-results-heading"
            className="min-w-0 scroll-mt-6 self-start border-t-2 border-hopkins-blue bg-paper p-6 sm:scroll-mt-44 sm:p-8"
          >
            <h2
              id="local-results-heading"
              className="font-serif text-[2rem] leading-tight tracking-[-0.02em]"
            >
              Explore your state
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Compare new HIV infections, then explore other outcomes and
              population groups.
            </p>
            <StateResultsForm
              id="cdc"
              action="/cdc-testing/explorer"
              label="Explore CDC testing results"
              locations={cdcTestingConfig.locations}
              scenarios={scenarioChoices}
            />
          </section>
        </div>
      </header>

      <section
        id="findings"
        aria-labelledby="findings-heading"
        className="scroll-mt-44 border-b border-rule"
      >
        <div className="site-container grid gap-8 py-12 sm:py-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.3fr)] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Findings from the published study
            </p>
            <h2 id="findings-heading" className="editorial-section-title mt-4">
              The effects reach beyond missed tests.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted">
              Testing helps people learn their HIV status and access treatment.
              Delays in diagnosis and treatment can increase onward
              transmission.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted">
              All three scenarios projected more new infections than continued
              funding, even allowing for some tests to be replaced through other
              sources.
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
                  Across all {cdcTestingConfig.locations.length} states,
                  compared with continued funding
                </span>
              </caption>
              <thead className="border-y border-rule text-xs text-muted">
                <tr>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Scenario / testing recovery
                  </th>
                  <th scope="col" className="py-3 text-right font-medium">
                    Projected increase
                  </th>
                </tr>
              </thead>
              <tbody>
                {publishedScenarios.map((scenario) => (
                  <tr key={scenario.id} className="border-b border-rule">
                    <th scope="row" className="py-4 pr-4 font-medium">
                      {scenario.name}
                      <span className="mt-1 block font-normal text-muted">
                        {scenario.recovery}
                      </span>
                    </th>
                    <td className="py-4 text-right font-serif text-[2.25rem] tabular-nums text-hopkins-blue">
                      +{scenario.increase}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-5 text-sm leading-relaxed text-muted">
              Permanent cessation corresponded to 12,719 additional infections
              (95% credible interval: 4,547–21,896). Projected increases ranged
              from 2.7% in Washington to 29.9% in Louisiana.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              In the interruption scenarios, funding resumes in January 2027 or
              January 2029; testing returns to previous levels over that year.
              See the paper for methods and uncertainty intervals for each
              scenario.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="local-question-heading"
        className="border-b border-rule bg-paper"
      >
        <div className="site-container grid gap-7 py-10 sm:py-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.3fr)] lg:gap-20">
          <h2 id="local-question-heading" className="editorial-section-title">
            Different places,
            <br />
            different effects.
          </h2>
          <div>
            <p className="text-base leading-relaxed text-muted">
              Each state has its own model, informed by local HIV and testing
              data. For a state or program question beyond this study, you can
              work with our team.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <Link href="/work-with-us#contact" className="editorial-link">
                Discuss a local question <span aria-hidden="true">→</span>
              </Link>
              <Link href="/ryan-white-state-level" className="editorial-link">
                Explore disruptions to HIV care{" "}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
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
              Publication · Clinical Infectious Diseases · 2026
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
              82(4):e746–e754 · doi:10.1093/cid/ciag038
            </p>
          </div>
          <div className="space-y-7 border-t border-rule pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
            <div>
              <h3 className="text-base font-medium">
                Have a different scenario in mind?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Set the reduction in CDC-funded testing and the share of people
                who would still test without CDC funding.
              </p>
              <Link
                href="/cdc-testing/custom"
                prefetch={false}
                className="editorial-link mt-3 inline-block text-sm"
              >
                Set up a custom scenario <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div>
              <h3 className="text-base font-medium">
                Original interactive tool
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                The earlier Shiny application remains available.
              </p>
              <Link
                href="/shiny/cdc-testing"
                prefetch={false}
                className="editorial-link mt-3 inline-block text-sm"
              >
                Open the Shiny app <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
