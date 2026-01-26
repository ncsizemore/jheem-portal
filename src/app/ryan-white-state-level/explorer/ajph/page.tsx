import StateChoroplethExplorer from '@/components/StateChoroplethExplorer';
import { ajphStateLevelConfig } from '@/config/model-configs';

export const metadata = {
  title: 'Ryan White State Analysis (AJPH) | JHEEM',
  description: 'State-level analysis of Ryan White funding scenarios for 11 states (AJPH 2026)',
};

export default function AJPHStatePage() {
  return <StateChoroplethExplorer config={ajphStateLevelConfig} />;
}
