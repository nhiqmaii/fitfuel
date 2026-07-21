/**
 * insights.js — behavioral pattern detection over your own tracked data.
 *
 * Design: `analyze(state, days)` is PURE. It reads a state snapshot and
 * returns a sorted list of insight objects. `render()` is the only impure
 * function. This split lets future features (Ask Your Data, weekly emails,
 * automated tests) reuse the same analysis without touching the DOM.
 *
 * Every insight is framed as an observation of the user's own data.
 * Nothing here is medical or prescriptive advice.
 */
const Insights = (() => {
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // ---------- shared helpers ----------
  function dayIndex(isoDate) {
    return new Date(isoDate + 'T12:00:00').getDay();
  }

  function pct(part, whole) {
    return whole > 0 ? Math.round((part / whole) * 100) : 0;
  }

  function lastNDates(n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }

  // Aggregate a state into per-day facts for the given date window.
  function buildDailySeries(state, dates) {
    const goals = state.goals;
    return dates.map((date) => {
      const dayMeals = state.meals.filter((m) => m.date === date);
      const calories = dayMeals.reduce((a, m) => a + (+m.calories || 0), 0);
      const protein = dayMeals.reduce((a, m) => a + (+m.protein || 0), 0);
      const water = state.water[date] || 0;
      const workouts = state.workouts.filter((w) => w.date === date).length;
      return {
        date, dayIndex: dayIndex(date),
        calories, protein, water, workouts,
        hitWater: water >= goals.water,
        hitProtein: protein >= goals.protein,
        hitCalories: calories >= goals.calories,
        workedOut: workouts > 0,
      };
    });
  }

  // ---------- individual analyzers ----------
  // Each returns [] or [insight]. Insights have: {title, body, note?, weight}.

  function workoutStreakInsight(series) {
    let cur = 0;
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].workedOut) cur++; else break;
    }
    if (cur < 2) return [];
    return [{
      kind: 'streak',
      title: `You are on a ${cur}-day workout streak`,
      body: `You have logged at least one workout every day for the last ${cur} days.`,
      note: cur >= 5
        ? 'Multi-day streaks build behavioral momentum: the effort to skip a day feels higher than the effort to continue.'
        : null,
      weight: 90,
    }];
  }

  function bestWorkoutDay(series) {
    const counts = new Array(7).fill(0);
    const totals = new Array(7).fill(0);
    series.forEach((d) => {
      if (d.workedOut) counts[d.dayIndex] += 1;
      totals[d.dayIndex] += 1;
    });
    const rates = counts.map((c, i) => totals[i] ? c / totals[i] : 0);
    const max = Math.max(...rates);
    if (max === 0) return [];
    const winners = DAY_NAMES.filter((_, i) => rates[i] === max);
    if (winners.length === 7) return []; // no signal
    return [{
      kind: 'pattern',
      title: `Your workouts cluster on ${listify(winners)}`,
      body: `Across the last ${series.length} days, ${winners.length === 1 ? 'this is' : 'these are'} the day${winners.length > 1 ? 's' : ''} you most reliably train.`,
      note: 'Time-of-week patterns are one of the strongest predictors of habit persistence in behavioral research.',
      weight: 75,
    }];
  }

  function workoutHydrationCorrelation(series) {
    const trainingDays = series.filter((d) => d.workedOut);
    const restDays = series.filter((d) => !d.workedOut);
    if (trainingDays.length < 3 || restDays.length < 3) return [];
    const avg = (arr) => arr.reduce((a, d) => a + d.water, 0) / arr.length;
    const trainAvg = avg(trainingDays);
    const restAvg = avg(restDays);
    if (restAvg < 0.5) return [];
    const diff = trainAvg - restAvg;
    const relative = Math.round((diff / restAvg) * 100);
    if (Math.abs(relative) < 8) return []; // signal too weak
    const dir = relative > 0 ? 'more' : 'less';
    return [{
      kind: 'correlation',
      title: `On workout days you log ${Math.abs(relative)}% ${dir} water`,
      body: `Training days: ${trainAvg.toFixed(1)} glasses on average. Rest days: ${restAvg.toFixed(1)} glasses.`,
      note: 'Correlation is not causation. Your data is showing an association, not a cause.',
      weight: 80,
    }];
  }

  function consistencyInsight(series) {
    if (series.length < 7) return [];
    const stats = {
      water: pct(series.filter((d) => d.hitWater).length, series.length),
      protein: pct(series.filter((d) => d.hitProtein).length, series.length),
      workouts: pct(series.filter((d) => d.workedOut).length, series.length),
    };
    return [{
      kind: 'consistency',
      title: 'Your consistency over this period',
      body: `Hydration goal met: ${stats.water}% of days. Protein goal met: ${stats.protein}% of days. Any workout: ${stats.workouts}% of days.`,
      note: 'Consistency scores are often more actionable than daily numbers because they highlight patterns rather than one-off days.',
      weight: 70,
      breakdown: stats,
    }];
  }

  function gentleSuggestion(series) {
    if (series.length < 7) return [];
    const waterPct = pct(series.filter((d) => d.hitWater).length, series.length);
    const proteinPct = pct(series.filter((d) => d.hitProtein).length, series.length);
    if (waterPct >= 70 && proteinPct < 40) {
      return [{
        kind: 'observation',
        title: 'Hydration is strong, protein is trailing',
        body: `You have hit your water goal on ${waterPct}% of days but your protein goal on only ${proteinPct}%.`,
        note: 'Framing this as an observation, not advice: a small change (like one protein-rich item per day) is often easier to sustain than an overhaul.',
        weight: 60,
      }];
    }
    return [];
  }

  function activityRecap(series) {
    const totalWorkouts = series.reduce((a, d) => a + d.workouts, 0);
    if (totalWorkouts === 0) return [];
    const avgCals = Math.round(
      series.filter((d) => d.calories > 0).reduce((a, d) => a + d.calories, 0) /
      Math.max(1, series.filter((d) => d.calories > 0).length)
    );
    return [{
      kind: 'recap',
      title: `${totalWorkouts} workouts in the last ${series.length} days`,
      body: `On days you logged meals, you averaged ${avgCals} kcal.`,
      weight: 50,
    }];
  }

  // ---------- utilities ----------
  function listify(arr) {
    if (arr.length <= 1) return arr.join('');
    if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
    return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
  }

  // ---------- public API ----------
  function analyze(state, days = 30) {
    const series = buildDailySeries(state, lastNDates(days));
    const hasAnyData = series.some((d) => d.calories || d.water || d.workouts);
    if (!hasAnyData) return [];
    return [
      ...workoutStreakInsight(series),
      ...bestWorkoutDay(series),
      ...workoutHydrationCorrelation(series),
      ...consistencyInsight(series),
      ...gentleSuggestion(series),
      ...activityRecap(series),
    ].sort((a, b) => b.weight - a.weight);
  }

  // ---------- rendering ----------
  let rangeDays = 30;

  function render() {
    const insights = analyze(Store.getState(), rangeDays);
    const app = document.getElementById('app');
    app.innerHTML =
      UI.card('Insights', `
        <p class="muted-copy">Patterns detected in your own tracked data. These are observations, not medical advice.</p>
        ${Charts.rangeControl(rangeDays)}
      `) +
      (insights.length
        ? insights.map(insightCard).join('')
        : UI.card('Not enough data yet', UI.empty(
            'Log a few days of meals, workouts, and water and come back. Or load sample data from Settings to see how this feature works.'
          )));

    Charts.bindRange(app, (days) => { rangeDays = days || 30; render(); });
  }

  function insightCard(ins) {
    const badge = `<span class="insight-badge insight-${ins.kind}">${ins.kind}</span>`;
    const note = ins.note ? `<p class="insight-note"><strong>Why this matters:</strong> ${UI.esc(ins.note)}</p>` : '';
    return `<section class="card insight-card">
      ${badge}
      <h2 class="insight-title">${UI.esc(ins.title)}</h2>
      <p class="insight-body">${UI.esc(ins.body)}</p>
      ${note}
    </section>`;
  }

  return { analyze, render };
})();
