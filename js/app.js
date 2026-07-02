/**
 * app.js — router + dashboard + settings + re-render glue.
 * Keeps the "which view is active" concern in exactly one place.
 */
const App = (() => {
  let current = 'dashboard';

  const views = {
    dashboard: renderDashboard,
    nutrition: Nutrition.render,
    workouts: Workouts.render,
    water: Tracker.renderWater,
    progress: Tracker.renderProgress,
    settings: renderSettings,
  };

  function go(view) {
    current = views[view] ? view : 'dashboard';
    document.querySelectorAll('.tab').forEach((t) =>
      t.classList.toggle('active', t.dataset.view === current)
    );
    views[current]();
  }

  // ---------- DASHBOARD ----------
  function renderDashboard() {
    const goals = Store.getGoals();
    const n = Store.nutritionTotals();
    const water = Store.waterFor();
    const workouts = Store.workoutsByDate().length;
    const weights = Store.getWeights();
    const latestWeight = weights.length ? weights[weights.length - 1].value + ' kg' : '--';

    document.getElementById('app').innerHTML =
      UI.card("Today at a Glance", `
        ${UI.progressBar('Calories', n.calories, goals.calories, ' kcal')}
        ${UI.progressBar('Water', water, goals.water, ' glasses')}
      `) +
      `<div class="stat-grid">
        ${statBox('Workouts logged', workouts)}
        ${statBox('Protein', n.protein + ' g')}
        ${statBox('Latest weight', latestWeight)}
      </div>` +
      UI.card('Quick Tips', `
        <ul class="tips">
          <li>Log meals right after eating so you actually remember them.</li>
          <li>Hydration goal not met? Your future self is thirsty.</li>
          <li>Progressive overload: nudge weight or reps up over time.</li>
        </ul>`);
  }

  function statBox(label, value) {
    return `<div class="stat-box"><span class="stat-value">${UI.esc(String(value))}</span><span class="stat-label">${UI.esc(label)}</span></div>`;
  }

  // ---------- SETTINGS ----------
  function renderSettings() {
    const g = Store.getGoals();
    document.getElementById('app').innerHTML =
      UI.card('Daily Goals', `
        <form id="goals-form" class="grid-form">
          ${goalInput('calories', 'Calories (kcal)', g.calories)}
          ${goalInput('protein', 'Protein (g)', g.protein)}
          ${goalInput('carbs', 'Carbs (g)', g.carbs)}
          ${goalInput('fat', 'Fat (g)', g.fat)}
          ${goalInput('water', 'Water (glasses)', g.water)}
          <button type="submit">Save goals</button>
        </form>`) +
      UI.card('Danger Zone', `
        <p>Wipe all data and start fresh. No undo. No take-backs.</p>
        <button id="reset-btn" class="danger">Reset everything</button>`);

    const gf = document.getElementById('goals-form');
    gf.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(gf);
      Store.setGoals({
        calories: +f.get('calories') || 0,
        protein: +f.get('protein') || 0,
        carbs: +f.get('carbs') || 0,
        fat: +f.get('fat') || 0,
        water: +f.get('water') || 0,
      });
      go('settings');
    });
    document.getElementById('reset-btn').addEventListener('click', () => {
      if (confirm('Really wipe everything?')) Store.reset();
    });
  }

  function goalInput(name, label, value) {
    return `<label class="field"><span>${label}</span>
      <input name="${name}" type="number" min="0" value="${value}" /></label>`;
  }

  // ---------- boot ----------
  function init() {
    document.getElementById('tabs').addEventListener('click', (e) => {
      const btn = e.target.closest('.tab');
      if (btn) go(btn.dataset.view);
    });
    // Re-render current view whenever the store changes. Reactive-ish.
    document.addEventListener('store:changed', () => views[current]());
    go('dashboard');
  }

  return { init, go };
})();

document.addEventListener('DOMContentLoaded', App.init);
