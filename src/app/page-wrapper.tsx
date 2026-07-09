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
    citation: <><span className="italic">Clin Infect Dis</span>, 2026</>,
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
    // Not navigable yet - economic-impact analysis still in progress.
    title: "The Economic Impact of Ryan White Program Elimination: State-Level Impact Projections",
    scope: "30 states",
    description:
      "What are the economic consequences of eliminating the Ryan White program? Weighing downstream HIV care costs against the ADAP spending avoided, 2026-2035.",
    citation: <span className="italic">Working paper</span>,
    badge: "Coming soon",
  },
];

const MODEL_CHARACTERISTICS = [
  {
    title: "Local calibration",
    description: "City and state projections anchored to surveillance data",
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
        <path d="M7.5 16.5 5 19M16.5 7.5 19 5" strokeLinecap="round" opacity="0.45" />
      </svg>
    ),
  },
  {
    title: "Structured populations",
    description: "Age, race, sex, behavior, and drug-use strata represented in the model",
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3" y="4" width="7" height="6" rx="0.75" />
        <rect x="14" y="4" width="7" height="6" rx="0.75" />
        <rect x="3" y="14" width="7" height="6" rx="0.75" />
        <rect x="14" y="14" width="7" height="6" rx="0.75" />
        <path d="M10 7h4M10 17h4M6.5 10v4M17.5 10v4" strokeLinecap="round" opacity="0.5" />
      </svg>
    ),
  },
  {
    title: "Policy scenarios",
    description: "Funding, testing, and intervention assumptions compared over time",
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="4" cy="12" r="2" />
        <path d="M6 12h4" />
        <circle cx="12" cy="12" r="2" />
        <path d="M14 11l4-4M14 13l4 4" />
        <circle cx="20" cy="7" r="2" />
        <circle cx="20" cy="17" r="2" />
        <path d="M14 12h6" strokeDasharray="2 2" opacity="0.45" />
      </svg>
    ),
  },
];

function HeroEvidenceTexture() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute right-[-6rem] top-8 hidden h-[30rem] w-[43rem] opacity-75 lg:block"
      viewBox="0 0 560 390"
      fill="none"
    >
      <g opacity="0.16" stroke="#002D72" strokeWidth="0.8">
        <path d="M64 62H520M64 128H520M64 194H520M64 260H520M64 326H520" />
        <path d="M112 32V356M184 32V356M256 32V356M328 32V356M400 32V356M472 32V356" />
      </g>
      <path
        d="M74 279C124 226 178 204 232 216C277 226 299 258 342 246C397 231 414 162 471 152C509 146 535 167 552 192"
        stroke="#68ACE5"
        strokeOpacity="0.58"
        strokeWidth="1.5"
      />
      <path
        d="M70 310C121 296 174 288 227 292C286 297 329 282 382 270C428 260 481 265 548 284"
        stroke="#F2C413"
        strokeOpacity="0.58"
        strokeWidth="1.4"
        strokeDasharray="6 8"
      />
      {[
        [112, 256, "#002D72"],
        [166, 224, "#68ACE5"],
        [229, 216, "#F2C413"],
        [301, 246, "#68ACE5"],
        [372, 235, "#002D72"],
        [443, 158, "#F2C413"],
        [512, 172, "#68ACE5"],
        [486, 282, "#002D72"],
        [352, 276, "#68ACE5"],
        [214, 292, "#002D72"],
      ].map(([cx, cy, fill]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="12" fill={String(fill)} opacity="0.07" />
          <circle cx={cx} cy={cy} r="4" fill={String(fill)} opacity="0.55" />
        </g>
      ))}
    </svg>
  );
}

function RecentFinding() {
  return (
    <aside className="lg:pt-1">
      <div className="relative overflow-hidden border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-hopkins-gold" />
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-hopkins-blue">
          Recent Finding
        </p>
        <p className="mb-4 text-base leading-snug text-gray-900">
          Our models project <span className="font-semibold">12,700 additional HIV infections</span> if
          CDC-funded testing programs end permanently across 18 states.
        </p>
        <Link
          href="/cdc-testing"
          className="inline-flex items-center gap-2 text-sm font-medium text-hopkins-blue transition-all hover:gap-3"
        >
          <span>Read the analysis</span>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </aside>
  );
}

export default function HomePageWrapper({ publications }: HomePageWrapperProps) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-gray-200 bg-gradient-to-b from-[#f6f9fc] via-white to-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden opacity-80 [background-image:linear-gradient(to_right,rgba(0,45,114,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,45,114,0.035)_1px,transparent_1px)] [background-size:42px_42px] md:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 hidden h-full w-1/2 bg-[radial-gradient(circle_at_70%_20%,rgba(104,172,229,0.16),transparent_30%),radial-gradient(circle_at_78%_68%,rgba(242,196,19,0.10),transparent_28%)] lg:block"
        />
        <HeroEvidenceTexture />

        <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-14 sm:px-6 md:pb-16 md:pt-16">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
            <div className="min-w-0">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-hopkins-blue">
                Johns Hopkins Bloomberg School of Public Health
              </p>
              <h1 className="max-w-4xl break-words font-serif text-[2.85rem] font-normal leading-[1.03] text-gray-950 sm:text-5xl md:text-6xl">
                Joint HIV Epidemiology and Economic Model
              </h1>
              <p className="mt-6 max-w-2xl text-xl leading-relaxed text-gray-700">
                JHEEM provides evidence for HIV policy decisions through calibrated
                mathematical modeling across US metropolitan areas and states.
              </p>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600">
                We use mathematical modeling to understand and predict HIV
                transmission and the impact of interventions across local
                populations. The simulated population is stratified by age, race,
                sex, sexual behavior, and drug use, and is calibrated to
                real-world HIV surveillance data under the Ending the HIV Epidemic
                initiative &mdash; enabling projections of how policy and funding
                decisions may shape future transmission.
              </p>
            </div>

            <RecentFinding />
          </div>

          <div className="mt-14 max-w-5xl border border-slate-200 bg-white/78 shadow-[0_16px_44px_rgba(15,23,42,0.045)] backdrop-blur-sm">
            <div className="grid divide-y divide-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0">
              {MODEL_CHARACTERISTICS.map((item) => (
                <div key={item.title} className="flex min-w-0 items-start gap-4 p-5">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-hopkins-blue/10 bg-hopkins-blue/5 text-hopkins-blue">
                    {item.icon}
                  </div>
                  <div>
                    <p className="mb-1 font-medium text-gray-950">{item.title}</p>
                    <p className="text-sm leading-relaxed text-gray-600">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Modeling Tools */}
      <section id="analyses" className="scroll-mt-24 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 md:py-16">
          <div className="mb-9 max-w-2xl">
            <h2 className="mb-2 font-serif text-3xl font-normal text-gray-950">
              Modeling Tools
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {APPLICATIONS.map((app) => {
              const card = (
                <article
                  className={`relative flex h-full min-w-0 flex-col overflow-hidden border border-gray-200 bg-white p-5 transition-all sm:p-6 ${
                    app.href ? 'hover:-translate-y-0.5 hover:border-hopkins-blue/45 hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)]' : 'bg-slate-50/70'
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-hopkins-blue/70 opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-400">
                      {app.scope}
                    </span>
                    {app.badge && (
                      <span className="bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                        {app.badge}
                      </span>
                    )}
                  </div>
                  <h3
                    className={`font-serif text-xl leading-snug text-gray-950 transition-colors ${
                      app.href ? 'group-hover:text-hopkins-blue' : ''
                    }`}
                  >
                    {app.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    {app.description}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-4 border-t border-gray-100 pt-4 text-xs text-gray-500">
                    <p>{app.citation}</p>
                    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${app.href ? 'text-hopkins-blue' : 'text-gray-400'}`}>
                      <span>{app.href ? 'Open' : 'Preview'}</span>
                      {app.href && (
                        <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </span>
                  </div>
                </article>
              );

              return app.href ? (
                <Link key={app.title} href={app.href} className="group block h-full min-w-0">
                  {card}
                </Link>
              ) : (
                <div key={app.title} className="h-full min-w-0">
                  {card}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Publications */}
      <section id="evidence" className="scroll-mt-24 bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 md:py-16">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <h2 className="font-serif text-3xl font-normal text-gray-950">
                Recent Publications
              </h2>
            </div>
            <a
              href="https://jhu-comp-epi.vercel.app/publications?project=jheem"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-hopkins-blue transition-colors hover:text-hopkins-spirit-blue"
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
                    className="block rounded-md border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm sm:p-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="flex-shrink-0">
                        <span className="inline-block bg-hopkins-blue px-2 py-1 text-xs font-medium text-white">
                          {publication.year}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-2 text-base leading-snug text-gray-900 transition-colors group-hover:text-hopkins-blue">
                          {publication.title}
                        </h3>
                        <p className="mb-1 text-sm text-gray-500">
                          {publication.authors.split(',').slice(0, 3).join(', ')}
                          {publication.authors.split(',').length > 3 && ' et al.'}
                        </p>
                        <p className="text-sm italic text-hopkins-blue">
                          {publication.journal}
                        </p>
                        {publication.keyFindings && (
                          <p className="mt-3 text-sm leading-relaxed text-gray-600">
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
      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-hopkins-blue">
                Funding &amp; support
              </p>
              <h2 className="font-serif text-2xl leading-tight text-gray-950">
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
              <p className="mt-6 max-w-2xl border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-500">
                <span className="font-medium text-gray-600">A note on the name:</span>{' '}
                JHEEM was previously published as the &ldquo;Johns Hopkins
                Epidemiology and Economic Model.&rdquo; The acronym is retained; the
                name was revised in 2026 to reflect use beyond a single institution.
                Citations to the prior name remain equivalent for attribution,
                reproducibility, and continuity.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
