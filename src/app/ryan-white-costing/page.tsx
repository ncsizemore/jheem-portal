import type { Metadata } from 'next';
import RyanWhiteCostingApp from './RyanWhiteCostingApp';

export const metadata: Metadata = {
  title: 'Ryan White ADAP Costing Preview | JHEEM Portal',
  description: 'Economic review workspace for the Ryan White ADAP elimination costing analysis.',
};

export default function RyanWhiteCostingPage() {
  return <RyanWhiteCostingApp />;
}
