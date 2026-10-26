import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import CopyCitation from "@/components/study/CopyCitation";
import { ALL_CITIES } from "@/data/cities";
import { ryanWhiteConfig } from "@/config/model-configs";

export const metadata: Metadata = {
  title: "Ryan White services & local HIV outcomes | JHEEM",
  description:
    "Explore how interruptions to Ryan White services could affect HIV outcomes in 31 U.S. metropolitan areas through 2030.",
};

const paperTitle =
  "The Potential Impact of Ending the Ryan White HIV/AIDS Program on HIV Incidence: A Simulation Study in 31 U.S. Cities";
const authors =
  "Forster R, Schnure M, Jones J, Lesko C, Batey DS, Butler I, Ward D, Musgrove K, Althoff KN, Jain MK, Gebo KA, Dowdy DW, Shah M, Kasaie P, Fojo AT";
const paperUrl = "https://doi.org/10.7326/ANNALS-25-01737";
const citation = `${authors}. ${paperTitle}. Annals of Internal Medicine. 2025. doi:10.7326/ANNALS-25-01737`;
const cities = ALL_CITIES.filter((city) =>
  ryanWhiteConfig.locations.includes(city.code),
);
// Findings from the published study. These are not calculated from the portal release.
const publishedScenarios = [
  { name: "Brief interruption", gap: "18 months", increase: "19%" },
  { name: "Prolonged interruption", gap: "42 months", increase: "38%" },
  {
    name: "Permanent cessation",
    gap: "Services do not resume",
    increase: "49%",
  },
];

export default function RyanWhiteLandingPage() {
  return (
    <div className="editorial-page bg-white text-ink">
      <header className="border-b border-rule">
        <div className="site-container grid gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16 lg:py-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hopkins-blue">
              Ryan White · City-level study
            </p>
            <h1 className="editorial-title mt-5 max-w-2xl text-[2.6rem] leading-[1.08] sm:text-[3.4rem]">
              What happens if Ryan White services stop?
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              We modeled temporary interruptions and permanent loss of services
              in {cities.length} U.S. metropolitan areas. Explore how each
              scenario could affect new HIV infections and other local outcomes
              through 2030.
            </p>
            <a
              href="#local-results"
              className="editorial-link mt-5 inline-block text-sm lg:hidden"
            >
              Explore your area <span aria-hidden="true">↓</span>
            </a>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted">
              Each scenario compares disrupted services with continued Ryan
              White services. The modeled interruptions begin in July 2025.
            </p>
            <p className="mt-7 border-t border-rule pt-5 text-sm leading-relaxed text-muted">
              Forster and colleagues ·{" "}
              <cite className="not-italic">Annals of Internal Medicine</cite> ·
              2025
              <br />
              <a
                href="#publication"
                className="editorial-link mt-2 inline-block"
              >
                Publication and model evidence <span aria-hidden="true">↓</span>
              </a>
            </p>
          </div>
          <section
            id="local-results"
            aria-labelledby="local-results-heading"
            className="scroll-mt-6 self-start border-t-2 border-hopkins-blue bg-paper p-6 sm:scroll-mt-44 sm:p-8"
          >
            <h2
              id="local-results-heading"
              className="font-serif text-[2rem] leading-tight tracking-[-0.02em]"
            >
              Explore your area
            </h2>
            <p
              id="local-results-help"
              className="mt-3 text-sm leading-relaxed text-muted"
            >
              Compare new HIV infections, then explore other outcomes and
              population groups.
            </p>
            <form
              action="/ryan-white/explorer"
              method="get"
              aria-label="Explore local results"
              aria-describedby="local-results-help"
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="study-location"
                  className="mb-2 block text-sm font-medium"
                >
                  Metropolitan area
                </label>
                <select
                  id="study-location"
                  name="loc"
                  required
                  defaultValue=""
                  className="w-full min-w-0 rounded-none border border-[#9caeb8] bg-white px-3 py-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopkins-blue"
                >
                  <option value="" disabled>
                    Choose an area…
                  </option>
                  {cities.map((city) => (
                    <option key={city.code} value={city.code}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="study-scenario"
                  className="mb-2 block text-sm font-medium"
                >
                  Service interruption
                </label>
                <select
                  id="study-scenario"
                  name="scenario"
                  defaultValue="cessation"
                  className="w-full rounded-none border border-[#9caeb8] bg-white px-3 py-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopkins-blue"
                >
                  {ryanWhiteConfig.scenarios.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                      {scenario.timeline?.serviceResumeTime
                        ? `${Math.round((scenario.timeline.serviceResumeTime - scenario.timeline.serviceInterruptionStartTime) * 12)}-month interruption`
                        : "Permanent cessation"}
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
            <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 text-sm">
              <Link href="/ryan-white/explorer" className="editorial-link">
                Browse the map
              </Link>
              <a href="#coverage" className="editorial-link">
                Area not listed?
              </a>
            </div>
            <p className="mt-5 border-t border-rule pt-4 text-xs leading-relaxed text-muted">
              Interactive results use the March 2026 simulation data.{" "}
              <a href="#findings" className="editorial-link">
                Published estimates appear below.
              </a>
            </p>
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
              Interruptions in care have lasting effects.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted">
              The model estimates how losing care and support services could
              reduce viral suppression—the control of HIV through treatment—and
              increase transmission.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted">
              All three scenarios projected more new infections than continued
              services, with greater effects from longer interruptions.
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
                  Across all {cities.length} areas, compared with continued
                  services
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
                    <td className="py-4 text-right font-serif text-[2.25rem] tabular-nums text-hopkins-blue">
                      +{scenario.increase}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-5 text-sm leading-relaxed text-muted">
              Permanent cessation corresponded to 75,436 additional infections
              in the published study; increases ranged from 9% to 110% across
              individual areas. See the paper for uncertainty intervals and
              methods.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              These figures summarize the 2025 publication. Interactive results
              use the March 2026 portal release and may differ from the
              published estimates.
            </p>
          </div>
        </div>
      </section>
      <section
        id="coverage"
        aria-labelledby="coverage-heading"
        className="scroll-mt-44 border-b border-rule bg-paper"
      >
        <div className="site-container grid gap-8 py-12 sm:py-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.3fr)] lg:gap-20">
          <div>
            <h2 id="coverage-heading" className="editorial-section-title">
              Local questions,
              <br />
              local evidence.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted">
              Each metropolitan area has its own model, informed by local HIV
              and service data. A metropolitan area includes the central city
              and surrounding communities.
            </p>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium">
                Looking beyond these {cities.length} areas?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Our state-level analyses cover a different set of locations. For
                a question about your community or program, you can also work
                with our team.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                <Link href="/ryan-white-state-level" className="editorial-link">
                  Explore state-level studies <span aria-hidden="true">→</span>
                </Link>
                <Link href="/work-with-us#contact" className="editorial-link">
                  Discuss a local question <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
            <details className="border-t border-rule pt-5">
              <summary className="cursor-pointer text-sm font-medium text-hopkins-blue focus-visible:outline-2 focus-visible:outline-offset-4">
                View all {cities.length} metropolitan areas
              </summary>
              <ul className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                {cities.map((city) => (
                  <li key={city.code}>
                    <Link
                      href={`/ryan-white/explorer?loc=${city.code}&scenario=cessation`}
                      className="editorial-link leading-relaxed"
                    >
                      {city.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
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
              Publication · Annals of Internal Medicine · 2025
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
              doi:10.7326/ANNALS-25-01737
            </p>
          </div>
          <div className="space-y-7 border-t border-rule pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
            <div>
              <h3 className="text-base font-medium">
                How well does the model fit?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Compare model estimates with observed HIV and service data.
              </p>
              <Link
                href="/ryan-white/calibration"
                className="editorial-link mt-3 inline-block text-sm"
              >
                View model fit <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div>
              <h3 className="text-base font-medium">
                Have a different scenario in mind?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Specify changes in viral suppression after a permanent service
                interruption and run a custom simulation.
              </p>
              <Link
                href="/ryan-white/custom"
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
