import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import CopyCitation from '@/components/study/CopyCitation';
import AgingExplorer from '@/components/aging/AgingExplorer';
import AgingEvidence from '@/components/aging/AgingEvidence';
import ErrorBoundary from '@/components/ErrorBoundary';
import './aging.css';

export const metadata: Metadata = {
  title: 'Aging with HIV: state projections | JHEEM',
  description:
    'Explore projected age distributions among people with diagnosed HIV in 24 U.S. states from 2025 to 2040, by state and population group.',
};
const paperUrl = 'https://doi.org/10.1001/jamanetworkopen.2026.32299';
const authors =
  'Zalesak A, Kasaie P, Dansky Z, Althoff KN, Dowdy DW, Shah M, Fojo AT, Schnure M';
const title = 'Projected Aging Among People With HIV in the US';
const citation = `${authors}. ${title}. JAMA Netw Open. 2026;9(9):e2632299. doi:10.1001/jamanetworkopen.2026.32299`;
export default function AgingPage() {
  return (
    <div className="editorial-page aging-page bg-white text-ink">
      <header className="border-b border-rule">
        <div className="site-container grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hopkins-blue">
              Aging with HIV · 24-state study
            </p>
            <h1 className="editorial-title mt-5 text-[2.6rem] leading-[1.08] sm:text-[3.4rem]">
              Planning for an aging population with HIV.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              The population with diagnosed HIV is projected to grow older, with
              different patterns across states. Explore how age distributions
              could change from 2025 to 2040.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <a className="editorial-link" href="#projections">
                Explore the projections <span aria-hidden="true">↓</span>
              </a>
              <a className="editorial-link" href="#publication">
                Publication and methods <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
          <aside
            aria-label="Findings from the published study"
            className="self-center border-l-2 border-hopkins-blue pl-6"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              From the published study
            </p>
            <p className="mt-4 font-serif text-[2.5rem] leading-tight text-hopkins-blue">
              51 → 61 <span className="font-sans text-base">years</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Projected median age, 2025 to 2040.
              <br />
              By 2040, 46% were projected to be older than 65.
            </p>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Across 24 states representing 86% of people with diagnosed HIV in
              the U.S. These are model projections, with uncertainty described
              in the{' '}
              <a
                className="editorial-link"
                href={paperUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                published paper
              </a>
              .
            </p>
          </aside>
        </div>
      </header>
      <section
        id="projections"
        aria-labelledby="projections-heading"
        className="scroll-mt-6 border-b border-rule sm:scroll-mt-28"
      >
        <div className="site-container py-10 sm:py-12">
          <div className="mb-6">
            <h2 id="projections-heading" className="editorial-section-title">
              Explore the changing age profile
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
              Start with a state comparison, then explore population groups. The
              charts show people with diagnosed HIV in five age groups, from
              13–24 to 55 and older.
            </p>
          </div>
          <ErrorBoundary>
            <AgingExplorer />
          </ErrorBoundary>
        </div>
      </section>
      <section
        id="publication"
        aria-labelledby="publication-heading"
        className="scroll-mt-6 sm:scroll-mt-28"
      >
        <div className="site-container py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)] lg:gap-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Publication · JAMA Network Open · 2026
              </p>
              <h2
                id="publication-heading"
                className="mt-4 font-serif text-2xl leading-snug sm:text-[1.875rem]"
              >
                {title}
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
                9(9):e2632299 · doi:10.1001/jamanetworkopen.2026.32299
              </p>
            </div>
            <div className="border-t border-rule pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
              <h3 className="text-base font-medium">
                Reading these projections
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                The interactive charts use the portal’s five age groups.
                Percentages are calculated from the median count in each group;
                they are not medians of simulation-level percentages.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                The paper’s median-age and over-65 estimates use additional
                age-distribution analysis. They cannot be read directly from the
                55+ bars.
              </p>
              <Link
                href="/work-with-us#contact"
                className="editorial-link mt-4 inline-block text-sm"
              >
                Discuss a local planning question{' '}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <div className="mt-10">
            <h3 className="font-serif text-2xl">
              How well does the model fit?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Compare estimates with observed HIV data before interpreting the
              projections.
            </p>
            <ErrorBoundary>
              <AgingEvidence />
            </ErrorBoundary>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
