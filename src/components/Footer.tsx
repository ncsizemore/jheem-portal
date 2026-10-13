import Link from 'next/link';
import { CIPHER_URL, PUBLICATIONS_URL, TEAM_URL } from '@/lib/site';

const APPLICATION_LINKS = [
  { href: '/ryan-white', label: 'Ryan White: City-Level' },
  { href: '/ryan-white-state-level', label: 'Ryan White: State-Level' },
  { href: '/ryan-white-costing', label: 'ADAP Costing Analysis' },
  { href: '/cdc-testing', label: 'CDC-Funded HIV Testing' },
  { href: '/aging', label: 'HIV Age Projections' },
];

export default function Footer() {
  return (
    <footer className="site-footer bg-hopkins-blue font-sans text-white">
      <div className="site-container pb-7 pt-12 md:pt-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr] md:gap-12">
          <div>
            <Link href="/" className="font-serif text-[2rem] tracking-[-0.035em] text-white">JHEEM</Link>
            <p className="mt-2 max-w-xs text-sm leading-relaxed">Joint HIV Epidemiology<br />and Economic Model</p>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/75">
              A research program of <a href={CIPHER_URL} className="text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">CIPHER Lab</a>,
              based at the Johns Hopkins Schools of Public Health and Medicine.
            </p>
          </div>
          <div>
            <h2 className="mb-4 text-sm font-medium">Modeling tools</h2>
            <ul className="space-y-3 text-sm text-white/75">
              {APPLICATION_LINKS.map((item) => (
                <li key={item.href}><Link href={item.href} className="hover:text-white hover:underline">{item.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-4 text-sm font-medium">Research &amp; collaboration</h2>
            <ul className="space-y-3 text-sm text-white/75">
              <li><Link href="/work-with-us" className="hover:text-white hover:underline">Work with us</Link></li>
              <li><a href={PUBLICATIONS_URL} className="hover:text-white hover:underline">Publications</a></li>
              <li><a href={TEAM_URL} className="hover:text-white hover:underline">Meet the team</a></li>
              <li><a href="https://www.jhu.edu" className="hover:text-white hover:underline">Johns Hopkins University</a></li>
              <li><a href="https://publichealth.jhu.edu" className="hover:text-white hover:underline">Bloomberg School of Public Health</a></li>
            </ul>
          </div>
        </div>
        <p className="mt-12 border-t border-white/20 pt-6 text-xs leading-relaxed text-white/65">
          {`© ${new Date().getFullYear()} JHEEM · Joint HIV Epidemiology and Economic Model`}
        </p>
      </div>
    </footer>
  );
}
