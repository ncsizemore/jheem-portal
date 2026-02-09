'use client';

import { useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';

export default function CdcTestingLandingPage() {
  const [citationCopied, setCitationCopied] = useState(false);

  const handleCopyCitation = async () => {
    const citation = 'Balasubramanian R, Schnure M, Forster R, Hanage WP, Batey DS, Althoff KN, Gebo KA, Dowdy DW, Shah M, Kasaie P, Fojo AT. The Potential Effect of Ending CDC Funding for HIV Tests: A Modeling Study in 18 States. medRxiv. 2025. doi:10.1101/2025.09.19.25336182';

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
    'Alabama', 'Arizona', 'California', 'Florida', 'Georgia', 'Illinois',
    'Kentucky', 'Louisiana', 'Maryland', 'Mississippi', 'Missouri', 'New York',
    'Ohio', 'South Carolina', 'Tennessee', 'Texas', 'Washington', 'Wisconsin'
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Publication Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 pt-16 pb-12">
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
            <span className="font-medium text-gray-900">medRxiv</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>2025</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span className="text-amber-600 font-medium">Preprint</span>
          </div>
          <h1 className="text-3xl md:text-[2.5rem] md:leading-tight font-normal text-gray-900 leading-tight mb-6">
            The Potential Effect of Ending CDC Funding for HIV Tests: A Modeling Study in 18 States
          </h1>
          <p className="text-gray-500 leading-relaxed mb-8">
            Balasubramanian R, Schnure M, Forster R, Hanage WP, Batey DS,
            Althoff KN, Gebo KA, Dowdy DW, Shah M, Kasaie P, Fojo AT
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="https://doi.org/10.1101/2025.09.19.25336182"
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
            If CDC-funded HIV testing ends permanently,
            we project{' '}
            <span className="font-semibold">12,719 additional HIV infections</span>{' '}
            by 2030—a 10% increase across 18 U.S. states.
          </p>
          <p className="text-gray-600 leading-relaxed max-w-2xl mb-6">
            CDC-funded HIV testing is a cornerstone of the national HIV prevention strategy,
            enabling early diagnosis and linkage to care. Testing identifies infections before
            transmission can occur, and people who know their status can access treatment that
            prevents onward transmission.
          </p>
          <p className="text-sm text-gray-500">
            Related:{' '}
            <Link href="/ryan-white" className="text-hopkins-blue hover:underline">
              Ryan White Program analysis
            </Link>
            {' '}(HIV care and treatment funding)
          </p>
        </div>
      </section>

      {/* Tools */}
      <section className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/cdc-testing/explorer"
              className="group flex items-center justify-between p-5 bg-white border border-gray-200 rounded-lg hover:border-hopkins-blue hover:shadow-md transition-all"
            >
              <div>
                <p className="font-medium text-gray-900 group-hover:text-hopkins-blue transition-colors">
                  Interactive Map
                </p>
                <p className="text-sm text-gray-500">
                  Explore prerun scenarios by state
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-hopkins-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/shiny/cdc-testing"
              className="group flex items-center justify-between p-5 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-md transition-all"
            >
              <div>
                <p className="font-medium text-gray-900">
                  Legacy Shiny App
                </p>
                <p className="text-sm text-gray-500">
                  Original interactive tool
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
            We simulated three funding disruption scenarios to understand how
            different policy outcomes would affect HIV diagnosis and transmission.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-light text-gray-900">15</span>
                <span className="text-sm text-gray-500">months</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Brief Interruption</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Funding ends October 2025, resumes by end of 2027.
                Allows time for alternative funding arrangements.
              </p>
            </div>

            <div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-light text-gray-900">39</span>
                <span className="text-sm text-gray-500">months</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Prolonged Interruption</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Funding ends October 2025, resumes by end of 2029.
                Extended gap with eventual program restoration.
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
                Projected impact: <span className="font-medium text-red-800">+10%</span> infections (12,719 excess).
                State range: 3% to 30%.
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
            State-specific epidemic models capturing local patterns in HIV prevalence,
            testing rates, and CDC-funded testing program utilization.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-8 gap-y-2">
            {states.map((state) => (
              <span key={state} className="text-sm text-gray-600 py-1">
                {state}
              </span>
            ))}
          </div>
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
                Balasubramanian R, et al. The Potential Effect of Ending CDC Funding
                for HIV Tests: A Modeling Study in 18 States.{' '}
                <em>medRxiv.</em> 2025.{' '}
                <a
                  href="https://doi.org/10.1101/2025.09.19.25336182"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hopkins-blue hover:underline"
                >
                  doi:10.1101/2025.09.19.25336182
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
