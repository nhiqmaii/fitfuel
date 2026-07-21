/**
 * tracker.js — hydration view.
 * (Weight/progress moved to progress.js so each module owns one job.)
 */
const Tracker = (() => {
  function renderWater() {
    const glasses = Store.waterFor();
    const goal = Store.getGoals().water;
    const cups = Array.from({ length: Math.max(goal, glasses) }, (_, i) =>
      `<span class="cup ${i < glasses ? 'full' : ''}">${i < glasses ? '#' : 'o'}</span>`
    ).join('');

    document.getElementById('app').innerHTML =
      UI.card('Hydration', `
        ${UI.progressBar('Water', glasses, goal, ' glasses')}
        <div class="cups">${cups}</div>
        <div class="btn-row">
          <button id="water-add">+ Add a glass</button>
          <button id="water-sub" class="ghost">- Remove</button>
        </div>
      `);

    document.getElementById('water-add').addEventListener('click', () => Store.addWater(1));
    document.getElementById('water-sub').addEventListener('click', () => Store.addWater(-1));
  }

  return { renderWater };
})();
