# FitFuel

A zero-backend fitness + nutrition dashboard that runs entirely in your
browser. No build step, no accounts, no server — your data is persisted
locally via `localStorage`.

## Features

- **Dashboard** — today at a glance: calories, water, workouts, weight
- **Nutrition** — log meals with calories/macros vs daily goals
- **Workouts** — log exercises (sets x reps @ weight) with total volume
- **Water** — tap to track glasses against your hydration goal
- **Progress** — log weight and see a dependency-free SVG trend line
- **Settings** — set daily goals; reset all data

## Run it

Any static file server works. For example:

```bash
python3 -m http.server 8777
# then open http://localhost:8777
```

Or just open `index.html` directly in a browser.

## Project structure

```
fitfuel/
  index.html
  css/styles.css
  js/store.js      # data layer (single source of truth)
  js/ui.js         # shared render helpers
  js/nutrition.js  # meals + macros
  js/workouts.js   # exercise logging
  js/tracker.js    # water + weight/progress
  js/app.js        # router + dashboard + settings
```

## Design notes

- **DRY** — one `Store` module owns all persistence; nothing else touches
  `localStorage` directly.
- **YAGNI** — no frameworks, no chart libs; a hand-rolled SVG sparkline.
- **Reactive-ish** — store changes emit a `store:changed` event and the
  active view re-renders.
