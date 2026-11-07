# Meridian

Goal-based investing, the way Acorns or Wealthfront do it: name what you're
saving for, pick a ready-made portfolio, and a monthly deposit invests toward
it. Meridian shows what it's all worth, how each goal is tracking, and
everything that's happened.

<!-- Add screenshots to docs/screenshots/ and uncomment:
![Dark mode](docs/screenshots/dark.png)
![A goal, adding money](docs/screenshots/goal.png)
-->

React 19 · TypeScript · Mantine · TanStack Query, over a small Express mock API
with realistic, deliberately messy data.

## What it does

- **Your investments.** The total, the all-time gain as a pill
  ("▲ $1,883 · 12.2%"), and a chart of value against what you put in, with the
  gap between the lines shaded as your growth. Scrub across the chart (mouse or
  arrow keys) and the headline shows that month; let go and it returns to today.
  The line draws in on load, and switches between 6M / 1Y / All.
- **Goals.** Each with its portfolio, a 1–5 risk level, its monthly amount, a
  progress bar, and a projection: "On track for Oct 2028". Goals that haven't
  started say when they will; paused goals say so.
- **A goal, up close.** Click one for its numbers and recent activity, then:
  - **Add money:** quick amounts, and the payoff shown before you commit:
    "This moves House deposit from Oct 2028 to Sep 2028."
  - **Edit:** rename, change the target or monthly amount, or pause deposits,
    with the new date shown against the old one before you save.
- **New goal,** in three labelled steps: what you're saving for (with quick
  picks), how it's invested (each portfolio explained, with a good default), and
  how much each month, with a live projection.
- **Earned moments, not gamification.** Each bar has quarter notches; a deposit
  that crosses one gets a brief glow and "Halfway to House deposit". Each goal
  counts its on-time months in a row, and pausing holds the count rather than
  breaking it. Nothing celebrates market moves.
- **Delete or close.** A goal with nothing in it can be deleted, with Undo. A
  funded goal is closed instead, after a confirmation that spells out the sale
  and withdrawal.
- **Activity.** Every deposit, dividend, fee and withdrawal, grouped by day.
  A month's scheduled deposits share one line ("Monthly deposits · 4 goals ·
  +$1,200") that opens to show each goal's share. Filter by type or goal, with
  the filters kept in the URL; "Show more" loads older days.
- **Follows your device.** Light or dark to match the system setting; the account menu (the "LB" avatar) can pin Light (warm paper and ink) or Dark instead, and remembers the choice.

## The details that matter

- **Writes feel finished.** A drawer closes only once the page has the new
  numbers. Then the total counts up to its new value, and a toast confirms.
- **Errors land where they belong.**
  - Mistakes are caught before sending.
  - Server messages appear under the right field ("You can add up to $10,000 a
    day ($200 left today)").
  - A closed portfolio or missing goal explains itself and offers a way back.
  - A dropped connection says nothing was sent, and keeps what you typed.
- **Honest numbers.** A goal that hasn't started shows "Starts Dec 1", not $0
  and 0% (the API sends zeros, not blanks). Projections say they assume a
  return and aren't guaranteed.
- **Accessible.**
  - Every control is labelled, and the tests find things by role and name.
  - The chart has a one-sentence summary for screen readers and works from the
    keyboard. Risk dots are read as "Higher risk, 4 of 5".
  - Drawers trap and return focus, and there's a skip link.
  - Animations stop for people who prefer reduced motion.

## Running it

Requires Node.js 20.19+ or 22.12+ (`.nvmrc` pins 22).

```bash
npm install
npm run dev        # API on :4000, app on http://localhost:5173
npm run test:run   # the test suite (npm test to watch)
```

The API waits ~350 ms per request on purpose, so loading states are real.
`LATENCY_MS=0 npm run dev` turns that off. The sample data resets whenever the
server restarts. Endpoints are documented in [docs/API.md](docs/API.md).

## Deploying

In production, one Express server serves both the mock API and the built app,
so the demo is a single service at a single URL. A [Render](https://render.com)
blueprint is included (`render.yaml`):

1. In Render: **New → Blueprint**, then pick this repo. It reads `render.yaml`.
2. Render runs `npm run build`, then starts `node server/index.js`.

Any host that runs Node works the same way: build with `npm install --include=dev && npm run build`,
start with `node server/index.js`, and it listens on `PORT`. On Render's free
plan the service sleeps when idle, so the first visit can take up to a minute,
and the sample data is shared by all visitors and resets on each restart.

## How it's built

```
client/src/
  api/        typed client (ApiError with status + field messages), endpoints, TanStack Query hooks
  domain/     rules as plain functions: progress, projections, risk, formatting (unit-tested)
  features/   overview/ (total + chart), goals/ (list + drawers), activity/ (table), shared/
  hooks/      useCountUp
  theme/      Mantine theme and color tokens for both schemes
  test/       a fake of the whole API, data factories, render helpers
server/       the Express mock API and its sample data
```

Data flows one way: components → query hooks → endpoints → client → server.
[docs/architecture.md](docs/architecture.md) walks through the system with diagrams:
what runs where, components, state, a write end to end, errors, theming and tests.
[docs/data-layer.md](docs/data-layer.md) explains the caching, what each write
refreshes, and why writes never retry.

| | Choice | Why |
| --- | --- | --- |
| Components | Mantine | Accessible drawers, inputs and tables; a theme that carries two looks through one set of color tokens |
| Server data | TanStack Query | Caching, loading and error states, cancelling stale requests, refreshing exactly what a write changed |
| Routing | React Router | The activity view lives in the URL; unknown addresses get a proper page |
| Chart | Hand-built SVG | One line chart didn't justify a charting library; this one is small, themable and keyboard-accessible |
| Testing | Vitest, Testing Library | Tests by role and label double as an accessibility check |
| Type | Inter, IBM Plex Mono | Inter throughout; Plex Mono for figures in light mode |

## Background

Meridian started as a timeboxed front-end exercise built on a provided API
for private-markets investing. I've since rebuilt it around goal-based
investing, with my own mock API and data, so that anyone can follow it without
a glossary.

[docs/how-it-was-built.md](docs/how-it-was-built.md) covers the decisions, the
pivot, how I worked with AI, and what I'd do next.
