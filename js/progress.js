/**
 * progress.js — the Progress dashboard: trends, averages, streaks.
 * Owns the "understand your data over time" view. Aggregation happens here;
 * Store stays a dumb data bag, Charts stays a dumb renderer. SRP + DRY.
 */
const Progress = (() => {
  let rangeDays = 30; // 0 means "all time"

  // ---------- range + date helpers ----------
  function activeDates() {
    if (rangeDays > 0) return Store.lastNDays(rangeDays);
    // "All" — span from earliest logged date through today.
    const all = collectAllDates();
    if (!all.length) return Store.lastNDays(7); // fallback so charts don't look sad
    const start = all[0];
    const end = Store.today();
    return datesBetween(start, end);
  }

  function collectAllDates() {
    const s = Store.getState();
    const set = new Set([
      ...s.meals.map((m) => m.date),
      ...s.workouts.map((w) => w.date),
      ...s.weights.map((w) => w.date),
      ...Object.keys(s.water),
    ]);
    return [...set].sort();
  }

  function datesBetween(startISO, endISO) {
    const out = [];
    const d = new Date(startISO);
    const end = new Date(endISO);
    while (d <= end) {
      out.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  // ---------- per-day aggregates ----------
  function seriesFor(dates) {
    const s = Store.getState();
    return dates.map((date) => {
      const dayMeals = s.meals.filter((m) => m.date === date);
      const nutrition = dayMeals.reduce((a, m) => ({
        calories: a.calories + (+m.calories || 0),
        protein: a.protein + (+m.protein || 0),
      }), { calories: 0, protein: 0 });
      return {
        date,
        calories: nutrition.calories,
        protein: nutrition.protein,
        workouts: s.workouts.filter((w) => w.date === date).length,
        water: s.water[date] || 0,
        weight: findWeight(s.weights, date),
      };
    });
  }

  function findWeight(weights, date) {
    // Weights aren't logged daily — return whatever was logged on that date, or null.
    const match = weights.find((w) => w.date === date);
    return match ? match.value : null;
  }

  // ---------- summary stats ----------
  function summarize(series) {
    const nonZero = (key) => series.filter((d) => d[key] > 0).map((d) => d[key]);
    const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const weights = series.map((d) => d.weight).filter((w) => w != null);
    const weightChange = weights.length >= 2
      ? +(weights[weights.length - 1] - weights[0]).toFixed(1)
      : null;

    return {
      workoutsTotal: series.reduce((a, d) => a + d.workouts, 0),
      avgCalories: avg(nonZero('calories')),
      avgWater: avg(nonZero('water')),
      weightChange,
      streak: currentStreak(series, (d) => d.workouts > 0),
    };
  }

  // Longest CURRENT streak (walk backwards from today).
  function currentStreak(series, hit) {
    let n = 0;
    for (let i = series.length - 1; i >= 0; i--) {
      if (hit(series[i])) n++;
      else break;
    }
    return n;
  }

  // ---------- render ----------
  function render() {
    const dates = activeDates();
    const series = seriesFor(dates);
    const stats = summarize(series);
    const goals = Store.getGoals();

    const app = document.getElementById('app');
    app.innerHTML =
      UI.card('Progress', `
        ${Charts.rangeControl(rangeDays)}
        <div class="stat-grid stat-grid-4">
          ${statBox('Workouts', stats.workoutsTotal)}
          ${statBox('Avg calories', stats.avgCalories ? stats.avgCalories + ' kcal' : '--')}
          ${statBox('Avg water', stats.avgWater ? stats.avgWater + ' glasses' : '--')}
          ${statBox('Workout streak', stats.streak + ' days')}
        </div>
      `) +
      weightSection(series, stats.weightChange) +
      UI.card('Calories per day', Charts.lineChart({
        labels: dates,
        values: series.map((d) => d.calories),
        goal: goals.calories,
        unit: '',
      })) +
      UI.card('Workout frequency', Charts.barChart({
        labels: dates,
        values: series.map((d) => d.workouts),
        unit: '',
      })) +
      UI.card('Hydration', Charts.barChart({
        labels: dates,
        values: series.map((d) => d.water),
        goal: goals.water,
        unit: '',
      })) +
      UI.card('Log weight', weightForm());

    Charts.bindRange(app, (days) => { rangeDays = days; render(); });
    bindWeightForm();
  }

  function weightSection(series, change) {
    const weightPoints = series.filter((d) => d.weight != null);
    if (!weightPoints.length) {
      return UI.card('Weight trend', UI.empty('Log your weight below to see a trend.'));
    }
    const chart = Charts.lineChart({
      labels: weightPoints.map((d) => d.date),
      values: weightPoints.map((d) => d.weight),
      unit: ' kg',
    });
    const delta = change == null ? '' :
      `<p class="big-stat">${change > 0 ? '+' : ''}${change} kg over range</p>`;
    return UI.card('Weight trend', delta + chart);
  }

  function weightForm() {
    return `
      <form id="weight-form" class="grid-form">
        <input name="value" type="number" step="0.1" min="0" placeholder="weight (kg)" required />
        <button type="submit">Log weight</button>
      </form>`;
  }

  function bindWeightForm() {
    const wf = document.getElementById('weight-form');
    if (!wf) return;
    wf.addEventListener('submit', (e) => {
      e.preventDefault();
      Store.addWeight(new FormData(wf).get('value'));
    });
  }

  function statBox(label, value) {
    return `<div class="stat-box">
      <span class="stat-value">${UI.esc(String(value))}</span>
      <span class="stat-label">${UI.esc(label)}</span>
    </div>`;
  }

  return { render };
})();
