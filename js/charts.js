/**
 * charts.js — dependency-free SVG chart primitives.
 * Every chart takes { labels, values, goal? } and returns an HTML string.
 * Zero libraries. Zero build step. Zen of Python: simple is better than complex.
 */
const Charts = (() => {
  // Higher intrinsic resolution -> browser has more pixels to work with when
  // the SVG is scaled up to container width, so nothing looks blurry.
  const W = 1200;
  const H = 360;
  const PAD = 48;

  // Format a YYYY-MM-DD as a short "M/D" tick.
  function shortDate(iso) {
    const [, m, d] = iso.split('-');
    return `${+m}/${+d}`;
  }

  // Shared: compute a nice y-axis scale that always includes 0 and any goal line.
  function scale(values, goal) {
    const pool = [...values, 0, ...(goal != null ? [goal] : [])];
    const min = Math.min(...pool);
    const max = Math.max(...pool);
    const range = max - min || 1;
    return { min, max, range };
  }

  // Pick a handful of x-tick indices so the axis never gets crowded.
  function pickTicks(n, max = 6) {
    if (n <= max) return [...Array(n).keys()];
    const step = Math.ceil(n / max);
    const ticks = [];
    for (let i = 0; i < n; i += step) ticks.push(i);
    if (ticks[ticks.length - 1] !== n - 1) ticks.push(n - 1);
    return ticks;
  }

  // A line chart with dots at each data point.
  function lineChart({ labels, values, goal, unit = '' }) {
    if (!values.length) return `<p class="empty">No data in this range yet.</p>`;

    const { min, max, range } = scale(values, goal);
    const step = values.length > 1 ? (W - PAD * 2) / (values.length - 1) : 0;

    const toY = (v) => H - PAD - ((v - min) / range) * (H - PAD * 2);
    const points = values.map((v, i) => `${(PAD + i * step).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');

    const goalLine = goal != null
      ? `<line x1="${PAD}" x2="${W - PAD}" y1="${toY(goal)}" y2="${toY(goal)}" class="chart-goal" vector-effect="non-scaling-stroke" />`
      : '';

    const dots = values.map((v, i) =>
      `<circle cx="${(PAD + i * step).toFixed(1)}" cy="${toY(v).toFixed(1)}" r="6">
        <title>${labels[i]}: ${v}${unit}</title>
      </circle>`
    ).join('');

    return svgWrap(points, dots, goalLine, labels, { min, max, unit, kind: 'line' });
  }

  // A bar chart. Same input shape as lineChart.
  function barChart({ labels, values, goal, unit = '' }) {
    if (!values.length) return `<p class="empty">No data in this range yet.</p>`;

    const { min, max, range } = scale(values, goal);
    const barW = Math.max(2, ((W - PAD * 2) / values.length) * 0.7);
    const gap = ((W - PAD * 2) / values.length) - barW;
    const toY = (v) => H - PAD - ((v - min) / range) * (H - PAD * 2);
    const baseY = toY(0);

    const bars = values.map((v, i) => {
      const x = PAD + i * (barW + gap) + gap / 2;
      const y = Math.min(toY(v), baseY);
      const h = Math.abs(toY(v) - baseY);
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="2">
        <title>${labels[i]}: ${v}${unit}</title>
      </rect>`;
    }).join('');

    const goalLine = goal != null
      ? `<line x1="${PAD}" x2="${W - PAD}" y1="${toY(goal)}" y2="${toY(goal)}" class="chart-goal" vector-effect="non-scaling-stroke" />`
      : '';

    return svgWrap('', bars, goalLine, labels, { min, max, unit, kind: 'bar' });
  }

  // Shared SVG shell: axis labels + polyline/bars slot in.
  function svgWrap(polyPoints, marks, goalLine, labels, { min, max, unit, kind }) {
    const ticks = pickTicks(labels.length);
    const step = labels.length > 1 ? (W - PAD * 2) / (labels.length - 1) : 0;
    const xLabels = ticks.map((i) => {
      const x = kind === 'bar'
        ? PAD + (i + 0.5) * ((W - PAD * 2) / labels.length)
        : PAD + i * step;
      return `<text x="${x.toFixed(1)}" y="${H - 6}" class="chart-tick">${shortDate(labels[i])}</text>`;
    }).join('');

    const yLabels = `
      <text x="8" y="${PAD}" class="chart-tick">${Math.round(max)}${unit}</text>
      <text x="8" y="${H - PAD}" class="chart-tick">${Math.round(min)}${unit}</text>
    `;

    const line = polyPoints
      ? `<polyline points="${polyPoints}" class="chart-line" vector-effect="non-scaling-stroke" />`
      : '';

    // preserveAspectRatio="xMidYMid meet" keeps everything proportional so
    // strokes stay crisp and circles stay circular even when width scales.
    return `
      <svg viewBox="0 0 ${W} ${H}" class="chart chart-${kind}" preserveAspectRatio="xMidYMid meet" role="img">
        ${goalLine}
        ${line}
        <g class="chart-marks">${marks}</g>
        ${xLabels}
        ${yLabels}
      </svg>`;
  }

  // Segmented range control. `onChange` receives the new day count (or 0 = All).
  const RANGES = [
    { days: 7, label: '7D' },
    { days: 30, label: '30D' },
    { days: 90, label: '90D' },
    { days: 0, label: 'All' },
  ];

  function rangeControl(currentDays) {
    return `<div class="range-control" role="tablist" aria-label="Time range">
      ${RANGES.map((r) =>
        `<button type="button" class="range-btn ${r.days === currentDays ? 'active' : ''}"
                data-days="${r.days}" role="tab" aria-selected="${r.days === currentDays}">
          ${r.label}
        </button>`
      ).join('')}
    </div>`;
  }

  // Wire up a range control inside `container`. Calls `onChange(days)` on click.
  function bindRange(container, onChange) {
    container.querySelectorAll('.range-btn').forEach((btn) =>
      btn.addEventListener('click', () => onChange(+btn.dataset.days))
    );
  }

  return { lineChart, barChart, rangeControl, bindRange };
})();
