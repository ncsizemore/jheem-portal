import Link from 'next/link';

const APPLICATION_LINKS = [
  { href: '/ryan-white', label: 'Ryan White: City-Level' },
  { href: '/ryan-white-state-level', label: 'Ryan White: State-Level' },
  { href: '/cdc-testing', label: 'CDC-Funded HIV Testing' },
  { href: '/aging', label: 'HIV Age Projections' },
];

export default function Footer() {
  return (
    <footer className="bg-hopkins-blue text-white">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <p className="font-serif text-2xl leading-tight">
              <span className="text-hopkins-gold">JHEEM</span>{' '}
              <span className="text-white/90">Portal</span>
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
              Interactive HIV policy modeling from the Joint HIV Epidemiology and
              Economic Model.
            </p>
            <a
              href="https://jhu-comp-epi.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block text-sm text-white/85 transition-colors hover:text-white"
            >
              Part of <span className="font-medium text-hopkins-gold">CIPHER Lab</span> &rarr;
            </a>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/60">
              Modeling Tools
            </h4>
            <ul className="space-y-2 text-sm">
              {APPLICATION_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-white/85 hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/60">
              Institution
            </h4>
            <p className="max-w-xs text-sm leading-relaxed text-white/85">
              Johns Hopkins Schools of Public Health and Medicine
            </p>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <a
                href="https://www.jhu.edu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white hover:underline"
              >
                Johns Hopkins University
              </a>
              <a
                href="https://publichealth.jhu.edu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white hover:underline"
              >
                Bloomberg School of Public Health
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/15 pt-6 text-xs text-white/60">
          {`© ${new Date().getFullYear()} JHEEM · Joint HIV Epidemiology and Economic Model`}
        </div>
      </div>
    </footer>
  );
}
