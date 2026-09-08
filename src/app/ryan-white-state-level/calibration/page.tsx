import { Suspense } from 'react';
import CalibrationExplorer from '@/components/calibration/CalibrationExplorer';

export const metadata = { title: 'Model fit | State-level Ryan White | JHEEM Portal' };
export default function CalibrationPage() {
  return <Suspense fallback={<p className="p-8" role="status">Loading calibration explorer…</p>}><CalibrationExplorer defaultModel="ajph"/></Suspense>;
}
