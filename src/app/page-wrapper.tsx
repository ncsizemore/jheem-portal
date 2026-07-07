'use client';

import type { ReactNode } from "react";
import Link from "next/link";
import Footer from '@/components/Footer';

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
    citation: <><span className="italic">medRxiv</span>, 2025</>,
  },
  {
    href: "/aging",
    title: "Projecting the Age Distribution of Persons With HIV in the US",
    scope: "24 states",
    description:
      "How will the HIV population age over the next 15 years? State-level projections from 2025 to 2040.",
    citation: <span className="italic">Submitted</span>,
  },
  {
    // Not navigable yet — economic-impact analysis still in progress.
    title: "The Economic Impact of Ryan White Program Elimination: State-Level Impact Projections",
    scope: "30 states",
    description:
      "What are the economic consequences of eliminating the Ryan White program? Weighing downstream HIV care costs against the ADAP spending avoided, 2026–2035.",
    citation: <span className="italic">Working paper</span>,
    badge: "Coming soon",
  },
];

export default function HomePageWrapper({ publications }: HomePageWrapperProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-50 to-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-16">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-12 lg:gap-16 items-start">
            {/* Intro + model overview */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hopkins-blue mb-5">
                Johns Hopkins Bloomberg School of Public Health
              </p>
              <h1 className="font-serif text-5xl md:text-6xl font-normal text-gray-900 leading-[1.05] tracking-[-0.01em] mb-6">
                Joint HIV Epidemiology and Economic Model
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                JHEEM provides evidence for HIV policy decisions through calibrated
                mathematical modeling across US metropolitan areas and states.
              </p>
              <p className="text-base text-gray-600 leading-relaxed max-w-2xl">
                JHEEM uses mathematical modeling to understand and predict HIV
                transmission and the impact of interventions across local
                populations. The simulated population is stratified by age, race,
                sex, sexual behavior, and drug use, and is calibrated to real-world
                HIV surveillance data under the Ending the HIV Epidemic initiative
                &mdash; enabling projections of how policy and funding decisions may
                shape future transmission.
              </p>
              <p className="mt-6 max-w-xl border-t border-gray-100 pt-3 text-xs text-gray-400 leading-relaxed">
                <span className="font-medium text-gray-500">A note on the name:</span>{' '}
                JHEEM was previously published as the &ldquo;Johns Hopkins
                Epidemiology and Economic Model.&rdquo; The acronym is retained; the
                name was revised in 2026 to reflect use beyond a single institution.
                Citations to the prior name remain equivalent for attribution,
                reproducibility, and continuity.
              </p>
            </div>

            {/* Recent Finding */}
            <aside className="lg:pt-1">
              <div className="border-t-2 border-hopkins-gold bg-slate-50/70 p-6">
                <p className="text-xs font-semibold text-hopkins-blue uppercase tracking-[0.16em] mb-3">
                  Recent Finding
                </p>
                <p className="text-base text-gray-900 leading-snug mb-4">
                  Our models project <span className="font-semibold">12,700 additional HIV infections</span> if
                  CDC-funded testing programs end permanently across 18 states.
                </p>
                <Link
                  href="/cdc-testing"
                  className="inline-flex items-center gap-2 text-sm font-medium text-hopkins-blue hover:gap-3 transition-all"
                >
                  <span>Read the analysis</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </aside>
          </div>

          {/* Model characteristics - the "how" */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mt-16">
            {/* Population dynamics */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-hopkins-blue/5 border border-hopkins-blue/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-hopkins-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  {/* Compartmental boxes */}
                  <rect x="2" y="4" width="5" height="5" rx="0.5" />
                  <rect x="9.5" y="4" width="5" height="5" rx="0.5" />
                  <rect x="17" y="4" width="5" height="5" rx="0.5" />
                  {/* Arrows between */}
                  <path d="M7 6.5h2.5M14.5 6.5h2.5" strokeLinecap="round" />
                  {/* Population dots below */}
                  <circle cx="4.5" cy="15" r="1" fill="currentColor" stroke="none" />
                  <circle cx="7" cy="17" r="1" fill="currentColor" stroke="none" />
                  <circle cx="10" cy="15.5" r="1" fill="currentColor" stroke="none" />
                  <circle cx="12.5" cy="17.5" r="1" fill="currentColor" stroke="none" />
                  <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
                  <circle cx="18" cy="16.5" r="1" fill="currentColor" stroke="none" />
                  <circle cx="20" cy="14.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-1">Population dynamics</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Disease progression modeled across 32 metros and 30 states
                </p>
              </div>
            </div>

            {/* Scenario analysis */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-hopkins-blue/5 border border-hopkins-blue/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-hopkins-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  {/* Branching paths */}
                  <circle cx="4" cy="12" r="2" />
                  <path d="M6 12h4" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M14 11l4-4M14 13l4 4" />
                  <circle cx="20" cy="7" r="2" />
                  <circle cx="20" cy="17" r="2" />
                  {/* Dashed alternative */}
                  <path d="M14 12h6" strokeDasharray="2 2" opacity="0.5" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-1">Scenario analysis</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  What-if modeling of funding changes and interventions
                </p>
              </div>
            </div>

            {/* Time horizons */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-hopkins-blue/5 border border-hopkins-blue/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-hopkins-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  {/* Axis */}
                  <path d="M3 18h18M3 18V6" />
                  {/* Projection curve */}
                  <path d="M5 14c2-1 4-3 6-3s4 2 6 4c1 1 2 1 3 0" />
                  {/* Uncertainty band (subtle) */}
                  <path d="M5 12c2-2 4-4 6-4s4 3 6 5c1 1 2 2 3 1" opacity="0.3" />
                  <path d="M5 16c2 0 4-2 6-2s4 1 6 3c1 1 2 0 3-1" opacity="0.3" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-1">Time horizons</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Projections from immediate impacts to 2040
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Research Applications */}
      <section className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="font-serif text-3xl font-normal text-gray-900 mb-2">
            Research Applications
          </h2>
          <p className="text-gray-600 mb-10 max-w-2xl">
            Interactive tools for exploring our modeling analyses. Each application
            corresponds to peer-reviewed or preprint research.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {APPLICATIONS.map((app) => {
              const card = (
                <article
                  className={`flex h-full flex-col border border-gray-200 bg-white p-6 transition-colors ${
                    app.href ? 'hover:border-hopkins-blue/50' : ''
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-400">
                      {app.scope}
                    </span>
                    {app.badge && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 bg-amber-100 rounded px-1.5 py-0.5">
                        {app.badge}
                      </span>
                    )}
                  </div>
                  <h3
                    className={`font-serif text-xl leading-snug text-gray-900 transition-colors ${
                      app.href ? 'group-hover:text-hopkins-blue' : ''
                    }`}
                  >
                    {app.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    {app.description}
                  </p>
                  <p className="mt-auto border-t border-gray-100 pt-4 text-xs text-gray-500">
                    {app.citation}
                  </p>
                </article>
              );

              return app.href ? (
                <Link key={app.title} href={app.href} className="group block h-full">
                  {card}
                </Link>
              ) : (
                <div key={app.title} className="h-full">
                  {card}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Publications */}
      <section className="bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 mb-10">
            <div>
              <h2 className="font-serif text-3xl font-normal text-gray-900 mb-1">
                Recent Publications
              </h2>
              <p className="text-gray-600 text-sm">
                Peer-reviewed research using JHEEM
              </p>
            </div>
            <a
              href="https://jhu-comp-epi.vercel.app/publications?project=jheem"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-hopkins-blue hover:text-hopkins-spirit-blue transition-colors"
            >
              View all publications &rarr;
            </a>
          </div>

          {publications && publications.length > 0 ? (
            <div className="space-y-6">
              {publications.map((publication) => (
                <article key={publication.id} className="group">
                  <a
                    href={publication.url || `https://doi.org/${publication.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white rounded-lg p-6 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-shrink-0">
                        <span className="inline-block px-2 py-1 bg-hopkins-blue text-white text-xs font-medium rounded">
                          {publication.year}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base text-gray-900 group-hover:text-hopkins-blue transition-colors leading-snug mb-2">
                          {publication.title}
                        </h3>
                        <p className="text-sm text-gray-500 mb-1">
                          {publication.authors.split(',').slice(0, 3).join(', ')}
                          {publication.authors.split(',').length > 3 && ' et al.'}
                        </p>
                        <p className="text-sm text-hopkins-blue italic">
                          {publication.journal}
                        </p>
                        {publication.keyFindings && (
                          <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                            {publication.keyFindings}
                          </p>
                        )}
                      </div>
                    </div>
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No publications available</p>
          )}
        </div>
      </section>

      {/* Funding & support */}
      <section className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-hopkins-blue mb-3">
                Funding &amp; support
              </p>
              <h2 className="font-serif text-2xl leading-tight text-gray-900">
                Institutional support
              </h2>
            </div>
            <div>
              <p className="max-w-2xl text-base leading-relaxed text-gray-600">
                This research is supported by grants from the National Institute of
                Mental Health, the National Institute of Allergy and Infectious
                Diseases, and the National Institute on Minority Health and Health
                Disparities.
              </p>
              <ul className="mt-6 grid max-w-lg grid-cols-2 gap-x-8 gap-y-2 font-mono text-sm text-gray-500 sm:grid-cols-4 [&>li]:whitespace-nowrap">
                <li>K08MH118094</li>
                <li>K01AI138853</li>
                <li>P30-AI094189</li>
                <li>R01MD018539</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
