import type { ReactNode } from "react";
import Link from "next/link";
import Footer from '@/components/Footer';
import { PUBLICATIONS_URL } from '@/lib/site';

interface Publication {
  id: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  doi?: string;
  url?: string;
  keyFindings?: string;
}

interface HomePageWrapperProps {
  publications: Publication[];
}

interface Application {
  // Omit href for analyses that aren't navigable yet (shown as a preview card).
  href?: string;
  title: string;
  scope: string;
  description: string;
  citation: ReactNode;
  badge?: string;
}

const APPLICATIONS: Application[] = [
  {
    href: "/ryan-white",
    title: "Ryan White Program Disruptions: City-Level Impact Projections",
    scope: "31 cities",
    description:
      "What happens if Ryan White funding is interrupted or eliminated? Modeling impacts on HIV care outcomes across major US metropolitan areas.",
    citation: <><span className="italic">Ann Intern Med</span>, 2025</>,
  },
  {
    href: "/ryan-white-state-level",
    title: "Ryan White Program Disruptions: State-Level Impact Projections",
    scope: "30 states",
    description:
      "Statewide projections of Ryan White funding disruption, providing jurisdictional insights for policy makers.",
    citation: <><span className="italic">AJPH</span>, 2026 &middot; <span className="italic">CROI</span>, 2026</>,
  },
  {
    href: "/cdc-testing",
    title: "CDC-Funded HIV Testing Disruptions: State-Level Impact Projections",
    scope: "18 states",
    description:
      "What is the epidemiological impact of ending CDC-funded testing? Modeling cessation and interruption scenarios.",
    citation: <><span className="italic">Clin Infect Dis</span>, 2026</>,
  },
  {
    href: "/aging",
    title: "Projecting the Age Distribution of Persons With HIV in the US",
    scope: "24 states",
    description:
      "How will the HIV population age over the next 15 years? State-level projections from 2025 to 2040.",
    citation: <><span className="italic">JAMA Netw Open</span>, 2026</>,
  },
  {
    href: "/ryan-white-costing",
    title: "The Economic Impact of ADAP Elimination: State-Level Projections",
    scope: "30 states + DC",
    description:
      "What are the economic and epidemiological consequences of ending ADAP? Compare downstream HIV care costs with program spending avoided through 2035.",
    citation: <span className="italic">Working paper</span>,
  },
];

const MODEL_CHARACTERISTICS = [
  { title: 'Local calibration', description: 'City and state projections anchored to surveillance data' },
  { title: 'Structured populations', description: 'Age, race, sex, behavior, and drug-use strata represented in the model' },
  { title: 'Policy scenarios', description: 'Funding, testing, and intervention assumptions compared over time' },
];

export default function HomePageWrapper({ publications }: HomePageWrapperProps) {
  return (
    <div className="editorial-page bg-white text-ink">
      <section className="border-b border-rule">
        <div className="site-container pb-12 pt-12 md:pb-14 md:pt-18">
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.14em] text-hopkins-blue">HIV policy &amp; population health</p>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-20">
            <div>
              <h1 className="editorial-title max-w-3xl text-[2.75rem] leading-[1.04] sm:text-[3.5rem] lg:text-[3.8rem]">
                Joint HIV Epidemiology and Economic Model
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-[1.65] text-muted sm:text-xl">
                JHEEM provides evidence for HIV policy decisions through calibrated
                mathematical modeling across US metropolitan areas and states.
              </p>
              <div className="mt-7 flex flex-wrap gap-x-7 gap-y-2 text-sm font-medium">
                <Link href="#analyses" className="editorial-link inline-flex min-h-11 items-center gap-3">Explore the tools <span aria-hidden="true">→</span></Link>
                <Link href="/work-with-us" className="editorial-link inline-flex min-h-11 items-center gap-3">Work with us <span aria-hidden="true">→</span></Link>
              </div>
            </div>
            <aside className="self-end border-t border-rule pt-6 lg:mb-3 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.12em] text-muted">From our research</p>
              <p className="font-serif text-[1.65rem] leading-[1.3]">
                Our models project 12,700 additional HIV infections if CDC-funded testing programs end permanently across 18 states.
              </p>
              <Link href="/cdc-testing" className="editorial-link mt-4 inline-flex min-h-11 items-center gap-3 text-sm">Read the analysis <span aria-hidden="true">→</span></Link>
            </aside>
          </div>
          <dl className="mt-12 grid gap-6 border-t border-rule pt-7 md:mt-14 md:grid-cols-3 md:gap-12">
            {MODEL_CHARACTERISTICS.map((item) => (
              <div key={item.title}>
                <dt className="text-sm font-medium">{item.title}</dt>
                <dd className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{item.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="analyses" aria-labelledby="tools-heading" className="scroll-mt-8">
        <div className="site-container py-14 md:py-20">
          <div className="mb-9 flex flex-col gap-4 md:flex-row md:items-baseline md:justify-between">
            <h2 id="tools-heading" className="editorial-section-title">Modeling tools</h2>
            <p className="text-sm leading-relaxed text-muted">Explore projections for your city or state.</p>
          </div>
          <div className="grid gap-x-14 md:grid-cols-2">
            {APPLICATIONS.map((app, index) => {
              const titleId = `analysis-title-${index}`;
              const analysis = (
                <article className="flex h-full min-w-0 flex-col border-t border-rule pb-8 pt-6">
                  <div className="mb-3 flex items-center gap-3 text-xs text-muted">
                    <span>{app.scope}</span>
                    {app.badge && <span>{app.badge}</span>}
                  </div>
                  <h3 id={titleId} className="max-w-lg font-serif text-[1.5rem] leading-[1.22] transition-colors group-hover:text-hopkins-blue">{app.title}</h3>
                  <p className="mb-6 mt-3 max-w-lg text-sm leading-relaxed text-muted">{app.description}</p>
                  <div className="mt-auto flex items-baseline justify-between gap-5 text-xs text-muted">
                    <p>{app.citation}</p>
                    <span className="shrink-0 text-sm text-hopkins-blue group-hover:underline">{app.href ? 'Explore' : 'Preview'} {app.href && <span aria-hidden="true">↗</span>}</span>
                  </div>
                </article>
              );
              return app.href ? (
                <Link key={app.title} href={app.href} aria-labelledby={titleId} className="group block min-w-0">{analysis}</Link>
              ) : <div key={app.title}>{analysis}</div>;
            })}
          </div>
        </div>
      </section>

      <section id="evidence" aria-labelledby="publications-heading" className="scroll-mt-8 border-y border-rule bg-paper">
        <div className="site-container py-14 md:py-18">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 id="publications-heading" className="editorial-section-title">Recent publications</h2>
            <a href={PUBLICATIONS_URL} className="editorial-link text-sm">View all publications <span aria-hidden="true">↗</span></a>
          </div>
          {publications.length > 0 ? (
            <div className="divide-y divide-rule border-t border-rule">
              {publications.map((publication) => (
                <article key={publication.id} className="py-7">
                  <a href={publication.url || `https://doi.org/${publication.doi}`} target="_blank" rel="noopener noreferrer" className="group grid gap-3 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-8">
                    <span className="pt-1 text-sm text-muted">{publication.year}</span>
                    <div>
                      <h3 className="max-w-4xl font-serif text-2xl leading-snug group-hover:text-hopkins-blue">{publication.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted">
                        {publication.authors.split(',').slice(0, 3).join(', ')}
                        {publication.authors.split(',').length > 3 && ' et al.'}
                        <span className="mx-2" aria-hidden="true">·</span>
                        <span className="italic">{publication.journal}</span>
                      </p>
                      {publication.keyFindings && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">{publication.keyFindings}</p>}
                    </div>
                  </a>
                </article>
              ))}
            </div>
          ) : <p className="text-muted">Find our published research on the <a href={PUBLICATIONS_URL} className="editorial-link">CIPHER Lab website</a>.</p>}
        </div>
      </section>

      <section aria-labelledby="about-heading">
        <div className="site-container py-14 md:py-18">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
            <h2 id="about-heading" className="editorial-section-title">About the model</h2>
            <div className="max-w-3xl">
              <p className="text-base leading-relaxed text-muted">
                We use mathematical modeling to understand and predict HIV transmission and the impact of interventions across local populations.
                The simulated population is stratified by age, race, sex, sexual behavior, and drug use, and is calibrated to real-world HIV surveillance
                data under the Ending the HIV Epidemic initiative—enabling projections of how policy and funding decisions may shape future transmission.
              </p>
              <h3 className="mt-8 text-sm font-medium">Funding &amp; support</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                This research is supported by grants from the National Institute of Mental Health, the National Institute of Allergy and Infectious
                Diseases, and the National Institute on Minority Health and Health Disparities.
              </p>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
                <li>K08MH118094</li><li>K01AI138853</li><li>P30-AI094189</li><li>R01MD018539</li>
              </ul>
              <p className="mt-7 border-t border-rule pt-5 text-xs leading-relaxed text-muted">
                <span className="font-medium text-ink">A note on the name:</span>{' '}
                JHEEM was previously published as the “Johns Hopkins Epidemiology and Economic Model.” The acronym is retained; the name was revised in 2026
                to reflect use beyond a single institution. Citations to the prior name remain equivalent for attribution, reproducibility, and continuity.
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
