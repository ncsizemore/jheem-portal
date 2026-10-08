import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Work With Us | JHEEM Portal',
  description:
    'JHEEM projects how policy and funding decisions shape local HIV epidemics. We work with health departments to answer local planning questions using publicly available data.',
  // Live but unlinked while the team reviews it. Remove when the page is linked from the site.
  robots: { index: false, follow: false },
};

// Until a shared team inbox exists, collaboration requests go to Parastu.
const CONTACT_EMAIL = 'pkasaie@jhu.edu';
const CONTACT_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Collaborating with JHEEM')}`;
const TEAM_URL = 'https://cipher-epi.vercel.app/team';
const PUBLICATIONS_URL = 'https://cipher-epi.vercel.app/publications?project=jheem';

interface QuestionArea {
  topic: string;
  question: string;
  description: string;
  example: string;
  sources: { label: string; href: string }[];
  tools: { label: string; href: string }[];
}

const QUESTION_AREAS: QuestionArea[] = [
  {
    topic: 'Local projections and goals',
    question: 'How many new HIV infections should we expect, and what would it take to reach our goals?',
    description:
      'Projections of new infections, viral suppression and the number of people living with HIV in your city or state, and how much more testing, PrEP and treatment support it would take to move toward Ending the HIV Epidemic targets.',
    example:
      'In 32 large U.S. cities, we found that big reductions in new infections are achievable with substantial investment, but that reaching the national goal of a 90% reduction would be difficult in most places.',
    sources: [{ label: 'Annals of Internal Medicine, 2021', href: 'https://doi.org/10.7326/M21-1501' }],
    tools: [],
  },
  {
    topic: 'Funding changes',
    question: 'What happens if Ryan White or CDC funding is cut or interrupted?',
    description:
      'Estimates of how many more people could acquire HIV if federal programs end or pause, and how a temporary interruption compares with a permanent loss.',
    example:
      'If Ryan White services ended, we projected about 75,000 more HIV infections by 2030 across 31 large cities, an increase of about half. Ending CDC-funded HIV testing could mean about 12,700 more infections across 18 states.',
    sources: [
      { label: 'Annals of Internal Medicine, 2025', href: 'https://doi.org/10.7326/ANNALS-25-01737' },
      { label: 'Clinical Infectious Diseases, 2026', href: 'https://doi.org/10.1093/cid/ciag038' },
    ],
    tools: [
      { label: 'Ryan White: cities', href: '/ryan-white' },
      { label: 'Ryan White: states', href: '/ryan-white-state-level' },
      { label: 'CDC-funded testing', href: '/cdc-testing' },
    ],
  },
  {
    topic: 'Costs',
    question: 'If a program is cut, do the savings hold, or do the costs show up later?',
    description:
      'Comparisons of the spending a cut would avoid with the added HIV care costs from the infections and diagnoses that follow.',
    example:
      'Our analysis of the AIDS Drug Assistance Program (ADAP) weighs avoided drug-assistance spending against later care costs across 30 states and Washington, D.C.',
    sources: [],
    tools: [{ label: 'ADAP costing', href: '/ryan-white-costing' }],
  },
  {
    topic: 'An aging population',
    question: 'How will the population of people living with HIV change over the next 15 years?',
    description:
      'Projections of the size and age of the population living with HIV, to help plan for aging-related care, workforce and services.',
    example:
      'Across 24 states, the median age of adults with diagnosed HIV is projected to rise from 51 to 61 by 2040, with nearly half over 65. Aging will be faster in larger, more urban states.',
    sources: [
      { label: 'JAMA Network Open, 2026', href: 'https://doi.org/10.1001/jamanetworkopen.2026.32299' },
    ],
    tools: [{ label: 'HIV age projections', href: '/aging' }],
  },
];

const COLLABORATION_STEPS = [
  {
    title: 'You bring the question',
    description: "Tell us the decision you're facing: a budget change, a new program or a planning target.",
  },
  {
    title: 'We tailor and run the model',
    description: 'We set up the scenarios that match your question and run them for your city or state.',
  },
  {
    title: 'You get results you can use',
    description: 'Plain-language summaries, presentations for your leadership or board, and interactive tools your staff can explore.',
  },
];

const PARTNER_CONTRIBUTIONS = [
  'The local questions and priorities that shape the analysis',
  "Context on programs, populations and policy that data alone can't capture",
  'Feedback on how results are framed and presented',
];

const TEAM_CONTRIBUTIONS = [
  'Analyses adapted to your jurisdiction and its questions',
  'Plain-language summaries and interactive tools',
  'Openly published methods, assumptions and uncertainty',
];

const MODEL_STEPS = [
  {
    title: 'Learns from local data',
    description:
      'Each city or state model is adjusted until it matches what has already happened there: diagnoses, viral suppression and deaths in public surveillance data.',
  },
  {
    title: 'Tests "what if?"',
    description:
      'We change one thing at a time, like a funding cut or more testing, and compare the future with and without it.',
  },
  {
    title: 'Shows a range, not one number',
    description:
      'Every result comes from many simulations, so we report both the most likely outcome and how uncertain it is.',
  },
];

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-gray-700">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-hopkins-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionHeading({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="mb-10 max-w-2xl">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-hopkins-blue">{eyebrow}</p>
      <h2 className="font-serif text-3xl font-normal leading-tight text-gray-950 md:text-[2.25rem]">{title}</h2>
      {intro && <p className="mt-4 text-base leading-relaxed text-gray-600">{intro}</p>}
    </div>
  );
}

export default function WorkWithUsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Intro */}
      <section className="relative overflow-hidden border-b border-gray-200 bg-gradient-to-b from-[#f6f9fc] via-white to-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden opacity-80 [background-image:linear-gradient(to_right,rgba(0,45,114,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,45,114,0.035)_1px,transparent_1px)] [background-size:42px_42px] md:block"
        />
        <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-14 sm:px-6 md:pb-16 md:pt-16">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-16">
            <div className="min-w-0">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-hopkins-blue">
                For health departments and HIV program partners
              </p>
              <h1 className="max-w-3xl font-serif text-[2.5rem] font-normal leading-[1.06] text-gray-950 sm:text-5xl md:text-[3.4rem]">
                We study how policy and funding decisions shape local HIV epidemics.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-700">
                JHEEM, the Joint HIV Epidemiology and Economic Model, projects HIV trends in U.S. cities and
                states under different scenarios. It is developed by researchers at the Johns Hopkins Schools
                of Public Health and Medicine and funded by the National Institutes of Health.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600">
                We work with health departments to turn this research into answers for local decisions, and
                we&apos;re looking for new partners.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href={CONTACT_HREF}
                  className="inline-flex items-center gap-2 bg-hopkins-blue px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-hopkins-blue/90"
                >
                  Get in touch
                  <ArrowIcon />
                </a>
                <a
                  href="#collaboration"
                  className="inline-flex items-center gap-2 text-sm font-medium text-hopkins-blue transition-all hover:gap-3"
                >
                  How a collaboration works
                  <ArrowIcon />
                </a>
              </div>
            </div>

            <aside className="relative overflow-hidden border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
              <div className="absolute inset-x-0 top-0 h-1 bg-hopkins-gold" />
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-hopkins-blue">
                What partners receive
              </p>
              <CheckList
                items={[
                  'Analyses built around your question and your jurisdiction',
                  'Plain-language summaries and presentations for leadership',
                  'Interactive tools your staff can explore',
                ]}
              />
              <p className="mt-5 border-t border-gray-100 pt-4 text-sm leading-relaxed text-gray-600">
                Our models use publicly available data, so working with us doesn&apos;t require sharing
                local data.
              </p>
            </aside>
          </div>
        </div>
      </section>

      {/* Questions */}
      <section id="questions" className="scroll-mt-24 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 md:py-16">
          <SectionHeading
            eyebrow="What we can help with"
            title="Questions our research answers"
            intro="Results are available for individual cities and states. Here is what we've looked at so far, and an example from each."
          />
          <div className="grid gap-5 md:grid-cols-2">
            {QUESTION_AREAS.map((area) => (
              <article key={area.topic} className="flex min-w-0 flex-col border border-gray-200 bg-white p-6">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-gray-400">{area.topic}</p>
                <h3 className="font-serif text-xl leading-snug text-gray-950">&ldquo;{area.question}&rdquo;</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{area.description}</p>

                <div className="mt-5 border-l-2 border-hopkins-gold bg-slate-50 px-4 py-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-hopkins-blue">
                    From our research
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800">{area.example}</p>
                  {area.sources.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      {area.sources.map((source, i) => (
                        <span key={source.href}>
                          {i > 0 && ' · '}
                          <a
                            href={source.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="italic hover:text-hopkins-blue hover:underline"
                          >
                            {source.label}
                          </a>
                        </span>
                      ))}
                    </p>
                  )}
                </div>

                {area.tools.length > 0 && (
                  <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-5">
                    {area.tools.map((tool) => (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-hopkins-blue transition-all hover:gap-2.5"
                      >
                        {tool.label}
                        <ArrowIcon />
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Collaboration */}
      <section id="collaboration" className="scroll-mt-24 border-b border-gray-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 md:py-16">
          <SectionHeading
            eyebrow="Working with us"
            title="How a collaboration works"
            intro="We already work with several health departments. Collaborating is designed to take little of your team's time."
          />
          <ol className="grid gap-5 md:grid-cols-3">
            {COLLABORATION_STEPS.map((step, i) => (
              <li key={step.title} className="border border-gray-200 bg-white p-6">
                <span className="font-serif text-3xl text-hopkins-gold">{i + 1}</span>
                <h3 className="mt-2 font-medium text-gray-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.description}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 grid gap-8 border-t border-gray-200 pt-10 md:grid-cols-2">
            <div>
              <h3 className="mb-4 font-medium text-gray-950">What partners contribute</h3>
              <CheckList items={PARTNER_CONTRIBUTIONS} />
            </div>
            <div>
              <h3 className="mb-4 font-medium text-gray-950">What we contribute</h3>
              <CheckList items={TEAM_CONTRIBUTIONS} />
            </div>
          </div>
        </div>
      </section>

      {/* Model */}
      <section id="model" className="scroll-mt-24 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 md:py-16">
          <SectionHeading
            eyebrow="How our models work"
            title="A forecast for HIV, built one city and state at a time"
            intro="Think of a weather forecast: it learns from past patterns, runs many possible futures and tells you how likely each one is. Our models do the same for HIV."
          />
          <div className="grid gap-8 md:grid-cols-3">
            {MODEL_STEPS.map((step) => (
              <div key={step.title} className="border-t-2 border-hopkins-blue/15 pt-5">
                <h3 className="font-medium text-gray-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 max-w-3xl text-sm leading-relaxed text-gray-600">
            JHEEM has been developed and refined over several years, and its methods and results are published
            in peer-reviewed journals.{' '}
            <a
              href={PUBLICATIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-hopkins-blue hover:underline"
            >
              See our publications &rarr;
            </a>
          </p>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-16">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-hopkins-blue">Get in touch</p>
              <h2 className="font-serif text-3xl font-normal leading-tight text-gray-950 md:text-[2.25rem]">
                Have a question our models could help answer?
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600">
                Whether you have a specific decision in front of you or just want to learn more, we&apos;d like
                to hear from you. A short email describing your jurisdiction and what you&apos;re working on is
                a great place to start.
              </p>
              <a
                href={CONTACT_HREF}
                className="mt-7 inline-flex items-center gap-2 bg-hopkins-blue px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-hopkins-blue/90"
              >
                Email {CONTACT_EMAIL}
                <ArrowIcon />
              </a>
            </div>

            <div className="border border-gray-200 bg-white p-6">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-hopkins-blue">Who you&apos;ll work with</p>
              <ul className="space-y-4">
                <li>
                  <p className="font-medium text-gray-950">Parastu Kasaie, PhD</p>
                  <p className="text-sm text-gray-600">Associate Scientist, Johns Hopkins Bloomberg School of Public Health</p>
                </li>
                <li>
                  <p className="font-medium text-gray-950">Todd Fojo, MD, MHS</p>
                  <p className="text-sm text-gray-600">Associate Professor, Johns Hopkins School of Medicine</p>
                </li>
              </ul>
              <p className="mt-5 border-t border-gray-100 pt-4 text-sm leading-relaxed text-gray-600">
                Together with a team of epidemiologists, physicians and modelers.{' '}
                <a
                  href={TEAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-hopkins-blue hover:underline"
                >
                  Meet the team &rarr;
                </a>
              </p>
            </div>
          </div>

          <p className="mt-14 max-w-3xl border-t border-gray-100 pt-6 text-xs leading-relaxed text-gray-500">
            This research is supported by the National Institutes of Health (K08MH118094, K01AI138853,
            P30AI094189, R01MD018539). The content is solely the responsibility of the authors and does not
            necessarily represent the official views of the NIH. Results are model projections under stated
            assumptions, not predictions of what will happen.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
