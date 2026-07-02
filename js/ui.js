/**
 * ui.js — tiny DOM helpers so feature modules stay declarative.
 * Keeps us DRY: build HTML strings + shared widgets in one place.
 */
const UI = (() => {
  // Escape user input to keep our innerHTML honest (no XSS shenanigans).
  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // A reusable progress bar: current vs goal.
  function progressBar(label, current, goal, unit = '') {
    const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
    const over = current > goal && goal > 0;
    return `
      <div class="metric">
        <div class="metric-head">
          <span class="metric-label">${esc(label)}</span>
          <span class="metric-val">${current}${unit} / ${goal}${unit}</span>
        </div>
        <div class="bar">
          <div class="bar-fill ${over ? 'over' : ''}" style="width:${pct}%"></div>
        </div>
      </div>`;
  }

  // A titled card wrapper.
  function card(title, innerHTML) {
    return `<section class="card"><h2>${esc(title)}</h2>${innerHTML}</section>`;
  }

  // Empty-state message.
  function empty(msg) {
    return `<p class="empty">${esc(msg)}</p>`;
  }

  return { esc, progressBar, card, empty };
})();
