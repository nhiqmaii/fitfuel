/**
 * askData.js — natural-language-ish Q&A over the user's own local data.
 *
 * Deliberately NOT an LLM. Every answer is:
 *   - deterministic (same question, same answer, always)
 *   - grounded in real numbers from Store
 *   - honest about limitations (if we do not track it, we say so)
 *
 * Intent matching is a simple keyword scorer. That is enough for a demo
 * and keeps the whole thing offline + privacy-safe. Sells the "your data
 * never leaves this browser" story better than any GPT wrapper could.
 */
const AskData = (() => {
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const transcript = []; // {q, a}, newest last

  // ---------- data helpers (small, focused) ----------
  function avg(nums) {
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  }

  function daysInWindow(state, days) {
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates.map((date) => ({
      date,
      dayIdx: new Date(date + 'T12:00:00').getDay(),
      calories: state.meals.filter((m) => m.date === date).reduce((a, m) => a + (+m.calories || 0), 0),
      protein: state.meals.filter((m) => m.date === date).reduce((a, m) => a + (+m.protein || 0), 0),
      water: state.water[date] || 0,
      workouts: state.workouts.filter((w) => w.date === date).length,
    }));
  }

  // ---------- intents ----------
  // Each: {id, keywords (array of groups; must match one word per group), answer(state)}
  const INTENTS = [
    {
      id: 'workout-count',
      keywords: [['how', 'many', 'total', 'count'], ['workout', 'workouts', 'exercise', 'train', 'training']],
      answer: (s) => {
        const total = s.workouts.length;
        const last30 = daysInWindow(s, 30).reduce((a, d) => a + d.workouts, 0);
        return `You have logged <strong>${total}</strong> workouts total, <strong>${last30}</strong> in the last 30 days.`;
      },
    },
    {
      id: 'workout-day-pattern',
      keywords: [['when', 'what', 'which'], ['workout', 'workouts', 'exercise', 'train', 'day', 'days']],
      answer: (s) => {
        const series = daysInWindow(s, 60);
        const counts = new Array(7).fill(0);
        const totals = new Array(7).fill(0);
        series.forEach((d) => {
          if (d.workouts > 0) counts[d.dayIdx]++;
          totals[d.dayIdx]++;
        });
        const rates = counts.map((c, i) => totals[i] ? c / totals[i] : 0);
        const max = Math.max(...rates);
        if (max === 0) return `No workouts logged in the last 60 days.`;
        const winners = DAY_NAMES.filter((_, i) => rates[i] === max);
        const pct = Math.round(max * 100);
        return `Over the last 60 days you have most often worked out on <strong>${listify(winners)}</strong> (${pct}% of those days had a workout).<br><small>Note: FitFuel does not currently track time of day, only date.</small>`;
      },
    },
    {
      id: 'workout-streak',
      keywords: [['streak', 'consecutive', 'row'], ['workout', 'exercise', 'training']],
      answer: (s) => {
        const series = daysInWindow(s, 90);
        let cur = 0;
        for (let i = series.length - 1; i >= 0; i--) {
          if (series[i].workouts > 0) cur++; else break;
        }
        return cur === 0
          ? `No active workout streak. Log one today to start one.`
          : `Your current workout streak is <strong>${cur} day${cur > 1 ? 's' : ''}</strong>.`;
      },
    },
    {
      id: 'water-avg',
      keywords: [['average', 'avg', 'much', 'usually'], ['water', 'hydration', 'drink']],
      answer: (s) => {
        const series = daysInWindow(s, 30);
        const logged = series.map((d) => d.water).filter((v) => v > 0);
        if (!logged.length) return `No hydration data logged in the last 30 days.`;
        const a = avg(logged).toFixed(1);
        return `On days you logged hydration in the last 30 days, you averaged <strong>${a} glasses</strong>.`;
      },
    },
    {
      id: 'calories-avg',
      keywords: [['average', 'avg', 'much', 'usually'], ['calorie', 'calories', 'eat', 'eating']],
      answer: (s) => {
        const series = daysInWindow(s, 30);
        const logged = series.map((d) => d.calories).filter((v) => v > 0);
        if (!logged.length) return `No meals logged in the last 30 days.`;
        return `On days you logged meals in the last 30 days, you averaged <strong>${Math.round(avg(logged))} kcal</strong>.`;
      },
    },
    {
      id: 'protein-avg',
      keywords: [['average', 'avg', 'much', 'usually', 'goal', 'hit'], ['protein']],
      answer: (s) => {
        const series = daysInWindow(s, 30);
        const logged = series.map((d) => d.protein).filter((v) => v > 0);
        if (!logged.length) return `No protein data logged in the last 30 days.`;
        const goalHits = series.filter((d) => d.protein >= s.goals.protein).length;
        return `On days you logged meals, you averaged <strong>${Math.round(avg(logged))} g</strong> of protein.
                You hit your protein goal on <strong>${goalHits} of the last 30 days</strong>.`;
      },
    },
    {
      id: 'consistency',
      keywords: [['consistent', 'consistency', 'reliable'], ['am', 'i', 'how']],
      answer: (s) => {
        const insights = Insights.analyze(s, 30);
        const c = insights.find((i) => i.kind === 'consistency');
        return c ? c.body : `Log at least a week of data to compute consistency.`;
      },
    },
    {
      id: 'weight-change',
      keywords: [['lost', 'gained', 'change', 'delta', 'much'], ['weight', 'weigh', 'kg', 'lbs']],
      answer: (s) => {
        if (s.weights.length < 2) return `Log at least two weight entries to see a change.`;
        const first = s.weights[0];
        const last = s.weights[s.weights.length - 1];
        const delta = +(last.value - first.value).toFixed(1);
        const dir = delta === 0 ? 'unchanged' : (delta > 0 ? `up ${delta} kg` : `down ${Math.abs(delta)} kg`);
        return `From ${first.date} (${first.value} kg) to ${last.date} (${last.value} kg): <strong>${dir}</strong>.`;
      },
    },
    {
      id: 'best-workout-day',
      keywords: [['best', 'most', 'top', 'favorite'], ['workout', 'workouts', 'day', 'days']],
      answer: (s) => {
        const insights = Insights.analyze(s, 30);
        const p = insights.find((i) => i.kind === 'pattern');
        return p ? `${p.title}. ${p.body}` : `Not enough of a day-of-week pattern yet.`;
      },
    },
    {
      id: 'insights-summary',
      keywords: [['insight', 'insights', 'pattern', 'patterns', 'tell', 'summary'], ['me', 'my', 'data', 'about']],
      answer: (s) => {
        const insights = Insights.analyze(s, 30);
        if (!insights.length) return `Not enough data yet. Try loading sample data from Settings.`;
        const items = insights.slice(0, 3).map((i) => `<li><strong>${escape(i.title)}</strong> &mdash; ${escape(i.body)}</li>`).join('');
        return `Top ${Math.min(3, insights.length)} patterns from the last 30 days:<ul class="ask-list">${items}</ul>`;
      },
    },
    {
      id: 'time-of-day',
      // Explicitly caught to give an honest "we do not track that" answer
      keywords: [['what', 'when'], ['time', 'hour', 'morning', 'evening', 'night']],
      answer: () =>
        `FitFuel does not currently track time of day, only dates. If you would like time-of-day insights, that would need to be added to the data model first.`,
    },
    {
      id: 'privacy',
      keywords: [['where', 'is', 'who'], ['data', 'stored', 'sees', 'access']],
      answer: () =>
        `All FitFuel data is stored on this device. It never leaves. See the Privacy tab for the full breakdown.`,
    },
  ];

  // ---------- intent scoring ----------
  function tokenize(q) {
    return q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  }

  function scoreIntent(intent, tokens) {
    // Every keyword GROUP must have at least one hit; score = total hits.
    let total = 0;
    for (const group of intent.keywords) {
      const hits = group.filter((k) => tokens.includes(k)).length;
      if (hits === 0) return 0;
      total += hits;
    }
    return total;
  }

  function match(question) {
    const tokens = tokenize(question);
    let best = null;
    let bestScore = 0;
    for (const intent of INTENTS) {
      const score = scoreIntent(intent, tokens);
      if (score > bestScore) { best = intent; bestScore = score; }
    }
    return best;
  }

  function answer(question) {
    const intent = match(question);
    if (!intent) {
      return `I could not match that question to any known intent. Try one of the suggested questions below, or rephrase using words like "how many workouts", "average water", "streak", "weight change", or "consistency".`;
    }
    return intent.answer(Store.getState());
  }

  // ---------- rendering ----------
  const SUGGESTIONS = [
    'How consistent am I?',
    'When do I usually work out?',
    'What is my workout streak?',
    'How much water do I average?',
    'How much have I changed weight?',
    'Tell me the top patterns in my data.',
    'Where is my data stored?',
  ];

  function escape(s) { return UI.esc(s); }

  function render() {
    const app = document.getElementById('app');
    app.innerHTML =
      UI.card('Ask Your Data', `
        <p class="muted-copy">
          Ask questions about your own tracked data. Fully local, fully deterministic.
          No LLM, no API keys, no network calls. Your data never leaves this browser.
        </p>
        <form id="ask-form" class="ask-form">
          <input id="ask-input" type="text" placeholder="e.g. how many workouts have I logged?" autocomplete="off" />
          <button type="submit">Ask</button>
        </form>
        <div class="ask-chips">
          ${SUGGESTIONS.map((q) => `<button type="button" class="ask-chip" data-q="${escape(q)}">${escape(q)}</button>`).join('')}
        </div>
      `) +
      transcriptCard();

    bind();
    document.getElementById('ask-input').focus();
  }

  function transcriptCard() {
    if (!transcript.length) {
      return UI.card('Answers', UI.empty('Ask something above to see an answer here.'));
    }
    const items = [...transcript].reverse().map(qa =>
      `<div class="ask-qa">
        <p class="ask-q"><strong>Q:</strong> ${escape(qa.q)}</p>
        <p class="ask-a"><strong>A:</strong> ${qa.a}</p>
      </div>`
    ).join('');
    return UI.card('Answers', items + `
      <div class="btn-row"><button id="ask-clear" class="ghost">Clear history</button></div>
    `);
  }

  function bind() {
    const form = document.getElementById('ask-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submit(document.getElementById('ask-input').value.trim());
    });
    document.querySelectorAll('.ask-chip').forEach((btn) => {
      btn.addEventListener('click', () => submit(btn.dataset.q));
    });
    const clear = document.getElementById('ask-clear');
    if (clear) clear.addEventListener('click', () => { transcript.length = 0; render(); });
  }

  function submit(q) {
    if (!q) return;
    transcript.push({ q, a: answer(q) });
    render();
  }

  function listify(arr) {
    if (arr.length <= 1) return arr.join('');
    if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
    return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
  }

  return { render, answer, match };
})();
