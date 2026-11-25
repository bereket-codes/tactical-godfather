# Tactical Godfather

A React 19 squad builder. Pick a formation, drag or click 17 players into it, shape the tactics, and let Sir Alex rate the setup and name the weakest link.

[![Tactical Godfather](https://bereket-codes.github.io/TacticalGodfather.jpg)](https://bereket-codes.github.io/tactical-godfather/)

**Live:** https://bereket-codes.github.io/tactical-godfather/

## What it does

- **Formations** — 4-3-3, 4-2-3-1 and 4-4-2, each with its own slot map.
- **Drag and drop** — drag a player card onto a slot, or click a player and then click where he should play (keyboard-friendly path).
- **Position fit** — the engine classifies every player against the slot as *natural*, *adapted* or *out of position*, derived from the formation rather than hardcoded per slot.
- **Best XI** — fills the lineup automatically so you have a sane starting point.
- **Tactics** — tempo, defensive line and pressing sliders feed into the verdict.
- **The Godfather** — a rule-based advisor reads the lineup and returns a rating plus written verdict.

## Tech

React 19 · `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/modifiers` · Framer Motion · Create React App · deployed to GitHub Pages by a GitHub Actions workflow on every push to `main`.

## How to run

```bash
git clone https://github.com/bereket-codes/tactical-godfather.git
cd tactical-godfather
npm install
npm start          # http://localhost:3000
```

```bash
npm run build      # production build in /build
```

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages.

## Structure

```
src/
  App.js                 board, drag context, tactics, verdict panel
  components/Pitch.js    the pitch and its slots
  components/PlayerCard.js
  data/formations.js     slot maps per formation
  data/players.json      the 17-player squad
  engine/positionFit.js  natural / adapted / out-of-position
  engine/lineup.js       lineup helpers
  engine/godfather.js    rules, verdict and advice
```

## Roadmap

- Convert to TypeScript.
- Add tests around the position-fit and verdict rules.

## License

MIT — see [LICENSE](LICENSE).
