import type { Metadata } from 'next';
import { Newsreader } from 'next/font/google';
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
  title: 'Ryan White ADAP Costing Preview | JHEEM Portal',
  description: 'Economic review workspace for the Ryan White ADAP elimination costing analysis.',
};

export default function RyanWhiteCostingPage() {
  return (
    <div className={serif.variable}>
      <RyanWhiteCostingApp />
    </div>
  );
}
