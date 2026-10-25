import type { AnalysisExportContext } from './analysisExport';
import { downloadBlob } from './analysisExport';
import { generateExportFilename } from './exportFilename';
interface PngExportOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  locationName: string;
  scenario: string;
  outcome: string;
  statistic: string;
  facet: string;
  context: AnalysisExportContext;
  legend: string;
}
// Rasterize SVG directly: no HTML screenshot renderer, remote fonts, or CSS color parser.
async function svgImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const bounds = svg.getBoundingClientRect();
  // XMLSerializer supplies the SVG namespace; setting a second xmlns breaks decoding.
  clone.setAttribute('width', String(bounds.width));
  clone.setAttribute('height', String(bounds.height));
  clone.style.width = `${bounds.width}px`;
  clone.style.height = `${bounds.height}px`;
  clone.style.fontFamily = 'Arial, sans-serif';
  const image = new Image();
  // data: is already permitted by the site's image CSP; blob: images are not.
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  await image.decode();
  return image;
}
export async function exportToPng(o: PngExportOptions): Promise<void> {
  const root = o.containerRef.current;
  if (!root) throw new Error('Chart unavailable');
  const panels = Array.from(
    root.querySelectorAll<HTMLElement>('[data-export-panel]'),
  );
  const figures = await Promise.all(
    panels.map(async (panel) => {
      const svg = panel.querySelector<SVGSVGElement>('svg.recharts-surface');
      if (!svg)
        throw new Error('Chart is still loading. Try again in a moment.');
      return {
        image: await svgImage(svg),
        title: panel.getAttribute('data-export-panel') || '',
      };
    }),
  );
  if (!figures.length) throw new Error('No chart to export');
  const canvas = document.createElement('canvas');
  const scale = 2,
    width = 1000;
  const totalChartHeight = figures.reduce(
    (sum, f) => sum + ((width - 80) * f.image.height) / f.image.width + 70,
    0,
  );
  canvas.width = width * scale;
  canvas.height = Math.ceil(1200 + totalChartHeight) * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image export is unavailable in this browser');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, canvas.height / scale);
  let y = 40;
  function text(content: string, size = 15, bold = false, color = '#52616b') {
    ctx!.font = `${bold ? '600' : '400'} ${size}px Arial, sans-serif`;
    ctx!.fillStyle = color;
    let line = '';
    for (const word of content.split(/\s+/)) {
      if (ctx!.measureText(`${line} ${word}`).width > width - 80 && line) {
        ctx!.fillText(line, 40, y);
        y += size * 1.5;
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    if (line) {
      ctx!.fillText(line, 40, y);
      y += size * 1.5;
    }
    y += 8;
  }
  const c = o.context;
  text(`JHEEM · ${c.model}`, 14, true);
  text(c.title, 27, true, '#172b3a');
  text(`${c.location} · ${c.scenario}`, 17, true);
  text(c.definition);
  text(`Units: ${c.units}. ${c.summary}`);
  if (c.timeline) text(c.timeline, 13);
  for (const f of figures) {
    if (figures.length > 1) text(f.title, 18, true, '#172b3a');
    const height = ((width - 80) * f.image.height) / f.image.width;
    ctx.drawImage(f.image, 40, y, width - 80, height);
    y += height + 20;
  }
  text(o.legend, 14);
  text(c.scope, 13);
  text(
    `Results generated: ${c.generated || 'Not recorded in this release'}. Exported: ${new Date().toISOString().slice(0, 10)}.`,
    12,
  );
  text(`Source: ${c.url}`, 12);
  const cropped = document.createElement('canvas');
  cropped.width = canvas.width;
  cropped.height = Math.ceil(y + 20) * scale;
  cropped.getContext('2d')!.drawImage(canvas, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) =>
    cropped.toBlob(resolve, 'image/png'),
  );
  if (!blob) throw new Error('Unable to create the image');
  downloadBlob(
    blob,
    generateExportFilename(
      o.locationName,
      o.scenario,
      o.outcome,
      o.statistic,
      o.facet,
      'png',
    ),
  );
}
