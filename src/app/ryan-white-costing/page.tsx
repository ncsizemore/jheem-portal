import type { Metadata } from 'next';
import { Newsreader } from 'next/font/google';
import { Suspense } from 'react';
import Footer from '@/components/Footer';
import RyanWhiteCostingApp from './RyanWhiteCostingApp';

// Editorial display serif — used for the hero and section titles. Body/UI stay
// on Geist sans; data figures stay on Geist mono.
const serif = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ryan White ADAP Costing Explorer | JHEEM Portal',
  description:
    'ADAP elimination cost-consequence explorer: excess infections, diagnoses, downstream HIV care costs, and avoided ADAP spending across modeled jurisdictions, including DC.',
};

export default function RyanWhiteCostingPage() {
  return (
    <>
      <div className={`${serif.variable} w-full min-w-0 max-w-full overflow-x-hidden`}>
        <Suspense fallback={<div className="min-h-screen bg-slate-50" aria-hidden="true" />}>
          <RyanWhiteCostingApp />
        </Suspense>
      </div>
      <Footer />
    </>
  );
}
