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
  question: string;
  geography: string;
  scenario: string;
  metric: string;
  metricLabel: string;
  description: string;
  citation: ReactNode;
  badge?: string;
}

const APPLICATIONS: Application[] = [
  {
    href: "/ryan-white",
    title: "Ryan White disruption projections",
    question: "What if Ryan White HIV/AIDS Program funding ends?",
    geography: "31 cities",
    scenario: "Program cessation",
    metric: "79,153",
    metricLabel: "additional infections projected",
    description:
      "Explore projected HIV care and transmission impacts across high-burden metropolitan areas.",
    citation: <><span className="italic">Ann Intern Med</span>, 2025</>,
  },
  {
    href: "/ryan-white-state-level",
    title: "Ryan White state-level projections",
    question: "How do funding disruptions vary by state?",
    geography: "30 states",
    scenario: "Program cessation",
    metric: "2026-2031",
    metricLabel: "projection horizon",
    description:
      "Compare jurisdiction-level impacts for statewide planning, policy, and resource-allocation questions.",
    citation: <><span className="italic">AJPH</span>, 2026 &middot; <span className="italic">CROI</span>, 2026</>,
  },
  {
    href: "/cdc-testing",
    title: "CDC-funded HIV testing projections",
    question: "What if CDC-funded HIV testing programs end?",
    geography: "18 states",
    scenario: "Testing cessation",
    metric: "12,700",
    metricLabel: "additional infections projected",
    description:
      "Inspect modeled consequences of ending or interrupting CDC-funded HIV testing services.",
    citation: <><span className="italic">Clin Infect Dis</span>, 2026</>,
  },
  {
    href: "/aging",
    title: "HIV population aging projections",
    question: "How will the population of people with HIV age?",
    geography: "24 states",
    scenario: "Demographic projection",
    metric: "2040",
    metricLabel: "projection horizon",
    description:
      "Explore how age distributions among people with HIV are projected to change over time.",
    citation: <span className="italic">Submitted</span>,
  },
  {
    // Not navigable yet - economic-impact analysis still in progress.
    title: "Ryan White economic impact projections",
    question: "What are the economic consequences of eliminating the program?",
    geography: "30 states",
    scenario: "Program elimination",
    metric: "2026-2035",
    metricLabel: "economic horizon",
    description:
      "Weigh downstream HIV care costs against ADAP spending avoided under elimination scenarios.",
    citation: <span className="italic">Working paper</span>,
    badge: "Coming soon",
  },
];

const HERO_STATS = [
  { value: "31", label: "metros" },
  { value: "30", label: "state analyses" },
  { value: "2040", label: "longest horizon" },
];

function HeroEvidencePanel() {
  return (
    <aside className="min-w-0 lg:pt-1">
      <figure className="overflow-hidden border border-gray-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
        <div className="bg-[#061321] p-5 text-white sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#9eeaf0]">
                CDC-funded testing cessation
              </p>
              <p className="mt-2 max-w-[18rem] text-sm leading-relaxed text-white/68">
                Permanent program ending scenario across 18 states.
              </p>
            </div>
            <span className="border border-white/15 px-2 py-1 font-mono text-[0.64rem] uppercase tracking-[0.16em] text-white/58">
              2026
            </span>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)] lg:grid-cols-1">
            <div>
              <p className="font-serif text-5xl leading-none text-white">
                12,700
              </p>
              <p className="mt-2 text-sm font-medium leading-snug text-white/78">
                additional HIV infections projected
              </p>
            </div>

            <svg
              className="h-auto w-full"
              viewBox="0 0 360 188"
              fill="none"
              role="img"
              aria-label="Map-like data field with city and state model signals"
            >
              <rect width="360" height="188" fill="#061321" />
              <g opacity="0.18" stroke="#9eeaf0" strokeWidth="0.8">
                <path d="M14 35H346M14 75H346M14 115H346M14 155H346" />
                <path d="M48 16V172M98 16V172M148 16V172M198 16V172M248 16V172M298 16V172" />
              </g>
              <path
                d="M38 126C62 92 89 72 122 76C146 79 161 98 186 93C215 86 224 50 258 47C284 45 306 64 329 86"
                stroke="#9eeaf0"
                strokeOpacity="0.72"
                strokeWidth="1.4"
              />
              <path
                d="M37 141C69 134 93 126 124 121C158 115 190 118 220 106C250 94 283 93 327 101"
                stroke="#F2C413"
                strokeOpacity="0.9"
                strokeWidth="1.5"
                strokeDasharray="5 7"
              />
              <path
                d="M52 112C87 74 128 54 170 60C217 66 240 38 286 51C304 56 320 68 334 83V128C300 118 265 120 232 130C187 144 147 133 106 139C79 143 58 151 39 160L52 112Z"
                fill="#9eeaf0"
                opacity="0.08"
              />
              {[
                [62, 120, 6, "#9eeaf0"],
                [92, 97, 4, "#9eeaf0"],
                [126, 82, 5, "#F2C413"],
                [165, 90, 4, "#9eeaf0"],
                [203, 88, 6, "#9eeaf0"],
                [238, 62, 5, "#F2C413"],
                [285, 58, 4, "#9eeaf0"],
                [319, 84, 5, "#9eeaf0"],
                [264, 118, 4, "#9eeaf0"],
                [214, 134, 4, "#F2C413"],
                [142, 129, 3.5, "#9eeaf0"],
                [83, 145, 3.5, "#9eeaf0"],
              ].map(([cx, cy, r, fill]) => (
                <g key={`${cx}-${cy}`}>
                  <circle cx={cx} cy={cy} r={Number(r) + 6} fill={String(fill)} opacity="0.09" />
                  <circle cx={cx} cy={cy} r={r} fill={String(fill)} stroke="#061321" strokeWidth="1.5" />
                </g>
              ))}
              <g transform="translate(28 24)">
                <path d="M0 0H82V28H0Z" fill="#0B2436" stroke="#24485A" />
                <text x="10" y="12" fill="#9eeaf0" fontSize="8" fontFamily="ui-monospace, monospace" letterSpacing="1">
                  STATES
                </text>
                <text x="10" y="23" fill="#FFFFFF" fillOpacity="0.82" fontSize="10" fontFamily="system-ui, sans-serif">
                  modeled signal
                </text>
              </g>
            </svg>
          </div>
        </div>

        <figcaption className="flex items-center justify-between gap-4 border-t border-gray-200 bg-white px-5 py-4 sm:px-6">
          <p className="text-sm leading-snug text-gray-600">
            Latest result in the portal.
          </p>
          <Link
            href="/cdc-testing"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-hopkins-blue transition-all hover:gap-3"
          >
            <span>Open result</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </figcaption>
      </figure>
    </aside>
  );
}

export default function HomePageWrapper({ publications }: HomePageWrapperProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-gray-200 bg-[#f8fbfd]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden opacity-70 [background-image:linear-gradient(to_right,rgba(0,45,114,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,45,114,0.04)_1px,transparent_1px)] [background-size:42px_42px] md:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-white"
        />
        <div className="relative mx-auto max-w-6xl px-5 py-12 sm:px-6 md:py-16">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
            <div className="min-w-0">
              <h1 className="max-w-4xl break-words font-serif text-[2.75rem] font-normal leading-[1.01] text-gray-950 sm:text-5xl md:text-6xl">
                HIV policy scenarios, translated into local projections.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-700 md:text-xl">
                Compare JHEEM-based projections of how funding and policy changes
                could affect HIV transmission, care outcomes, costs, and
                population health needs.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600">
                Each tool is tied to a published, submitted, or in-progress
                analysis and calibrated to local epidemic data.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#analyses"
                  className="inline-flex items-center justify-center gap-2 bg-hopkins-blue px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#123f7d]"
                >
                  <span>Browse analyses</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M9 7h8v8" />
                  </svg>
                </a>
                <a
                  href="#evidence"
                  className="inline-flex items-center justify-center border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-hopkins-blue transition-colors hover:border-hopkins-blue/50 hover:bg-hopkins-blue/5"
                >
                  Published evidence
                </a>
              </div>

              <dl className="mt-10 grid max-w-2xl grid-cols-3 border-y border-gray-200 bg-white/50">
                {HERO_STATS.map((item) => (
                  <div key={item.label} className="border-r border-gray-200 px-4 py-4 last:border-r-0 first:pl-0 sm:first:pl-4">
                    <dt className="font-serif text-3xl leading-none text-gray-950">{item.value}</dt>
                    <dd className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-gray-500">
                      {item.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <HeroEvidencePanel />
          </div>
        </div>
      </section>

      {/* Modeling tools */}
      <section id="analyses" className="scroll-mt-24 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 md:py-16">
          <div className="mb-10 max-w-3xl">
            <div>
              <h2 className="font-serif text-3xl font-normal leading-tight text-gray-950 md:text-4xl">
                Funding interruptions, testing disruptions, and population change.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600">
                Open an analysis to compare modeled outcomes by place, scenario,
                and time horizon.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {APPLICATIONS.map((app) => {
              const card = (
                <article
                  className={`flex h-full min-w-0 flex-col border border-gray-200 bg-white p-5 transition-all sm:p-6 ${
                    app.href ? 'hover:-translate-y-0.5 hover:border-hopkins-blue/50 hover:shadow-[0_18px_44px_rgba(15,23,42,0.08)]' : 'bg-slate-50/60'
                  }`}
                >
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400">
                      {app.geography}
                    </span>
                    <span className="text-gray-300" aria-hidden="true">/</span>
                    <span className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400">
                      {app.scenario}
                    </span>
                    {app.badge && (
                      <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-amber-800 bg-amber-100 px-1.5 py-0.5">
                        {app.badge}
                      </span>
                    )}
                  </div>
                  <h3
                    className={`font-serif text-2xl leading-tight text-gray-950 transition-colors ${
                      app.href ? 'group-hover:text-hopkins-blue' : ''
                    }`}
                  >
                    {app.title}
                  </h3>
                  <p className="mt-3 text-base font-medium leading-snug text-gray-800">
                    {app.question}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    {app.description}
                  </p>
                  <div className="mt-6 border-y border-gray-100 py-4">
                    <p className="text-sm leading-snug text-gray-500">
                      <span className="mr-2 whitespace-nowrap font-serif text-[2rem] leading-none text-gray-950">
                        {app.metric}
                      </span>
                      {app.metricLabel}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-4 pt-4 text-xs text-gray-500">
                    <p>{app.citation}</p>
                    <span className={`text-sm font-semibold ${app.href ? 'text-hopkins-blue' : 'text-gray-400'}`}>
                      {app.href ? 'Open' : 'Preview'}
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
      <section id="evidence" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 md:py-16">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <h2 className="font-serif text-3xl font-normal leading-tight text-gray-950 md:text-4xl">
                Published analyses and assumptions.
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600">
                Portal tools should be read alongside the papers that define each
                scenario, calibration target, and modeled time horizon.
              </p>
            </div>
            <a
              href="https://jhu-comp-epi.vercel.app/publications?project=jheem"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-hopkins-blue transition-colors hover:text-hopkins-spirit-blue"
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
                    className="block border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm sm:p-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-shrink-0">
                        <span className="inline-block bg-hopkins-blue px-2 py-1 text-xs font-medium text-white">
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

      {/* About and support */}
      <section className="border-t border-gray-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <div>
              <h2 className="font-serif text-2xl leading-tight text-gray-950">
                Scenario estimates, not forecasts.
              </h2>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <div>
                <h3 className="font-medium text-gray-950">
                  Interpreting projections
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  JHEEM estimates what the model projects under specified
                  assumptions. Results should be read with the scenario
                  definitions, calibration data, and time horizons in each
                  analysis.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-950">
                  Name continuity
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  JHEEM was previously published as the &ldquo;Johns Hopkins
                  Epidemiology and Economic Model.&rdquo; The acronym is retained;
                  the name was revised in 2026 to reflect use beyond a single
                  institution. Citations to the prior name remain equivalent for
                  attribution, reproducibility, and continuity.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-950">
                  Support
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  This research is supported by grants from the National Institute
                  of Mental Health, the National Institute of Allergy and
                  Infectious Diseases, and the National Institute on Minority
                  Health and Health Disparities.
                </p>
                <ul className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 font-mono text-xs text-gray-500 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 [&>li]:whitespace-nowrap">
                  <li>K08MH118094</li>
                  <li>K01AI138853</li>
                  <li>P30-AI094189</li>
                  <li>R01MD018539</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
