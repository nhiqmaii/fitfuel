/**
 * tracker.js — water intake + weight/progress views.
 * Two small related trackers grouped by cohesion (not just line count).
 */
const Tracker = (() => {
  // ---------- WATER ----------
  function renderWater() {
    const glasses = Store.waterFor();
    const goal = Store.getGoals().water;
    const cups = Array.from({ length: Math.max(goal, glasses) }, (_, i) =>
      `<span class="cup ${i < glasses ? 'full' : ''}">${i < glasses ? '#' : 'o'}</span>`
    ).join('');

    document.getElementById('app').innerHTML =
      UI.card('Hydration', `
        ${UI.progressBar('Water', glasses, goal, ' glasses')}
        <div class="cups">${cups}</div>
        <div class="btn-row">
          <button id="water-add">+ Add a glass</button>
          <button id="water-sub" class="ghost">- Remove</button>
        </div>
      `);

    document.getElementById('water-add').addEventListener('click', () => Store.addWater(1));
    document.getElementById('water-sub').addEventListener('click', () => Store.addWater(-1));
  }

  // ---------- WEIGHT / PROGRESS ----------
  function renderProgress() {
    const weights = Store.getWeights();

    const form = `
      <form id="weight-form" class="grid-form">
        <input name="value" type="number" step="0.1" min="0" placeholder="weight (kg)" required />
        <button type="submit">Log weight</button>
      </form>`;

    const chart = weights.length ? sparkline(weights) : UI.empty('Log your weight to see a trend.');

    const list = weights.length
      ? `<ul class="item-list">${[...weights].reverse().map(row).join('')}</ul>`
      : '';

    document.getElementById('app').innerHTML =
      UI.card('Log Weight', form) +
      UI.card('Trend', chart) +
      UI.card('History', list || UI.empty('Nothing yet.'));

    const wf = document.getElementById('weight-form');
    wf.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(wf);
      Store.addWeight(f.get('value'));
    });
    document.querySelectorAll('#app .del').forEach((btn) =>
      btn.addEventListener('click', () => Store.removeWeight(btn.dataset.id))
    );
  }

  function row(w) {
    return `
      <li class="item">
        <div><strong>${w.value} kg</strong> <small>${w.date}</small></div>
        <button class="del" data-id="${w.id}">Remove</button>
      </li>`;
  }

  // A dependency-free inline SVG sparkline. Because YAGNI on chart libs.
  function sparkline(weights) {
    const vals = weights.map((w) => w.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const W = 600, H = 160, pad = 20;
    const step = weights.length > 1 ? (W - pad * 2) / (weights.length - 1) : 0;
    const points = weights.map((w, i) => {
      const x = pad + i * step;
      const y = H - pad - ((w.value - min) / range) * (H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    return `
      <svg viewBox="0 0 ${W} ${H}" class="spark" preserveAspectRatio="none">
        <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="3" />
        ${weights.map((w, i) => {
          const x = pad + i * step;
          const y = H - pad - ((w.value - min) / range) * (H - pad * 2);
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" />`;
        }).join('')}
      </svg>
      <div class="spark-labels"><span>${min} kg</span><span>${max} kg</span></div>`;
  }

  return { renderWater, renderProgress };
})();
