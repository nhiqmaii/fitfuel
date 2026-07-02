/**
 * nutrition.js — meal logging + daily macro totals.
 * Renders into #app and wires its own events.
 */
const Nutrition = (() => {
  function render() {
    const totals = Store.nutritionTotals();
    const goals = Store.getGoals();
    const meals = Store.mealsByDate();

    const goalsHtml =
      UI.progressBar('Calories', totals.calories, goals.calories, ' kcal') +
      UI.progressBar('Protein', totals.protein, goals.protein, ' g') +
      UI.progressBar('Carbs', totals.carbs, goals.carbs, ' g') +
      UI.progressBar('Fat', totals.fat, goals.fat, ' g');

    const form = `
      <form id="meal-form" class="grid-form">
        <input name="name" placeholder="Meal name" required />
        <input name="calories" type="number" min="0" placeholder="kcal" required />
        <input name="protein" type="number" min="0" placeholder="protein g" />
        <input name="carbs" type="number" min="0" placeholder="carbs g" />
        <input name="fat" type="number" min="0" placeholder="fat g" />
        <button type="submit">Add meal</button>
      </form>`;

    const list = meals.length
      ? `<ul class="item-list">${meals.map(mealRow).join('')}</ul>`
      : UI.empty('No meals logged today. Feed the machine.');

    document.getElementById('app').innerHTML =
      UI.card("Today's Totals", goalsHtml) +
      UI.card('Log a Meal', form) +
      UI.card("Today's Meals", list);

    bind();
  }

  function mealRow(m) {
    return `
      <li class="item">
        <div>
          <strong>${UI.esc(m.name)}</strong>
          <small>${m.calories} kcal · P${m.protein || 0} C${m.carbs || 0} F${m.fat || 0}</small>
        </div>
        <button class="del" data-id="${m.id}">Remove</button>
      </li>`;
  }

  function bind() {
    const form = document.getElementById('meal-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(form);
      Store.addMeal({
        name: f.get('name'),
        calories: +f.get('calories') || 0,
        protein: +f.get('protein') || 0,
        carbs: +f.get('carbs') || 0,
        fat: +f.get('fat') || 0,
      });
    });
    document.querySelectorAll('#app .del').forEach((btn) =>
      btn.addEventListener('click', () => Store.removeMeal(btn.dataset.id))
    );
  }

  return { render };
})();
