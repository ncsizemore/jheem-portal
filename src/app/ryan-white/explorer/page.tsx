import CityExplorer from '@/components/CityExplorer';
import ExplorerPreloads from '@/components/analysis/ExplorerPreloads';
import { ryanWhiteConfig } from '@/config/model-configs';

export default function ExplorerPage() {
  return (
    <>
      <ExplorerPreloads config={ryanWhiteConfig} />
      <CityExplorer />
    </>
  );
}
