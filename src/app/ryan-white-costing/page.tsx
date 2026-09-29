import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import RyanWhiteCostingSummary from './RyanWhiteCostingSummary';

export const metadata: Metadata = {
  title: 'What Could Happen if ADAP Funding Ended? | JHEEM Portal',
  description:
    'Plain-language summary of modeled HIV infections, care costs, and ADAP savings under complete ADAP elimination from 2026 through 2035.',
};

export default function RyanWhiteCostingPage() {
  return (
    <>
      <div className="w-full min-w-0 max-w-full overflow-x-hidden">
        <RyanWhiteCostingSummary />
      </div>
      <Footer />
    </>
  );
}
