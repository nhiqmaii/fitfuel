/**
 * workouts.js — exercise logging (sets / reps / weight).
 */
const Workouts = (() => {
  function render() {
    const workouts = Store.workoutsByDate();

    const form = `
      <form id="workout-form" class="grid-form">
        <input name="exercise" placeholder="Exercise" required />
        <input name="sets" type="number" min="1" placeholder="sets" required />
        <input name="reps" type="number" min="1" placeholder="reps" required />
        <input name="weight" type="number" min="0" placeholder="weight (kg)" />
        <button type="submit">Add set</button>
      </form>`;

    const totalVolume = workouts.reduce(
      (acc, w) => acc + (w.sets * w.reps * (w.weight || 0)),
      0
    );

    const list = workouts.length
      ? `<ul class="item-list">${workouts.map(row).join('')}</ul>`
      : UI.empty('No workouts logged today. Time to move those paws.');

    document.getElementById('app').innerHTML =
      UI.card('Log a Workout', form) +
      UI.card("Today's Volume", `<p class="big-stat">${totalVolume.toLocaleString()} kg lifted</p>`) +
      UI.card("Today's Workouts", list);

    bind();
  }

  function row(w) {
    return `
      <li class="item">
        <div>
          <strong>${UI.esc(w.exercise)}</strong>
          <small>${w.sets} x ${w.reps} @ ${w.weight || 0} kg</small>
        </div>
        <button class="del" data-id="${w.id}">Remove</button>
      </li>`;
  }

  function bind() {
    const form = document.getElementById('workout-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(form);
      Store.addWorkout({
        exercise: f.get('exercise'),
        sets: +f.get('sets') || 0,
        reps: +f.get('reps') || 0,
        weight: +f.get('weight') || 0,
      });
    });
    document.querySelectorAll('#app .del').forEach((btn) =>
      btn.addEventListener('click', () => Store.removeWorkout(btn.dataset.id))
    );
  }

  return { render };
})();
