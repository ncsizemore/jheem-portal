import type { Metadata } from 'next';
import { Suspense } from 'react';
import Footer from '@/components/Footer';
import RyanWhiteCostingApp from '../RyanWhiteCostingApp';

export const metadata: Metadata = {
  title: 'ADAP Costing Technical Explorer | JHEEM Portal',
  description:
    'Technical ADAP elimination cost-consequence explorer with jurisdiction results, uncertainty, price sensitivity, and methods.',
};

export default function RyanWhiteCostingTechnicalPage() {
  return (
    <>
      <div className="w-full min-w-0 max-w-full overflow-x-hidden">
        <Suspense fallback={<div className="min-h-screen bg-slate-50" aria-hidden="true" />}>
          <RyanWhiteCostingApp />
        </Suspense>
      </div>
      <Footer />
    </>
  );
}
