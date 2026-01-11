'use client';

import { useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';

export default function RyanWhiteLandingPage() {
  const [citationCopied, setCitationCopied] = useState(false);

  const handleCopyCitation = async () => {
    const citation = 'Forster R, Schnure M, Jones J, Lesko C, Batey DS, Butler I, Ward D, Musgrove K, Althoff KN, Jain MK, Gebo KA, Dowdy DW, Shah M, Kasaie P, Fojo AT. The Potential Impact of Ending the Ryan White HIV/AIDS Program on HIV Incidence: A Simulation Study in 31 U.S. Cities. Annals of Internal Medicine. 2025. doi:10.7326/ANNALS-25-01737';

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

  const cities = [
    'Atlanta', 'Baltimore', 'Baton Rouge', 'Birmingham', 'Boston', 'Charlotte',
    'Chicago', 'Dallas', 'Denver', 'Detroit', 'Fort Lauderdale', 'Houston',
    'Jacksonville', 'Las Vegas', 'Los Angeles', 'Memphis', 'Miami', 'New Orleans',
    'New York', 'Newark', 'Oakland', 'Orlando', 'Philadelphia', 'Phoenix',
    'Riverside', 'San Antonio', 'San Diego', 'San Francisco', 'San Juan',
    'Tampa', 'Washington DC'
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Publication Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 pt-16 pb-12">
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
            <span className="font-medium text-gray-900">Annals of Internal Medicine</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>2025</span>
          </div>
          <h1 className="text-3xl md:text-[2.5rem] md:leading-tight font-normal text-gray-900 leading-tight mb-6">
            The Potential Impact of Ending the Ryan White HIV/AIDS Program on HIV Incidence: A Simulation Study in 31 U.S. Cities
          </h1>
          <p className="text-gray-500 leading-relaxed mb-8">
            Forster R, Schnure M, Jones J, Lesko C, Batey DS, Butler I, Ward D,
            Musgrove K, Althoff KN, Jain MK, Gebo KA, Dowdy DW, Shah M, Kasaie P, Fojo AT
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="https://doi.org/10.7326/ANNALS-25-01737"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
            >
              Read Paper
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
            <span className="font-semibold">75,436 additional HIV infections</span>{' '}
            by 2030—a 49% increase across 31 U.S. metropolitan areas.
          </p>
          <p className="text-gray-600 leading-relaxed max-w-2xl mb-6">
            The Ryan White Program is the nation&apos;s largest HIV-specific care program,
            serving as the payer of last resort for over 500,000 people annually.
            With effective treatment, people with HIV live normal lifespans and
            cannot transmit the virus.
          </p>
          <p className="text-sm text-gray-500">
            See also:{' '}
            <Link href="/ryan-white-state-level" className="text-hopkins-blue hover:underline">
              State-level analysis of 11 states
            </Link>
            {' '}(companion study)
          </p>
        </div>
      </section>

      {/* Tools */}
      <section className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/ryan-white/explorer"
              className="group flex items-center justify-between p-5 bg-white border border-gray-200 rounded-lg hover:border-hopkins-blue hover:shadow-md transition-all"
            >
              <div>
                <p className="font-medium text-gray-900 group-hover:text-hopkins-blue transition-colors">
                  Interactive Map
                </p>
                <p className="text-sm text-gray-500">
                  Explore prerun scenarios by city
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-hopkins-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/shiny/ryan-white-custom"
              className="group flex items-center justify-between p-5 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-md transition-all"
            >
              <div>
                <p className="font-medium text-gray-900">
                  Custom Scenarios
                </p>
                <p className="text-sm text-gray-500">
                  Define your own funding parameters
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
            different policy outcomes would affect HIV transmission.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-light text-gray-900">18</span>
                <span className="text-sm text-gray-500">months</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Brief Interruption</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Funding gap followed by program restoration.
                Projected impact: <span className="font-medium text-gray-900">+19%</span> new infections by 2030.
              </p>
            </div>

            <div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-light text-gray-900">42</span>
                <span className="text-sm text-gray-500">months</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Prolonged Interruption</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Extended gap before services resume.
                Projected impact: <span className="font-medium text-gray-900">+38%</span> new infections by 2030.
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
                Projected impact: <span className="font-medium text-red-800">+49%</span> (75,436 excess infections).
                City-level range: 9% to 110%.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cities */}
      <section className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Metropolitan Areas Studied
          </h2>
          <p className="text-gray-600 mb-8">
            City-specific epidemic models capturing local patterns in HIV prevalence,
            care engagement, and Ryan White service utilization.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-8 gap-y-2">
            {cities.map((city) => (
              <span key={city} className="text-sm text-gray-600 py-1">
                {city}
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
                Forster R, et al. The Potential Impact of Ending the Ryan White HIV/AIDS
                Program on HIV Incidence: A Simulation Study in 31 U.S. Cities.{' '}
                <em>Ann Intern Med.</em> 2025.{' '}
                <a
                  href="https://doi.org/10.7326/ANNALS-25-01737"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hopkins-blue hover:underline"
                >
                  doi:10.7326/ANNALS-25-01737
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
