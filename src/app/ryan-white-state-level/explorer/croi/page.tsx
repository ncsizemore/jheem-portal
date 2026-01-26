import StateChoroplethExplorer from '@/components/StateChoroplethExplorer';
import { croiStateLevelConfig } from '@/config/model-configs';

export const metadata = {
  title: 'Ryan White State Analysis (CROI) | JHEEM',
  description: 'State-level analysis of Ryan White funding scenarios for 30 states (CROI 2026)',
};

export default function CROIStatePage() {
  return <StateChoroplethExplorer config={croiStateLevelConfig} />;
}
