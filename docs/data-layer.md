# How data flows through the app

Four small layers, each with one job. Components only ever touch the top two.

```mermaid
flowchart LR
  UI[Components] --> Q[api/queries.ts<br/>TanStack Query hooks]
  UI --> D[domain/<br/>rules about the data]
  Q --> E[api/endpoints.ts<br/>one function per endpoint]
  E --> C[api/client.ts<br/>fetch + errors]
  C --> S[(Express API<br/>/api via Vite proxy)]
```

| Layer | Job | Knows about React? |
|---|---|---|
| `api/client.ts` | Make the HTTP call, turn failures into an `ApiError` | No |
| `api/endpoints.ts` | One typed function per endpoint in `docs/API.md` | No |
| `api/queries.ts` | Cache, share and refresh server data (TanStack Query) | Yes |
| `domain/` | Answer questions about the data ("is this valued yet?") | No |

---

## What TanStack Query does here

Without it, every component that needs data would write its own `useEffect` +
`fetch` + `useState` for loading and errors. TanStack Query does that once, and
adds a cache in front of the API.

### 1. Each request gets a key, and the result is cached under it

```ts
queryKeys.summary                      // ['summary']
queryKeys.commitments.list(params)     // ['commitments', 'list', { sort: 'nav', ... }]
queryKeys.commitments.detail('cm_0007')// ['commitments', 'detail', 'cm_0007']
queryKeys.funds.list(params)           // ['funds', 'list', { pageSize: 100 }]
```

Two components asking for the same key share one request and one result. The
funds list, for example, is used by the funds table, the fund picker and the
currency lookup, but fetched once.

### 2. Loading and error states come for free

Every hook returns `{ data, isPending, isError, error, refetch }`. Components
render a skeleton, an error with a retry button, or the data. No hand-written
loading flags.

### 3. Data is reused for 30 seconds before it's refetched

`staleTime: 30_000` (in `lib/queryClient.ts`). Opening the commit drawer shows
the fund list instantly (the table already fetched it) instead of waiting 350 ms again. Coming
back to the browser tab after a while refreshes it quietly in the background.

### 4. Re-sorting doesn't flash a skeleton

`useCommitments` uses `placeholderData: keepPreviousData`. Clicking a column
header keeps the current rows on screen while the newly sorted page loads, then
swaps them in.

### 5. Out-of-date responses are ignored

Each request gets an `AbortSignal`. Click "sort by NAV" then "sort by IRR"
quickly, and the first request is cancelled, so its slower response can't
overwrite the newer one.

### 6. Committing refreshes exactly what changed

`useCommitToFund` is a mutation (a write). When the POST succeeds it marks
`['summary']` and everything under `['commitments']` as out of date, so the
headline numbers and every commitments list refetch. The form stays in its
"Submitting…" state until that refresh finishes, so the new row is already
there when it closes.

If the POST fails with **409** (fund closed) or **404** (fund gone), the funds
list is refreshed instead, so the closed fund disappears from the picker.

### 7. Retries are deliberate

- Reads retry **once** (a blip shouldn't show an error).
- The commit **never** retries automatically. A retried POST could create a
  duplicate commitment. The user retries by pressing the button again.

---

## What `domain/` does

Plain functions, no React, no fetching. Each one exists because the real data
has a quirk, and putting the rule in one place means every screen handles it
the same way.

| Function | The data quirk it handles |
|---|---|
| `isValued(c)` | New commitments come back with `0` for NAV/IRR/MOIC instead of `null`. Without this, a fresh commitment shows "0.0% IRR". It checks the status instead. |
| `currencyOf(c, funds)` | Commitments have no currency field; three are in EUR funds. The currency comes from the fund. Also used to flag the summary, which adds EUR amounts into USD totals without converting. |
| `committableFunds(funds)` | `stage=open` misses `closing_soon` funds, which still accept commitments. Sorted soonest-close first. |
| `closeInfo(fund)` | Two "open" funds have close dates in the past; two close within days. Returns `passed` / `today` / `soon` / `scheduled`. |
| `holdingsByFund(cs)` | Powers "You already hold $X in this fund" in the commit flow. |
| `calledFraction(c)` | Called ÷ committed for the progress bars, guarded against dividing by zero. |
| `format.ts` | Money (including the stray cents in some NAVs), percents with a real minus sign, multiples, dates parsed without timezone shifts, and swapping the server's hard-coded "$" for "€" in error messages. |

Because they're pure functions, each is unit-tested in isolation
(`domain/*.test.ts`) without rendering anything.
