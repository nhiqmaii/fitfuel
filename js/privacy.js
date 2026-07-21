/**
 * privacy.js — visible proof of FitFuel's privacy claims.
 * Shows exactly what's stored, where, and gives the user real controls.
 * No tracking. No accounts. No servers. This tab exists to prove it.
 */
const Privacy = (() => {
  function render() {
    const s = Store.getState();
    const bytes = new Blob([JSON.stringify(s)]).size;

    document.getElementById('app').innerHTML =
      UI.card('Your Privacy at a Glance', factsGrid()) +
      UI.card('What is stored on this device', `
        <ul class="privacy-list">
          ${row('Meals', s.meals.length)}
          ${row('Workouts', s.workouts.length)}
          ${row('Weight entries', s.weights.length)}
          ${row('Hydration days', Object.keys(s.water).length)}
          ${row('Total size', formatBytes(bytes))}
          ${row('Storage location', 'On this device')}
        </ul>`) +
      UI.card('Your data, your controls', `
        <p class="muted-copy">Everything you have ever logged is right here. Take it, move it, delete it. It is yours.</p>
        <div class="btn-row btn-row-wrap">
          <button id="export-btn">Export as JSON</button>
          <label for="import-input" class="btn-like ghost">Import JSON</label>
          <input id="import-input" type="file" accept="application/json,.json" hidden />
          <button id="wipe-btn" class="danger">Delete everything</button>
        </div>
        <p id="privacy-status" class="privacy-status" role="status" aria-live="polite"></p>`);

    bind();
  }

  function factsGrid() {
    const facts = [
      { label: 'Data sent to servers', value: '0 bytes', good: true },
      { label: 'Third-party trackers', value: '0', good: true },
      { label: 'Account required', value: 'No', good: true },
      { label: 'Cookies used', value: 'None', good: true },
    ];
    return `<div class="privacy-facts">${
      facts.map((f) =>
        `<div class="privacy-fact ${f.good ? 'good' : ''}">
          <span class="privacy-value">${UI.esc(f.value)}</span>
          <span class="privacy-label">${UI.esc(f.label)}</span>
        </div>`
      ).join('')
    }</div>`;
  }

  function row(label, value) {
    return `<li><span>${UI.esc(label)}</span><strong>${UI.esc(String(value))}</strong></li>`;
  }

  function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  // ---------- actions ----------
  function bind() {
    document.getElementById('export-btn').addEventListener('click', exportJSON);
    document.getElementById('import-input').addEventListener('change', importJSON);
    document.getElementById('wipe-btn').addEventListener('click', () => {
      if (confirm('Delete all FitFuel data on this device? No undo.')) {
        Store.reset();
        flash('All local data deleted.');
      }
    });
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(Store.getState(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitfuel-export-${Store.today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('Exported! Check your downloads folder.');
  }

  function importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (typeof parsed !== 'object' || !parsed) throw new Error('Not an object');
        Store.replace(parsed);
        flash('Imported successfully.');
      } catch (err) {
        flash('Import failed: ' + err.message, true);
      }
    };
    reader.readAsText(file);
  }

  function flash(msg, isError = false) {
    const el = document.getElementById('privacy-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'privacy-status ' + (isError ? 'error' : 'ok');
  }

  return { render };
})();
