/**
 * Export chart container to PNG image
 */
import { generateExportFilename } from './exportFilename';

// Dynamic import for html2canvas (only loaded when needed)
const loadHtml2Canvas = () => import('html2canvas').then(mod => mod.default);

export interface PngExportOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  locationName: string;
  scenario: string;
  outcome: string;
  statistic: string;
  facet: string;
}

export async function exportToPng({
  containerRef,
  locationName,
  scenario,
  outcome,
  statistic,
  facet,
}: PngExportOptions): Promise<void> {
  if (!containerRef.current) {
    throw new Error('Chart container not available');
  }

  const html2canvas = await loadHtml2Canvas();

  const canvas = await html2canvas(containerRef.current, {
    backgroundColor: '#ffffff',
    scale: 2,
    logging: false,
    useCORS: true,
    allowTaint: true,
    ignoreElements: (element) => {
      return element.tagName === 'STYLE' || element.tagName === 'LINK';
    },
    onclone: (_clonedDoc, element) => {
      const applyComputedStyles = (el: Element) => {
        const computed = getComputedStyle(el);
        const htmlEl = el as HTMLElement;
        htmlEl.style.color = computed.color;
        htmlEl.style.backgroundColor = computed.backgroundColor;
        htmlEl.style.borderColor = computed.borderColor;
      };

      const allElements = element.querySelectorAll('*');
      applyComputedStyles(element);
      allElements.forEach(applyComputedStyles);

      const svgs = element.querySelectorAll('svg');
      svgs.forEach(svg => {
        const rect = svg.getBoundingClientRect();
        svg.setAttribute('width', String(rect.width));
        svg.setAttribute('height', String(rect.height));
      });
    },
  });

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });

  if (!blob) {
    throw new Error('Failed to create PNG blob');
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = generateExportFilename(locationName, scenario, outcome, statistic, facet, 'png');
  link.click();
  URL.revokeObjectURL(url);
}
