import type { Metadata } from 'next';
import type { ReactNode } from 'react';
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

const LINK_CLASS =
  'text-hopkins-blue underline decoration-hopkins-blue/30 underline-offset-2 transition-colors hover:decoration-hopkins-blue';

interface Source {
  journal: string;
  year: string;
  href: string;
}

interface QuestionArea {
  question: string;
  description: string;
  example: string;
  sources: Source[];
  tools: { label: string; href: string }[];
}

const QUESTION_AREAS: QuestionArea[] = [
  {
    question: 'How many new HIV infections should we expect, and what would it take to reach our goals?',
    description:
      'Projections of new infections, viral suppression and the number of people living with HIV in a city or state, and how much more testing, PrEP and treatment support it would take to move toward Ending the HIV Epidemic targets.',
    example:
      'For example, in 32 large U.S. cities we found that big reductions in new infections are achievable with substantial investment, but that reaching the national goal of a 90% reduction would be difficult in most places.',
    sources: [{ journal: 'Annals of Internal Medicine', year: '2021', href: 'https://doi.org/10.7326/M21-1501' }],
    tools: [],
  },
  {
    question: 'What happens if Ryan White or CDC funding is cut or interrupted?',
    description:
      'Estimates of how many more people could acquire HIV if federal programs end or pause, and how a temporary interruption compares with a permanent loss.',
    example:
      'For example, if Ryan White services ended, we projected about 75,000 more HIV infections by 2030 across 31 large cities, an increase of about half. Ending CDC-funded HIV testing could mean about 12,700 more infections across 18 states.',
    sources: [
      { journal: 'Annals of Internal Medicine', year: '2025', href: 'https://doi.org/10.7326/ANNALS-25-01737' },
      { journal: 'Clinical Infectious Diseases', year: '2026', href: 'https://doi.org/10.1093/cid/ciag038' },
    ],
    tools: [
      { label: 'Ryan White, cities', href: '/ryan-white' },
      { label: 'Ryan White, states', href: '/ryan-white-state-level' },
      { label: 'CDC-funded testing', href: '/cdc-testing' },
    ],
  },
  {
    question: 'If a program is cut, do the savings hold, or do the costs show up later?',
    description:
      'Comparisons of the spending a cut would avoid with the added HIV care costs from the infections and diagnoses that follow.',
    example:
      'For example, our analysis of the AIDS Drug Assistance Program (ADAP) weighs avoided drug-assistance spending against later care costs across 30 states and Washington, D.C.',
    sources: [],
    tools: [{ label: 'ADAP costing', href: '/ryan-white-costing' }],
  },
  {
    question: 'How will the population of people living with HIV change over the next 15 years?',
    description:
      'Projections of the size and age of the population living with HIV, to help plan for aging-related care, workforce and services.',
    example:
      'For example, across 24 states the median age of adults with diagnosed HIV is projected to rise from 51 to 61 by 2040, with nearly half over 65. Aging will be faster in larger, more urban states.',
    sources: [
      { journal: 'JAMA Network Open', year: '2026', href: 'https://doi.org/10.1001/jamanetworkopen.2026.32299' },
    ],
    tools: [{ label: 'HIV age projections', href: '/aging' }],
  },
];

const COLLABORATION_STEPS: { title: string; description: string }[] = [
  {
    title: 'You bring the question',
    description: "Tell us the decision you're facing: a budget change, a new program or a planning target.",
  },
  {
    title: 'We tailor and run the model',
    description: 'We set up scenarios that match your question and run them for your city or state.',
  },
  {
    title: 'We share results you can use',
    description: 'Plain-language summaries, presentations for your leadership or board, and interactive tools for your staff.',
  },
];

const MODEL_STEPS: { title: string; description: string }[] = [
  {
    title: 'It learns from local data',
    description:
      'Each city or state model is adjusted until it matches what has already happened there: diagnoses, viral suppression and deaths in public surveillance data.',
  },
  {
    title: 'It tests "what if?"',
    description:
      'We change one thing at a time, like a funding cut or more testing, and compare the future with and without it.',
  },
  {
    title: 'It shows a range, not one number',
    description:
      'Every result comes from many simulations, so we report both the most likely outcome and how uncertain it is.',
  },
];

const LEADS = [
  {
    name: 'Parastu Kasaie, PhD',
    role: 'Associate Scientist',
    school: 'Johns Hopkins Bloomberg School of Public Health',
    photo: '/images/team/kasaie.jpg',
  },
  {
    name: 'Todd Fojo, MD, MHS',
    role: 'Associate Professor',
    school: 'Johns Hopkins School of Medicine',
    photo: '/images/team/fojo.jpg',
  },
];

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-balance font-serif text-[1.85rem] font-normal leading-tight text-gray-950 md:text-[2.25rem]">
      {children}
    </h2>
  );
}

function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;
  return (
    <>
      {' ('}
      {sources.map((source, i) => (
        <span key={source.href}>
          {i > 0 && '; '}
          <a href={source.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            <span className="italic">{source.journal}</span>, {source.year}
          </a>
        </span>
      ))}
      {')'}
    </>
  );
}

export default function WorkWithUsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Intro */}
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-6 pb-14 pt-16 md:pb-20 md:pt-24">
          <p className="mb-6 text-sm font-medium text-hopkins-blue">For health departments and HIV program partners</p>
          <h1 className="max-w-4xl text-balance font-serif text-[2.5rem] font-normal leading-[1.08] text-gray-950 md:text-[3.5rem]">
            We study how policy and funding decisions shape local HIV epidemics.
          </h1>
          <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-14">
            <p className="text-xl leading-relaxed text-gray-800">
              JHEEM, the Joint HIV Epidemiology and Economic Model, projects HIV trends in U.S. cities and states
              under different scenarios. It is developed by researchers at the Johns Hopkins Schools of Public
              Health and Medicine and funded by the National Institutes of Health.
            </p>
            <p className="text-base leading-relaxed text-gray-600 md:border-l md:border-gray-200 md:pl-8 md:pt-1">
              We work with health departments to turn this research into answers for local decisions, and
              we&apos;re looking for new partners. To discuss a question you&apos;re working on, email Parastu
              Kasaie at{' '}
              <a href={CONTACT_HREF} className={LINK_CLASS}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </div>
        </div>
      </header>

      {/* Questions */}
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className="max-w-2xl">
          <SectionTitle>Questions our research answers</SectionTitle>
          <p className="mt-4 text-base leading-relaxed text-gray-600">
            Our results cover individual U.S. cities and states. These are the questions we&apos;ve studied so
            far, each with an example from our published work.
          </p>
        </div>
        <div className="mt-10 border-t border-gray-200">
          {QUESTION_AREAS.map((area) => (
            <div
              key={area.question}
              className="grid gap-4 border-b border-gray-200 py-9 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14 md:py-11"
            >
              <h3 className="text-balance font-serif text-[1.4rem] leading-snug text-gray-950 md:text-[1.65rem]">
                {area.question}
              </h3>
              <div>
                <p className="text-base leading-relaxed text-gray-700">{area.description}</p>
                <p className="mt-3 text-base leading-relaxed text-gray-700">
                  {area.example}
                  <SourceList sources={area.sources} />
                </p>
                {area.tools.length > 0 && (
                  <p className="mt-4 text-sm text-gray-500">
                    Explore the results:{' '}
                    {area.tools.map((tool, i) => (
                      <span key={tool.href}>
                        {i > 0 && <span aria-hidden="true"> · </span>}
                        <Link href={tool.href} className={LINK_CLASS}>
                          {tool.label}
                        </Link>
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Collaboration */}
      <section className="border-y border-gray-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
          <div className="max-w-2xl">
            <SectionTitle>How a collaboration works</SectionTitle>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              We already work with several health departments, and we keep the work light on your side.
            </p>
          </div>
          <ol className="mt-12 grid gap-10 border-l border-hopkins-blue/20 pl-7 md:grid-cols-3 md:gap-12 md:border-l-0 md:border-t md:pl-0">
            {COLLABORATION_STEPS.map((step, i) => (
              <li key={step.title} className="relative md:pt-9">
                <span
                  aria-hidden="true"
                  className="absolute -left-[33px] top-2 h-2.5 w-2.5 rounded-full bg-hopkins-gold md:-top-[5px] md:left-0"
                />
                <p className="font-serif text-xl text-gray-950">
                  <span className="mr-2 text-hopkins-blue">{i + 1}.</span>
                  {step.title}
                </p>
                <p className="mt-3 text-base leading-relaxed text-gray-700">{step.description}</p>
              </li>
            ))}
          </ol>
          <p className="mt-14 max-w-3xl text-base leading-relaxed text-gray-700">
            What we ask of partners is local knowledge: the questions and priorities that matter to you, context
            on programs and populations that data alone can&apos;t capture, and feedback on how results are
            framed. Our models are built on publicly available data, so you don&apos;t need to share any local
            data.
          </p>
        </div>
      </section>

      {/* Model */}
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14">
          <SectionTitle>How our models work</SectionTitle>
          <p className="text-lg leading-relaxed text-gray-800 md:pt-1">
            Think of a weather forecast: it learns from past patterns, runs many possible futures and tells you
            how likely each one is. Our model does the same for HIV, one city or state at a time.
          </p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3 md:gap-12">
          {MODEL_STEPS.map((step) => (
            <div key={step.title} className="border-t border-gray-300 pt-5">
              <h3 className="font-serif text-xl text-gray-950">{step.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-gray-700">{step.description}</p>
            </div>
          ))}
        </div>
        <p className="mt-12 text-base leading-relaxed text-gray-600">
          JHEEM has been developed over several years, and its methods and results are published in peer-reviewed
          journals (
          <a href={PUBLICATIONS_URL} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            see our publications
          </a>
          ).
        </p>
      </section>

      {/* Contact */}
      <section className="border-t border-gray-200">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
          <div className="grid gap-12 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-14">
            <div>
              <SectionTitle>Get in touch</SectionTitle>
              <p className="mt-5 text-lg leading-relaxed text-gray-800">
                If your health department has a question our models could help answer, or you&apos;d simply like
                to learn more, email Parastu Kasaie at{' '}
                <a href={CONTACT_HREF} className={LINK_CLASS}>
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                A few lines about your jurisdiction and what you&apos;re working on is enough to start.
              </p>
            </div>

            <div>
              <ul className="space-y-6">
                {LEADS.map((lead) => (
                  <li key={lead.name} className="flex items-center gap-5">
                    {/* The portal serves static images directly (images.unoptimized in next.config). */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={lead.photo}
                      alt={`Portrait of ${lead.name}`}
                      width={80}
                      height={80}
                      className="h-20 w-20 flex-shrink-0 rounded-full object-cover ring-1 ring-gray-200"
                    />
                    <div>
                      <p className="font-medium text-gray-950">{lead.name}</p>
                      <p className="mt-0.5 text-sm leading-snug text-gray-600">{lead.role}</p>
                      <p className="text-sm leading-snug text-gray-600">{lead.school}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm leading-relaxed text-gray-600">
                With a team of epidemiologists, physicians and modelers (
                <a href={TEAM_URL} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                  meet the team
                </a>
                ).
              </p>
            </div>
          </div>

          <div className="mt-16 border-t border-gray-100 pt-6">
            <p className="max-w-3xl text-xs leading-relaxed text-gray-500">
              This research is supported by the National Institutes of Health (K08MH118094, K01AI138853,
              P30AI094189, R01MD018539). The content is solely the responsibility of the authors and does not
              necessarily represent the official views of the NIH. Results are model projections under stated
              assumptions, not predictions of what will happen.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
