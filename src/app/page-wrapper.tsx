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

export default function HomePageWrapper({ publications }: HomePageWrapperProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white border-b border-gray-200">
        <div className="relative mx-auto max-w-6xl px-5 py-12 sm:px-6 md:py-16">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
            <div className="min-w-0">
              <h1 className="max-w-4xl break-words font-serif text-[2.65rem] font-normal leading-[1.02] text-gray-950 sm:text-5xl md:text-6xl">
                Explore HIV policy scenarios across U.S. cities and states.
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
                <Link
                  href="/cdc-testing"
                  className="inline-flex items-center justify-center gap-2 bg-hopkins-blue px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#123f7d]"
                >
                  <span>Open CDC testing model</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M9 7h8v8" />
                  </svg>
                </Link>
                <a
                  href="#analyses"
                  className="inline-flex items-center justify-center border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-hopkins-blue transition-colors hover:border-hopkins-blue/50 hover:bg-hopkins-blue/5"
                >
                  Browse modeling tools
                </a>
              </div>
            </div>

            <aside className="min-w-0 lg:pt-1">
              <div className="border border-gray-200 border-t-2 border-t-hopkins-gold bg-white p-5 shadow-sm sm:p-6">
                <p className="text-sm font-semibold text-hopkins-blue">
                  CDC-funded testing cessation
                </p>
                <div className="mt-5 border-y border-gray-100 py-5">
                  <p className="font-serif text-5xl leading-none text-gray-950">
                    12,700
                  </p>
                  <p className="mt-2 text-base font-medium leading-snug text-gray-900">
                    additional HIV infections projected across 18 states.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    Permanent program ending scenario.
                  </p>
                </div>

                <svg
                  className="mt-5 h-auto w-full text-hopkins-blue"
                  viewBox="0 0 320 118"
                  fill="none"
                  role="img"
                  aria-label="Compact scenario chart showing modeled increase under testing cessation"
                >
                  <path d="M10 91H304" stroke="#E5E7EB" />
                  <path d="M10 61H304" stroke="#E5E7EB" />
                  <path d="M10 31H304" stroke="#E5E7EB" />
                  <path d="M22 86C64 84 98 78 128 66C165 51 188 39 224 34C254 30 279 23 303 13" stroke="#002D72" strokeWidth="2.5" />
                  <path d="M22 92C64 90 98 87 128 82C165 76 188 72 224 69C254 66 279 62 303 57" stroke="#F2C413" strokeWidth="2" strokeDasharray="6 7" />
                  <path d="M22 86C64 84 98 78 128 66C165 51 188 39 224 34C254 30 279 23 303 13V58C279 63 254 67 224 70C188 74 165 78 128 84C98 89 64 91 22 93V86Z" fill="#002D72" opacity="0.08" />
                  <circle cx="303" cy="13" r="4.5" fill="#002D72" />
                  <circle cx="303" cy="57" r="4" fill="#F2C413" />
                </svg>

                <p className="mt-5">
                  <Link
                    href="/cdc-testing"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-hopkins-blue transition-all hover:gap-3"
                  >
                    <span>Open CDC testing model</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Modeling tools */}
      <section id="analyses" className="scroll-mt-24 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 md:py-16">
          <div className="mb-10 max-w-3xl">
            <div>
              <h2 className="font-serif text-3xl font-normal leading-tight text-gray-950 md:text-4xl">
                Choose a policy question.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600">
                Inspect modeled outcomes by place, scenario, and time horizon.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {APPLICATIONS.map((app) => {
              const card = (
                <article
                  className={`flex h-full min-w-0 flex-col border border-gray-200 bg-white p-5 transition-colors sm:p-6 ${
                    app.href ? 'hover:border-hopkins-blue/50' : 'bg-slate-50/60'
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
                      <span className="mr-2 whitespace-nowrap font-serif text-3xl leading-none text-gray-950">
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
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 md:py-16">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <h2 className="font-serif text-3xl font-normal leading-tight text-gray-950 md:text-4xl">
                Publications behind the portal.
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600">
                Recent peer-reviewed and submitted research using JHEEM. Portal
                tools should be read alongside the assumptions and methods in the
                corresponding papers.
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
                Model notes
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
