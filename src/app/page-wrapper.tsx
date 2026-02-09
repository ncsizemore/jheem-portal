'use client';

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

export default function HomePageWrapper({ publications }: HomePageWrapperProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-50 to-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-16">
          {/* Main hero content */}
          <div className="max-w-3xl mb-16">
            <p className="text-sm font-medium text-hopkins-blue tracking-wide mb-4">
              Johns Hopkins Bloomberg School of Public Health
            </p>
            <h1 className="text-4xl md:text-5xl font-normal text-gray-900 leading-tight mb-6">
              The Johns Hopkins Epidemiological and Economic Model
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              JHEEM provides evidence for HIV policy decisions through calibrated
              mathematical modeling across US metropolitan areas and states.
            </p>
          </div>

          {/* Model characteristics - the "how" */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl">
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
                  Disease progression modeled across 32 metros and 31 states
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

      {/* Key Finding Highlight */}
      <section className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12 bg-amber-50/50 rounded-lg p-6 border border-amber-100">
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                Recent Finding
              </p>
              <p className="text-lg md:text-xl text-gray-900 leading-snug">
                Our models project <span className="font-semibold">12,700 additional HIV infections</span> if
                CDC-funded testing programs end permanently across 18 states.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link
                href="/cdc-testing"
                className="inline-flex items-center gap-2 text-sm font-medium text-amber-800 hover:text-amber-900 transition-colors"
              >
                <span>Read the analysis</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Research Applications */}
      <section className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-normal text-gray-900 mb-2">
            Research Applications
          </h2>
          <p className="text-gray-600 mb-10 max-w-2xl">
            Interactive tools for exploring our modeling analyses. Each application
            corresponds to peer-reviewed or preprint research.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Ryan White - City Level */}
            <Link href="/ryan-white" className="group block">
              <article className="h-full p-6 bg-white border border-gray-200 rounded-lg hover:border-hopkins-blue/50 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-hopkins-blue transition-colors">
                    Ryan White Program: City-Level
                  </h3>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-3">31 cities</span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  What happens if Ryan White funding is interrupted or eliminated?
                  Modeling impacts on HIV care outcomes across major US metropolitan areas.
                </p>
                <p className="text-xs text-gray-500">
                  <span className="italic">Ann Intern Med</span>, 2025
                </p>
              </article>
            </Link>

            {/* Ryan White - State Level */}
            <Link href="/ryan-white-state-level" className="group block">
              <article className="h-full p-6 bg-white border border-gray-200 rounded-lg hover:border-hopkins-blue/50 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-hopkins-blue transition-colors">
                    Ryan White Program: State-Level
                  </h3>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-3">30 states</span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Statewide projections of Ryan White funding disruption,
                  providing jurisdictional insights for policy makers.
                </p>
                <p className="text-xs text-gray-500">
                  <span className="italic">AJPH</span>, 2026 &middot; <span className="italic">CROI</span>, 2026
                </p>
              </article>
            </Link>

            {/* CDC Testing */}
            <Link href="/cdc-testing" className="group block">
              <article className="h-full p-6 bg-white border border-gray-200 rounded-lg hover:border-hopkins-blue/50 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-hopkins-blue transition-colors">
                    CDC-Funded HIV Testing
                  </h3>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-3">18 states</span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  What is the epidemiological impact of ending CDC-funded testing?
                  Modeling cessation and interruption scenarios.
                </p>
                <p className="text-xs text-gray-500">
                  <span className="italic">medRxiv</span>, 2025
                </p>
              </article>
            </Link>

            {/* HIV Age Projections */}
            <Link href="/aging" className="group block">
              <article className="h-full p-6 bg-white border border-gray-200 rounded-lg hover:border-hopkins-blue/50 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-hopkins-blue transition-colors">
                    HIV Age Distribution Projections
                  </h3>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-3">24 states</span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  How will the HIV population age over the next 15 years?
                  State-level projections from 2025 to 2040.
                </p>
                <p className="text-xs text-gray-500 italic">
                  Submitted
                </p>
              </article>
            </Link>
          </div>
        </div>
      </section>

      {/* Publications */}
      <section className="bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl font-normal text-gray-900 mb-1">
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

      <Footer />
    </div>
  );
}
