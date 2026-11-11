// Export chart SVGs directly: no DOM screenshot, remote assets, or animation delay.
export async function exportAgingCharts(
  root: HTMLElement,
  subtitle: string,
  legend: { label: string; color: string }[],
) {
  // Snapshot every SVG before awaiting image decoding, so changes to the live
  // selection or viewport cannot mix different comparisons in one download.
  const charts = [
    ...root.querySelectorAll<HTMLElement>('[data-testid="aging-chart"]'),
  ].map((panel) => {
    const original = panel.querySelector<SVGSVGElement>('svg.recharts-surface');
    if (!original) throw new Error('Charts are not ready.');
    const { width, height } = original.getBoundingClientRect();
    const svg = original.cloneNode(true) as SVGSVGElement;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const style = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'style',
    );
    style.textContent = 'text{font-family:Arial,sans-serif}';
    svg.prepend(style);
    return {
      title: panel.querySelector('[data-chart-title]')?.textContent ?? '',
      width,
      height,
      source: new XMLSerializer().serializeToString(svg),
    };
  });
  if (!charts.length) throw new Error('Charts are not ready.');
  const columns = charts.length === 1 ? 1 : charts.length <= 4 ? 2 : 3;
  const cellWidth = Math.max(380, Math.ceil(charts[0].width));
  const plotHeight = Math.ceil(charts[0].height);
  const cellHeight = plotHeight + 65;
  const width = columns * cellWidth + 48;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image export is unavailable.');
  function lines(text: string, font: string) {
    ctx!.font = font;
    const result: string[] = [];
    let line = '';
    for (const word of text.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (ctx!.measureText(next).width > width - 48 && line) {
        result.push(line);
        line = word;
      } else line = next;
    }
    if (line) result.push(line);
    return result;
  }
  const subtitleLines = lines(subtitle, '13px Arial');
  const footerLines = lines(
    'jheem.org/aging · Median projections; uncertainty intervals are not shown.',
    '11px Arial',
  );
  const legendColumns = Math.max(1, Math.floor((width - 48) / 95));
  const legendTop = 66 + subtitleLines.length * 18;
  const chartsTop =
    legendTop + Math.ceil(legend.length / legendColumns) * 22 + 30;
  const height =
    chartsTop +
    Math.ceil(charts.length / columns) * cellHeight +
    footerLines.length * 16 +
    12;
  // Retain crisp small exports without allocating a huge canvas for 25 panels.
  const scale = Math.min(
    2,
    8192 / width,
    8192 / height,
    Math.sqrt(12_000_000 / (width * height)),
  );
  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#173e56';
  ctx.font = '24px Georgia';
  ctx.fillText('JHEEM · Age distribution projections', 24, 38, width - 48);
  ctx.font = '13px Arial';
  ctx.fillStyle = '#506271';
  subtitleLines.forEach((line, i) => ctx.fillText(line, 24, 64 + i * 18));
  legend.forEach((item, i) => {
    const x = 24 + (i % legendColumns) * 95,
      y = legendTop + Math.floor(i / legendColumns) * 22;
    ctx.fillStyle = item.color;
    ctx.fillRect(x, y, 12, 12);
    ctx.fillStyle = '#173e56';
    ctx.fillText(item.label, x + 18, y + 10);
  });
  for (const [index, chart] of charts.entries()) {
    const x = 24 + (index % columns) * cellWidth,
      y = chartsTop + Math.floor(index / columns) * cellHeight;
    ctx.fillStyle = '#173e56';
    ctx.font = '16px Arial';
    ctx.fillText(chart.title, x + 6, y, cellWidth - 12);
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(chart.source)}`;
    await image.decode();
    const imageWidth = Math.min(cellWidth - 12, chart.width);
    ctx.drawImage(
      image,
      x + (cellWidth - imageWidth) / 2,
      y + 12,
      imageWidth,
      plotHeight,
    );
  }
  ctx.font = '11px Arial';
  ctx.fillStyle = '#506271';
  footerLines.forEach((line, i) =>
    ctx.fillText(line, 24, height - 12 - (footerLines.length - 1 - i) * 16),
  );
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error('Unable to create image.')),
      'image/png',
    ),
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'jheem-age-projections.png';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
