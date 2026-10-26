import releases from './result-data-releases.json';
import type { ResultReleaseBinding } from '@/types/result-data';

// Deliberately pinned at release time. Publishing new files alone does not
// change the scientific results seen by an already deployed portal.
export const resultDataReleases: Record<string, ResultReleaseBinding> =
  releases;
