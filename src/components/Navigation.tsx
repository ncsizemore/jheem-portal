'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CIPHER_URL, PUBLICATIONS_URL } from '@/lib/site';

const MODELS = [
  { href: '/ryan-white', label: 'Ryan White: City-Level', detail: 'Metropolitan areas nationwide' },
  { href: '/ryan-white-state-level', label: 'Ryan White: State-Level', detail: 'Statewide analysis' },
  { href: '/ryan-white-costing', label: 'ADAP Costing Analysis', detail: 'Costs and outcomes of ADAP elimination' },
  { href: '/cdc-testing', label: 'CDC Testing', detail: 'CDC-funded HIV testing in 18 states' },
  { href: '/aging', label: 'HIV Age Projections', detail: 'Aging trends among people with HIV' },
];

const MODEL_SECTIONS = [
  {
    root: '/ryan-white', label: 'Ryan White',
    links: [
      { href: '/ryan-white/explorer', label: 'Prerun Explorer' },
      { href: '/ryan-white/custom', label: 'Custom Simulations' },
    ],
  },
  {
    root: '/ryan-white-state-level', label: 'Ryan White: State-Level',
    links: [
      { href: '/ryan-white-state-level/explorer/ajph', label: '11 States (2025–2030)' },
      { href: '/ryan-white-state-level/explorer/croi', label: '30 States (2026–2031)' },
      { href: '/ryan-white-state-level/custom', label: 'Custom Simulations' },
    ],
  },
  {
    root: '/cdc-testing', label: 'CDC Testing',
    links: [
      { href: '/cdc-testing/explorer', label: 'Prerun Explorer' },
      { href: '/cdc-testing/custom', label: 'Custom Simulations' },
    ],
  },
];

function matchesRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navigation() {
  const pathname = usePathname();
  return <NavigationForPath key={pathname} pathname={pathname} />;
}

function NavigationForPath({ pathname }: { pathname: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const modelsButton = useRef<HTMLButtonElement>(null);
  const mobileButton = useRef<HTMLButtonElement>(null);
  const isPublicPage = pathname === '/' || pathname === '/work-with-us';
  const section = MODEL_SECTIONS.find(({ root }) => matchesRoute(pathname, root))
    ?? (pathname === '/explore' ? MODEL_SECTIONS[0] : undefined);
  const activeModel = (href: string) => matchesRoute(pathname, href)
    || (href === '/ryan-white' && pathname === '/explore')
    || (href === '/cdc-testing' && pathname === '/shiny/cdc-testing');
  const closeMenus = () => {
    setMobileOpen(false);
    setModelsOpen(false);
    // Start a destination at its heading even when a long mobile menu was scrolled.
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <>
      {isPublicPage && (
        <div className="site-affiliation bg-hopkins-blue">
          <div className="site-container flex flex-wrap items-center gap-x-2 py-2 text-[0.6875rem] leading-relaxed tracking-[0.02em] text-white/85 sm:text-xs">
            <a href={CIPHER_URL} className="font-medium text-white underline-offset-4 hover:underline">CIPHER Lab</a>
            <span aria-hidden="true">/</span>
            <span className="sm:hidden">Johns Hopkins University</span>
            <span className="hidden sm:inline">Johns Hopkins Schools of Public Health and Medicine</span>
          </div>
        </div>
      )}
    <header
      className={`site-header z-50 bg-white font-sans text-ink ${isPublicPage ? 'relative lg:sticky lg:top-0' : 'sticky top-0'}`}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        if (mobileOpen) { setMobileOpen(false); mobileButton.current?.focus(); }
        if (modelsOpen) { setModelsOpen(false); modelsButton.current?.focus(); }
      }}
    >
      <a href="#main-content" className="sr-only z-50 bg-white p-3 focus:not-sr-only focus:absolute focus:left-4 focus:top-4">
        Skip to content
      </a>
      <div className="border-b border-rule">
        <div className="site-container flex min-h-22 items-center justify-between gap-6 py-4 lg:min-h-18 lg:py-3">
          <Link href="/" aria-label="JHEEM home" className="flex shrink-0 items-center gap-4 text-hopkins-blue max-[374px]:flex-col max-[374px]:items-start max-[374px]:gap-1 sm:gap-5" onNavigate={closeMenus}>
            <span className="font-serif text-[2.25rem] leading-none tracking-[-0.045em] sm:text-[2.6rem]">JHEEM</span>
            <span className="border-l border-rule pl-4 text-[0.6875rem] max-[374px]:border-0 max-[374px]:pl-0 leading-[1.45] text-ink sm:pl-5 sm:text-[0.8125rem]">
              Joint HIV Epidemiology<br />and Economic Model
            </span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm lg:flex">
            <div
              className="relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setModelsOpen(false);
              }}
            >
              <button
                ref={modelsButton}
                type="button"
                aria-expanded={modelsOpen}
                aria-controls="model-navigation"
                onClick={() => setModelsOpen(!modelsOpen)}
                className={`flex min-h-11 items-center gap-2 hover:text-hopkins-blue ${MODELS.some(({ href }) => activeModel(href)) ? 'text-hopkins-blue' : ''}`}
              >
                Modeling tools
                <svg aria-hidden="true" className={`h-3 w-3 transition-transform ${modelsOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor"><path d="m2 4 4 4 4-4" /></svg>
              </button>
              {modelsOpen && (
                <div id="model-navigation" className="absolute right-0 top-full w-80 border border-rule bg-white p-2 shadow-[0_12px_32px_rgba(18,36,53,0.09)]">
                  {MODELS.map((model) => (
                    <Link key={model.href} href={model.href} onNavigate={closeMenus} aria-current={pathname === model.href ? 'page' : undefined} className={`block px-4 py-3 hover:bg-paper focus-visible:bg-paper ${activeModel(model.href) ? 'bg-paper text-hopkins-blue' : ''}`}>
                      <span className="block font-medium">{model.label}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted">{model.detail}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <a href={PUBLICATIONS_URL} className="inline-flex min-h-11 items-center hover:text-hopkins-blue">Research</a>
            <Link href="/work-with-us" aria-current={pathname === '/work-with-us' ? 'page' : undefined} className={`inline-flex min-h-11 items-center border-b hover:border-hopkins-blue hover:text-hopkins-blue ${pathname === '/work-with-us' ? 'border-hopkins-blue text-hopkins-blue' : 'border-transparent'}`}>
              Work with us
            </Link>
          </nav>

          <button ref={mobileButton} type="button" onClick={() => setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen} aria-controls="mobile-navigation" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} className="-mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center text-hopkins-blue lg:hidden">
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d={mobileOpen ? 'M6 6l12 12M6 18 18 6' : 'M3 7h18M3 12h18M3 17h18'} />
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="max-h-[65vh] overflow-y-auto border-b border-rule bg-white lg:hidden">
          <div className="site-container py-5">
            <Link href="/" onNavigate={closeMenus} className="block py-3 text-sm">Overview</Link>
            <Link href="/work-with-us" onNavigate={closeMenus} aria-current={pathname === '/work-with-us' ? 'page' : undefined} className="block py-3 text-sm text-hopkins-blue">Work with us</Link>
            <a href={PUBLICATIONS_URL} className="block py-3 text-sm">Research</a>
            <p className="mt-4 border-t border-rule pt-5 text-xs font-medium text-muted">Modeling tools</p>
            {MODELS.map((model) => (
              <Link key={model.href} href={model.href} onNavigate={closeMenus} aria-current={pathname === model.href ? 'page' : undefined} className={`block py-3 text-sm ${activeModel(model.href) ? 'text-hopkins-blue' : ''}`}>{model.label}</Link>
            ))}
          </div>
        </nav>
      )}

      {section && (
        <nav aria-label={`${section.label} navigation`} className="border-b border-rule bg-paper">
          <div className="site-container flex items-center gap-x-7 overflow-x-auto whitespace-nowrap py-2 text-sm">
            <Link href={section.root} className="hidden py-2 font-medium text-hopkins-blue md:inline">{section.label}</Link>
            {section.links.map((link) => (
              <Link key={link.href} href={link.href} aria-current={matchesRoute(pathname, link.href) ? 'page' : undefined} className={`border-b py-2 hover:text-hopkins-blue ${matchesRoute(pathname, link.href) ? 'border-hopkins-blue text-hopkins-blue' : 'border-transparent text-muted'}`}>{link.label}</Link>
            ))}
          </div>
        </nav>
      )}
    </header>
    </>
  );
}
