import ExplorerPreloads from '@/components/analysis/ExplorerPreloads';
import StateChoroplethExplorer from '@/components/StateChoroplethExplorer';
import { cdcTestingConfig } from '@/config/model-configs';

export const metadata = {
  title: 'CDC Testing Model Explorer | JHEEM',
  description:
    'Analysis of CDC-funded HIV testing program scenarios across 18 US states',
};

export default function CDCTestingExplorerPage() {
  return (
    <>
      <ExplorerPreloads config={cdcTestingConfig} />
      <StateChoroplethExplorer config={cdcTestingConfig} />
    </>
  );
}
