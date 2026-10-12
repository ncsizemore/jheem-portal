import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import CopyEmailButton from './CopyEmailButton';
import FuturesIllustration from './FuturesIllustration';

export const metadata: Metadata = {
  title: 'Work With Us | JHEEM Portal',
  description:
    'Work with JHEEM to explore local HIV policy and planning questions. We collaborate with public health partners using publicly available data; no modeling expertise is needed.',
  // Live but unlinked while the team reviews it. Remove when the page is linked from the site.
  robots: { index: false, follow: false },
};

// Until a shared team inbox exists, collaboration requests go to Parastu.
const CONTACT_EMAIL = 'pkasaie@jhu.edu';
const CONTACT_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Collaborating with JHEEM')}`;
const TEAM_URL = 'https://cipher-epi.vercel.app/team';
const PUBLICATIONS_URL = 'https://cipher-epi.vercel.app/publications?project=jheem';

const LINK_CLASS =
  'text-hopkins-blue underline decoration-hopkins-blue/30 underline-offset-4 transition-colors hover:decoration-hopkins-blue focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hopkins-blue';
const SECTION_TITLE_CLASS =
  'text-balance font-serif text-[2rem] font-normal leading-[1.15] text-gray-950 md:text-[2.5rem]';

// Keep the questions close to the team's original language. Detailed findings live
// in the linked research and tools, so this page can focus on potential collaborations.
const QUESTION_AREAS = [
  {
    question: 'How many new HIV infections should we expect?',
    description:
      'Projections of new infections, viral suppression and the number of people living with HIV, under current trends or alternative scenarios.',
  },
  {
    question: 'What mix of testing, treatment and PrEP would it take to reach our goals?',
    description:
      'Comparisons of interventions and the scale needed to move local infections toward Ending the HIV Epidemic targets.',
  },
  {
    question: 'What happens if Ryan White or CDC funding is cut or interrupted?',
    description:
      'Estimates of additional infections if federal HIV programs end or pause, and how a shorter interruption compares with permanent loss.',
  },
  {
    question: 'Does a budget cut save money, or cost more later?',
    description:
      'Comparisons of program spending today with the future care costs it may prevent, to inform how resources are allocated.',
  },
  {
    question: 'How will the population of people living with HIV change over the next 15 years?',
    description:
      'Projections of the size and age of the population living with HIV, to support planning for aging-related care, workforce and services.',
  },
];

const COLLABORATION_STEPS = [
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

const PARTNER_CONTRIBUTIONS = [
  'The local questions and priorities that shape our analyses',
  "Context on programs, populations and policy that data alone can't capture",
  'Feedback on how results are framed and presented',
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

export default function WorkWithUsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200 bg-[#f7f9fc]">
        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <p className="mb-5 text-sm font-medium text-hopkins-blue">For public health and HIV program partners</p>
          <h1 className="max-w-4xl text-balance font-serif text-[2.25rem] font-normal leading-[1.08] text-gray-950 sm:text-[3rem] lg:text-[3.5rem]">
            We study how policy and funding decisions shape local HIV epidemics.
          </h1>
          <div className="mt-9 grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-lg leading-relaxed text-gray-700">
                JHEEM, the Joint HIV Epidemiology and Economic Model, projects HIV trends in U.S. cities
                and states under different scenarios.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-gray-700">
                We work with public health partners to make this research useful for local decisions,
                and we&apos;re looking for new collaborators.
              </p>
              <p className="mt-6 border-l-2 border-hopkins-gold pl-4 text-base font-medium leading-relaxed text-gray-950">
                You don&apos;t need modeling expertise or local data to work with us.
              </p>
              <a href="#contact" className={`mt-5 inline-flex min-h-11 items-center gap-3 font-medium ${LINK_CLASS}`}>
                Get in touch <span aria-hidden="true">→</span>
              </a>
              <p className="mt-5 max-w-lg text-sm leading-relaxed text-gray-600">
                Developed by researchers at the Johns Hopkins Schools of Public Health and Medicine.
                Funded by the National Institutes of Health.
              </p>
            </div>
            <figure className="mx-auto w-full max-w-xl border-t border-gray-200 pt-7 lg:border-t-0 lg:pt-0">
              <FuturesIllustration />
              <figcaption className="mt-4 max-w-lg text-sm leading-relaxed text-gray-600">
                Like a weather forecast, our models use past data to explore possible futures. Shaded
                bands show a range of likely outcomes, not a prediction of exactly what will happen.
              </figcaption>
            </figure>
          </div>
        </div>
      </header>

      <section aria-labelledby="questions-heading" className="mx-auto max-w-6xl px-6 py-14 md:py-20">
        <h2 id="questions-heading" className={SECTION_TITLE_CLASS}>What we can help you answer</h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600">
          We study questions like these at the city and state level.
        </p>
        <ul className="mt-9 border-t border-gray-300">
          {QUESTION_AREAS.map((area) => (
            <li
              key={area.question}
              className="grid gap-2 border-b border-gray-200 py-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16"
            >
              <h3 className="text-balance font-serif text-xl font-normal leading-snug text-gray-950 md:text-[1.4rem]">
                {area.question}
              </h3>
              <p className="text-base leading-relaxed text-gray-600 md:pt-1">{area.description}</p>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-x-7 gap-y-1 text-sm">
          <Link href="/#analyses" className={`inline-flex min-h-11 items-center ${LINK_CLASS}`}>
            Explore our modeling tools
          </Link>
          <a href={PUBLICATIONS_URL} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center ${LINK_CLASS}`}>
            Read our published research
          </a>
        </div>
      </section>

      <section aria-labelledby="collaboration-heading" className="border-y border-gray-200 bg-[#f7f9fc]">
        <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
          <h2 id="collaboration-heading" className={SECTION_TITLE_CLASS}>How a collaboration works</h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600">
            We already work with several health departments. A collaboration usually looks like this.
          </p>
          <ol className="mt-9 grid gap-7 md:grid-cols-3 md:gap-10">
            {COLLABORATION_STEPS.map((step, i) => (
              <li key={step.title} className="border-t border-hopkins-blue/25 pt-5">
                <h3 className="font-serif text-xl font-normal leading-snug text-gray-950">
                  <span aria-hidden="true" className="mr-2 text-hopkins-blue">
                    {i + 1}.
                  </span>
                  {step.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-gray-700">{step.description}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 grid gap-5 border-t border-gray-200 pt-8 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
            <div>
              <h3 className="font-serif text-xl font-normal text-gray-950">What partners contribute</h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-gray-600">
                Our models are built on publicly available data. Your local knowledge helps us put it in context.
              </p>
            </div>
            <ul className="space-y-3 text-base leading-relaxed text-gray-700">
              {PARTNER_CONTRIBUTIONS.map((contribution) => (
                <li key={contribution} className="flex gap-4">
                  <span aria-hidden="true" className="mt-3 h-1 w-1 shrink-0 rounded-full bg-hopkins-blue/60" />
                  {contribution}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="contact" aria-labelledby="contact-heading" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
          <div className="grid gap-10 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-16">
            <div>
              <h2 id="contact-heading" className={SECTION_TITLE_CLASS}>Get in touch</h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-gray-700">
                If your organization has a question our models could help answer, or you&apos;d simply like to
                learn more, we&apos;d be glad to hear from you.
              </p>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600">
                A few lines about your organization, your city or state, and what you&apos;re working on is
                enough to start.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <a
                  href={CONTACT_HREF}
                  className="inline-flex min-h-11 items-center bg-hopkins-blue px-6 text-sm font-medium text-white transition-colors hover:bg-hopkins-blue/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hopkins-blue"
                >
                  Email us
                </a>
                <CopyEmailButton email={CONTACT_EMAIL} />
              </div>
            </div>
            <div className="md:pt-2">
              <ul className="space-y-6">
                {LEADS.map((lead) => (
                  <li key={lead.name} className="flex items-center gap-4">
                    {/* The portal serves static images directly (images.unoptimized in next.config). */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={lead.photo}
                      alt={`Portrait of ${lead.name}`}
                      width={72}
                      height={72}
                      className="h-18 w-18 shrink-0 rounded-full object-cover ring-1 ring-gray-200"
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
                With a team of epidemiologists, physicians and modelers.{' '}
                <a href={TEAM_URL} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                  Meet the team
                </a>
                .
              </p>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-200 pt-6">
            <p className="max-w-3xl text-xs leading-relaxed text-gray-500">
              This research is supported by the National Institutes of Health (K08MH118094, K01AI138853,
              P30AI094189, R01MD018539). The content is solely the responsibility of the authors and does not
              necessarily represent the official views of the NIH.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
