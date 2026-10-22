# Meridian: solution notes

## Running it

```bash
npm install
npm start            # API on :4000, front end on http://localhost:5173
npm run test:run     # Vitest, once (or `npm test` to watch)
```

Nothing else to configure. The front end proxies `/api` to the backend as the starter did.

## What I built

One page: the portfolio, with committing capital in a drawer on top of it.

- **Summary panel.** Leads with total value (NAV + distributions), since that is
  what the money is worth now and what MOIC is measured against. Next to it:
  "+$7.69M on $25.03M called · 1.31× net MOIC", then NAV, distributed (with DPI),
  committed and unfunded, and a bar showing how much of the commitment has been called.
- **Commitments table.** Sortable by any figure, filterable by status, and paged
  10 at a time on the server. Filter, sort and page live in the URL, so a refresh
  or a shared link keeps them. Pending commitments show "—" (read as "Not yet
  valued") instead of the zeros the API sends. Non-USD rows are tagged and shown
  in their own currency. Losses are red, with a real minus sign.
- **Commit capital drawer.** Two steps:
  1. **Pick a fund.** Open and closing-soon funds, soonest close first, with
     search, minimums in the fund's currency, target IRR, fees, close-date
     warnings ("10 days left", "Closes today", "Past close date") and "You hold
     $2.5M · pending close" where it applies.
  2. **Commit.** The fund's terms, then amount and a terms checkbox. The client
     checks the same rules as the server so most mistakes never make a round
     trip, but the server has the final say:
     - 400 field errors land under the right field.
     - 409 (closed) and 404 (gone) explain what happened, keep what was typed,
       and offer another fund.
     - A network failure says nothing was sent and lets you retry.
     - Double submits are blocked.
     - On success the summary and table refresh *before* the drawer closes, so
       the new row is already there when the toast appears.

Every feature has tests: 108 across the API client, domain rules, query hooks
and each component, using Vitest and Testing Library with a mocked `fetch`.

## Real-data details I handled

These aren't bugs to report, but each needed a decision:

| In the data | What the UI does |
| --- | --- |
| New commitments come back with `nav: 0`, `netIrrPct: 0` rather than `null` | "Valued" is decided by status, not by null checks, so nothing shows 0.0% IRR |
| Commitments have no currency field; 3 are in EUR funds | Currency comes from the fund. EUR rows show € and a badge |
| `/portfolio/summary` adds EUR amounts into USD totals unconverted | A footnote under the summary says so and how many commitments it affects |
| `closing_soon` funds still accept commitments | They're offered, not just `stage=open`. I fetch all funds, since closed ones are also needed for currency lookups |
| Some "open" funds are past their listed close date | Still offered, since the server accepts them, but labelled "Past close date" |
| The server's minimum message always says `$` | Swapped for the fund's symbol on EUR funds |
| An 80-character fund name | Truncated with the full name on hover in the table, and clamped to two lines in the picker |
| `pageSize` defaults to 25 | Requested explicitly everywhere |

## Structure

```
client/src/
  api/        typed client (ApiError with status + fields), endpoints, TanStack Query hooks
  domain/     pure rules and formatting: no React, all unit-tested
  features/   portfolio/ (summary, table, currency note) and commit/ (drawer, picker, form)
  pages/      thin compositions of features
  app/        shell and layout
  theme/      Mantine theme and semantic color tokens (gain, loss, pending, brand)
  test/       fetch mocks, factories, renderWithProviders
```

Data flows one way: components → query hooks → `api/` → `fetch`. Business rules
(what counts as valued, close-date status, holdings per fund) live in `domain/`,
so they're tested without rendering anything. [`docs/data-layer.md`](docs/data-layer.md)
explains the caching and refresh choices.

## Libraries added, and why

- **Mantine** (core, form, hooks, notifications). Accessible components (drawer
  focus trap, labelled inputs, aria-sort-friendly tables) and a theme I could
  bend to a calm, paper-and-ink look. It styles through CSS Modules and CSS
  variables, with no CSS-in-JS runtime.
- **TanStack Query.** Caching, deduping, `keepPreviousData` so re-sorting dims
  rows instead of flashing a skeleton, and invalidation after a commit. Hand-rolling
  this against a 350 ms API is where bugs come from.
- **React Router.** Only one page now, but the table's state lives in the URL
  and unknown addresses get a proper 404.
- **Vitest + React Testing Library** (+ jsdom, user-event, jest-dom). Tests run
  in the same Vite pipeline, and Testing Library queries by role and label,
  which doubles as an accessibility check.
- **Inter and IBM Plex Mono** via Fontsource, self-hosted. Plex Mono with
  tabular numbers keeps columns of figures aligned.

## How I used AI

I used Claude as a pair throughout. It wrote most of the code; I set the
direction, reviewed every step, ran the tests and made each commit myself.

**Workflow.** Before any code I had it study the API and the data and write a
short spec and a mockup. Then we built in small numbered steps: theme → API
client → domain → queries → shell → summary → table → commit flow. Each step
came with its tests, and I committed only when the tests passed. When a step
went wrong I pasted the failure back rather than asking it to "fix tests".

**A few prompts that shaped the result**

- *"Let's ensure we write tests for each feature."* Set the rule that no
  feature lands without tests.
- *"What are the domains doing… lot of complexity. What can we remove without
  breaking tests?"* It had over-built the domain layer (helpers nothing used).
  We cut them.
- *"I feel the portfolio section should take up more space and be more
  prominent, like a proper focus area."* Turned four equal stat cards into one
  panel led by total value.
- *"Do we really need the page, or can we just have a commit button on the
  home screen and open a drawer?"* Dropped the Open funds page. Committing now
  happens in context, and the new row appears behind the closing drawer.

**Where I overrode or corrected it**

- **It overwrote my uncommitted files.** It wrote the API client files without
  reading what was already there, breaking names my query hooks relied on. I
  had it rebuild them to match. The rule since then: read before writing.
- **Routing, back and forth.** I briefly went single-page, then restored
  routing once it was clear the table's URL state needs a router.
- **Green bar.** I asked for the capital-called bar to be green. It pushed
  back: green means gain here, and called capital is money paid in, not a
  return. We settled on a neutral brand indigo, which I then also used for the
  main call to action.
- **Test failures it caused, and the fixes:**
  - **Aborts:** jsdom's `DOMException` isn't an `Error`, so the client now
    detects aborts by name.
  - **Timing:** query tests checked results before React re-rendered, so they
    now wait.
  - **Shared manager:** every test commitment had the same manager, so a
    `/Silverpeak/` query matched four rows. Each now has its own.
  - **Duplicate names:** two "Clear search" buttons share a name, so the test
    now targets the one in the message.
- **Density.** The first summary cards had too much whitespace. I had them
  tightened, then removed a progress bar that wasn't earning its space (it came
  back later inside the focus panel).

## Trade-offs

- **Light theme only.** One polished theme rather than two half-done ones.
- **EUR isn't converted.** There's no FX rate in the API. Inventing one would
  be worse than saying plainly that totals mix currencies.
- **Committing lives in a drawer, not a funds page.** That's quicker in
  context, but there's less room to compare funds side by side. Fine for 13
  funds; a page with filters would make sense at 100.
- **Funds are fetched in one request (up to 100).** Fine at this size. The table
  is paged on the server because it's the list that grows.
- **Client-side validation duplicates the server's rules.** I accepted the
  duplication for instant feedback; server errors still render in the same
  place if the rules drift.

## With more time

- Mark the just-created row as "New" in the table (needs a little state shared
  between the drawer and the table).
- A commitment detail view (`GET /commitments/:id`): called/distributed history
  and fund terms.
- Charts: allocation by strategy and vintage, and NAV over time if the API
  offered history.
- An end-to-end test (Playwright) against the real server, covering the commit
  flow's 201, 400 and 409 paths.
- Dark mode, and an accessibility pass with a screen reader beyond what
  role-based tests catch.
- API suggestions: a `currency` on commitments, a summary per currency, and
  a server-side close for funds past their close date.
