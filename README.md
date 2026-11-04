# Meridian

A portfolio dashboard for private-markets investors: see what your
commitments are worth, and commit capital to new funds.

<!-- Add screenshots to docs/screenshots/ and uncomment:
![Portfolio overview](docs/screenshots/portfolio.png)
![Committing capital](docs/screenshots/commit.png)
-->

Built with React 19, TypeScript, Mantine and TanStack Query on top of a small
Express API with realistic, deliberately messy data.

## Why it's interesting

Private-markets investing doesn't work like a brokerage account. You commit
an amount, the fund draws it down over years, values are reported quarterly,
and the data is full of edge cases. Meridian is about presenting that clearly:

- **Total value first.** The summary leads with what the money is worth today,
  counting cash already returned (NAV + distributions), then the gain on the
  capital actually called and the net MOIC. A bar shows how much of the
  commitment has been called and how much is still owed.
- **A table that holds up.** Sortable by any figure, filterable by status and
  paged on the server, with its state in the URL so a refresh or a shared link
  keeps the view. Fixed column widths, so sorting never shifts the layout.
- **Committing capital without leaving the page.** A two-step drawer: pick a
  fund (soonest close first, with close-date warnings and what you already
  hold), then enter an amount and accept the terms. Field errors from the
  server land under the right field, and a closed fund, a missing fund or a
  dropped connection each get a clear message that keeps what you typed. On
  success, the portfolio refreshes before the drawer closes, and the totals
  count up to their new values so you see the money land.
- **Honest about the data.** Unvalued commitments show "—", not 0%. EUR amounts
  show in euros, and the summary notes that the API adds them into USD totals
  unconverted. Funds past their listed close date are labelled, not hidden.

## Tech stack

| Area | Choice | Why |
| --- | --- | --- |
| UI | React 19, TypeScript, Vite | The starter; fast dev server and build |
| Components | Mantine (core, form, notifications) | Accessible components and a theme that bends to a calm, paper-and-ink look; CSS Modules, no CSS-in-JS runtime |
| Server data | TanStack Query | Caching, loading and error states, and refreshing after a commit |
| Routing | React Router | Table state in the URL, and a proper not-found page |
| Testing | Vitest, React Testing Library | Tests by role and label, which doubles as an accessibility check |
| Type | Inter, IBM Plex Mono | Inter for text; Plex Mono with even-width digits so figures line up |

## Running it

Requires Node.js 20.19+ or 22.12+ (`.nvmrc` pins 22).

```bash
npm install
npm start          # API on http://localhost:4000, app on http://localhost:5173
npm run test:run   # run the test suite once (npm test to watch)
```

The API adds about 350 ms of latency to every request on purpose, to keep
loading states honest. Use `LATENCY_MS=0 npm start` to turn it off. API
reference: Swagger at http://localhost:4000/docs, or [docs/API.md](docs/API.md).

## How it's organised

```
client/src/
  api/        typed client, endpoints, TanStack Query hooks
  domain/     business rules and formatting: plain functions, unit-tested
  features/   portfolio/ (summary, table) and commit/ (drawer, fund picker, form)
  hooks/      shared React hooks (count-up animation)
  pages/      thin compositions of features
  app/        shell and layout
  theme/      Mantine theme and colour tokens (gain, loss, pending, brand)
  test/       fetch mocks, data factories, render helpers
```

Data flows one way: components → query hooks → API client → server. Rules
such as "is this commitment valued yet?" or "how close is this fund to
closing?" live in `domain/`, so they're tested without rendering anything.
[docs/data-layer.md](docs/data-layer.md) explains the caching and refresh
choices.

## Accessibility

- Every control has a label, and the tests find elements by role and name.
- Sortable headers announce their sort order; values not yet reported are
  read as "Not yet valued" rather than a dash.
- A skip link, visible focus rings, and a drawer that traps and returns focus.
- Animations (the count-up, the header pulse) are off for people who prefer
  reduced motion.

## Background

Meridian started as a timeboxed front-end exercise: a provided Express API and
dataset, with the brief to build a dashboard on top of it. The original brief
is in [docs/BRIEF.md](docs/BRIEF.md). I've kept developing it since.
[SOLUTION.md](SOLUTION.md) covers the decisions, trade-offs, how I worked with
AI tools, and what I'd do next.

The backend (`server.js`, `src/data/`) and the API docs came with the exercise;
the front end in `client/` is mine.
