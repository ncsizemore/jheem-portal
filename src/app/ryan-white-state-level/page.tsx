'use client';

import { useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';

export default function RyanWhiteStateLevelPage() {
  const [citationCopied, setCitationCopied] = useState(false);

  const handleCopyCitation = async () => {
    const citation = 'Schnure M, Forster R, Jones JL, Lesko CR, Batey DS, Butler I, Ward D, Musgrove K, Althoff KN, Jain MK, Gebo KA, Dowdy DW, Shah M, Kasaie P, Fojo AT. HIV Incidence Could Rise by 68% in 11 States if Ryan White Ends: A Simulation Study. medRxiv. 2025. doi:10.1101/2025.07.31.25332525';

    try {
      await navigator.clipboard.writeText(citation);
      setCitationCopied(true);
      setTimeout(() => setCitationCopied(false), 2000);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to copy citation:', error);
      }
      alert('Unable to copy to clipboard. Please select and copy the citation manually.');
    }
  };

  const states = [
    'Alabama', 'California', 'Florida', 'Georgia', 'Illinois', 'Louisiana',
    'Mississippi', 'Missouri', 'New York', 'Texas', 'Wisconsin'
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Publication Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 pt-16 pb-12">
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
            <span className="font-medium text-gray-900">AJPH</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>Forthcoming 2026</span>
          </div>
          <h1 className="text-3xl md:text-[2.5rem] md:leading-tight font-normal text-gray-900 leading-tight mb-6">
            HIV Incidence Could Rise by 68% in 11 States if Ryan White Ends: A Simulation Study
          </h1>
          <p className="text-gray-500 leading-relaxed mb-8">
            Schnure M, Forster R, Jones JL, Lesko CR, Batey DS, Butler I, Ward D,
            Musgrove K, Althoff KN, Jain MK, Gebo KA, Dowdy DW, Shah M, Kasaie P, Fojo AT
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="https://doi.org/10.1101/2025.07.31.25332525"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
            >
              Read Preprint
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <button
              onClick={handleCopyCitation}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                citationCopied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {citationCopied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Cite
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Key Finding */}
      <section className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <p className="text-2xl md:text-[1.75rem] md:leading-snug font-light text-gray-900 leading-snug mb-6 max-w-3xl">
            If the Ryan White HIV/AIDS Program ends permanently,
            we project{' '}
            <span className="font-semibold">69,695 additional HIV infections</span>{' '}
            by 2030—a 68% increase across 11 U.S. states representing 63% of all people diagnosed with HIV.
          </p>
          <p className="text-gray-600 leading-relaxed max-w-2xl">
            This state-level analysis complements our city-level study, using the same
            validated HIV transmission model to project impacts across entire state populations.
            State-level variation is substantial, ranging from a 45% increase in Texas to 126% in Missouri.
          </p>
        </div>
      </section>

      {/* Tools */}
      <section className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              href="/ryan-white-state-level/explorer/ajph"
              className="group flex items-center justify-between p-5 bg-white border border-gray-200 rounded-lg hover:border-hopkins-blue hover:shadow-md transition-all"
            >
              <div>
                <p className="font-medium text-gray-900 group-hover:text-hopkins-blue transition-colors">
                  AJPH Explorer
                </p>
                <p className="text-sm text-gray-500">
                  11 states · 2026 paper
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-hopkins-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/ryan-white-state-level/explorer/croi"
              className="group flex items-center justify-between p-5 bg-white border border-gray-200 rounded-lg hover:border-hopkins-blue hover:shadow-md transition-all"
            >
              <div>
                <p className="font-medium text-gray-900 group-hover:text-hopkins-blue transition-colors">
                  CROI Explorer
                </p>
                <p className="text-sm text-gray-500">
                  30 states · 2026 conference
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-hopkins-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/ryan-white"
              className="group flex items-center justify-between p-5 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-md transition-all"
            >
              <div>
                <p className="font-medium text-gray-900">
                  City-Level Analysis
                </p>
                <p className="text-sm text-gray-500">
                  31-city MSA study
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Scenarios */}
      <section className="border-b border-gray-200 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Policy Scenarios Modeled
          </h2>
          <p className="text-gray-600 mb-10 max-w-2xl">
            We simulated three funding disruption scenarios starting July 2025 to understand how
            different policy outcomes would affect HIV transmission through 2030.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-light text-gray-900">1.5</span>
                <span className="text-sm text-gray-500">years</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Brief Interruption</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Services resume January 2027.
                Projected impact: <span className="font-medium text-gray-900">+26%</span> new infections (26,951 additional).
              </p>
            </div>

            <div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-light text-gray-900">3.5</span>
                <span className="text-sm text-gray-500">years</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Prolonged Interruption</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Services resume January 2029.
                Projected impact: <span className="font-medium text-gray-900">+52%</span> new infections (53,594 additional).
              </p>
            </div>

            <div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-light text-red-800">∞</span>
                <span className="text-sm text-gray-500">permanent</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Complete Cessation</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Program ends with no recovery.
                Projected impact: <span className="font-medium text-red-800">+68%</span> (69,695 excess infections).
                State range: 45% to 126%.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* States */}
      <section className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            States Studied
          </h2>
          <p className="text-gray-600 mb-8">
            These 11 states represent 63% of all people diagnosed with HIV in the United States,
            selected for geographic diversity, Medicaid expansion status, and Ending the HIV Epidemic prioritization.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-8 gap-y-3">
            {states.map((state) => (
              <span key={state} className="text-sm text-gray-600 py-1">
                {state}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-6">
            <span className="font-medium">Highest projected impact:</span> Missouri (+126%), Alabama (+111%), Wisconsin (+108%), Illinois (+101%)
          </p>
        </div>
      </section>

      {/* Citation - Compact */}
      <section className="bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                Full Citation
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Schnure M, et al. HIV Incidence Could Rise by 68% in 11 States if Ryan White Ends:
                A Simulation Study. <em>AJPH.</em> Forthcoming 2026.{' '}
                <a
                  href="https://doi.org/10.1101/2025.07.31.25332525"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hopkins-blue hover:underline"
                >
                  Preprint: doi:10.1101/2025.07.31.25332525
                </a>
              </p>
            </div>
            <button
              onClick={handleCopyCitation}
              className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                citationCopied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {citationCopied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Full Citation
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
