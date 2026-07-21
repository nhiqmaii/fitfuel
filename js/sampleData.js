/**
 * sampleData.js — generates ~60 days of plausible demo data.
 * Kept out of Store so persistence stays a pure CRUD concern.
 * Used for recruiter demos + first-run "just show me what this looks like".
 */
const SampleData = (() => {
  const MEALS = [
    { name: 'Oatmeal + berries', calories: 380, protein: 12, carbs: 62, fat: 8 },
    { name: 'Greek yogurt bowl',  calories: 290, protein: 22, carbs: 30, fat: 6 },
    { name: 'Chicken rice bowl',  calories: 620, protein: 45, carbs: 70, fat: 14 },
    { name: 'Salmon + veggies',   calories: 540, protein: 40, carbs: 25, fat: 26 },
    { name: 'Turkey sandwich',    calories: 470, protein: 32, carbs: 48, fat: 14 },
    { name: 'Protein smoothie',   calories: 310, protein: 30, carbs: 32, fat: 5 },
    { name: 'Pasta + meatballs',  calories: 720, protein: 38, carbs: 82, fat: 22 },
    { name: 'Tofu stir-fry',      calories: 490, protein: 24, carbs: 58, fat: 18 },
    { name: 'Egg + avocado toast',calories: 420, protein: 18, carbs: 38, fat: 22 },
    { name: 'Apple + almonds',    calories: 220, protein: 6,  carbs: 24, fat: 12 },
  ];

  const EXERCISES = [
    'Squat', 'Bench press', 'Deadlift', 'Overhead press',
    'Row', 'Pull-up', 'Lunges', 'Plank',
  ];

  // Seeded PRNG so demos are reproducible.
  function rng(seed) {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  function generate(days = 60, seed = 42) {
    const rand = rng(seed);
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    const jitter = (base, spread) => Math.round(base + (rand() - 0.5) * spread);

    const meals = [];
    const workouts = [];
    const water = {};
    const weights = [];

    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    let baseWeight = 65 + rand() * 3;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      const dow = d.getDay(); // 0=Sun, 6=Sat

      // 2-4 meals per day
      const mealCount = 2 + Math.floor(rand() * 3);
      for (let j = 0; j < mealCount; j++) {
        meals.push({ id: uid(), date, ...pick(MEALS) });
      }

      // Workouts skew to Tue/Thu/Sat (behavioral pattern for insights later)
      const workoutOdds = [0.15, 0.35, 0.75, 0.35, 0.75, 0.35, 0.65][dow];
      if (rand() < workoutOdds) {
        const count = 1 + Math.floor(rand() * 2);
        for (let k = 0; k < count; k++) {
          workouts.push({
            id: uid(), date,
            exercise: pick(EXERCISES),
            sets: 3 + Math.floor(rand() * 2),
            reps: 8 + Math.floor(rand() * 5),
            weight: 20 + Math.floor(rand() * 40),
          });
        }
      }

      // Water: usually near goal, occasionally slacks
      water[date] = Math.max(0, jitter(7, 4));

      // Weight logged ~2x per week, slow downtrend
      if (rand() < 0.3) {
        baseWeight -= 0.02 + rand() * 0.04;
        weights.push({
          id: uid(), date,
          value: +(baseWeight + (rand() - 0.5) * 0.4).toFixed(1),
        });
      }
    }

    weights.sort((a, b) => a.date.localeCompare(b.date));

    return { meals, workouts, water, weights };
  }

  function load(days = 60) {
    const generated = generate(days);
    Store.replace({ ...generated, goals: Store.getGoals() });
  }

  return { generate, load };
})();
