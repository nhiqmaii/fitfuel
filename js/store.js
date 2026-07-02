/**
 * store.js — the single source of truth.
 * All persistence goes through here. No feature module should ever
 * touch localStorage directly. DRY or the puppy cries. 
 */
const Store = (() => {
  const KEY = 'fitfuel:v1';

  const defaults = () => ({
    goals: {
      calories: 2000,
      protein: 150, // grams
      carbs: 200,
      fat: 65,
      water: 8, // glasses
    },
    meals: [],     // { id, date, name, calories, protein, carbs, fat }
    workouts: [],  // { id, date, exercise, sets, reps, weight }
    water: {},     // { 'YYYY-MM-DD': glassesCount }
    weights: [],   // { id, date, value }
  });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      return { ...defaults(), ...JSON.parse(raw) };
    } catch (e) {
      console.warn('Store load failed, starting fresh:', e);
      return defaults();
    }
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
    document.dispatchEvent(new CustomEvent('store:changed'));
  }

  // --- helpers ---
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const today = () => new Date().toISOString().slice(0, 10);

  // --- generic accessors ---
  const getState = () => state;
  const getGoals = () => state.goals;

  function setGoals(patch) {
    state.goals = { ...state.goals, ...patch };
    save();
  }

  // --- meals ---
  function addMeal(meal) {
    state.meals.push({ id: uid(), date: today(), ...meal });
    save();
  }
  function removeMeal(id) {
    state.meals = state.meals.filter((m) => m.id !== id);
    save();
  }
  const mealsByDate = (date = today()) => state.meals.filter((m) => m.date === date);

  // --- workouts ---
  function addWorkout(w) {
    state.workouts.push({ id: uid(), date: today(), ...w });
    save();
  }
  function removeWorkout(id) {
    state.workouts = state.workouts.filter((w) => w.id !== id);
    save();
  }
  const workoutsByDate = (date = today()) => state.workouts.filter((w) => w.date === date);

  // --- water ---
  function addWater(n = 1, date = today()) {
    state.water[date] = Math.max(0, (state.water[date] || 0) + n);
    save();
  }
  const waterFor = (date = today()) => state.water[date] || 0;

  // --- weight ---
  function addWeight(value) {
    state.weights.push({ id: uid(), date: today(), value: Number(value) });
    state.weights.sort((a, b) => a.date.localeCompare(b.date));
    save();
  }
  function removeWeight(id) {
    state.weights = state.weights.filter((w) => w.id !== id);
    save();
  }
  const getWeights = () => state.weights;

  // --- danger zone ---
  function reset() {
    state = defaults();
    save();
  }

  // --- aggregates ---
  function nutritionTotals(date = today()) {
    return mealsByDate(date).reduce(
      (acc, m) => ({
        calories: acc.calories + (+m.calories || 0),
        protein: acc.protein + (+m.protein || 0),
        carbs: acc.carbs + (+m.carbs || 0),
        fat: acc.fat + (+m.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  return {
    today, getState, getGoals, setGoals,
    addMeal, removeMeal, mealsByDate,
    addWorkout, removeWorkout, workoutsByDate,
    addWater, waterFor,
    addWeight, removeWeight, getWeights,
    nutritionTotals, reset,
  };
})();
