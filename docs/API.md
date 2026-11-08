# Meridian mock API

A small Express server (`server/index.js`) with in-memory sample data
(`server/data.js`). Changes last until it restarts. Sample dates are relative
to today, so the data never looks stale.

- Base URL: `http://localhost:4000/api` (the front end reaches it at `/api` through the Vite proxy)
- Every request waits `LATENCY_MS` (default 350) so loading states are real. `LATENCY_MS=0 npm start` turns it off.
- Lists return `{ data, meta: { page, pageSize, total, totalPages } }`.
- Errors return `{ error, fields? }`:
  - **400** validation, with a message per field
  - **404** not found
  - **409** conflict, e.g. a portfolio closed to new goals

## Reads

| Endpoint | Returns |
| --- | --- |
| `GET /summary` | `value`, `contributed`, `gain`, `gainPct`, `monthlyTotal` (goals not paused), `nextDepositDate`, `goalCount`, `currency` |
| `GET /history` | `{ data: [{ month: "2025-12", value, contributed }] }`, 24 months, oldest first |
| `GET /portfolios` | Portfolios: `id`, `name`, `category`, `risk` (1–5), `minMonthly`, `feePct`, `assumedReturnPct`, `status` (`open` / `closed`), `description`. Filter: `?status=` |
| `GET /goals` | Goals: `id`, `name`, `portfolioId`, `portfolioName`, `risk`, `target`, `monthlyAmount`, `contributed`, `value`, `returnPct`, `status`, `nextDepositDate`, `streak` (on-time monthly deposits in a row; pausing holds it), `createdAt`. Filter: `?status=active\|scheduled\|paused` |
| `GET /goals/:id` | One goal, or 404 |
| `GET /activity` | Deposits, dividends, fees and withdrawals: `id`, `date`, `type`, `description`, `goalId`, `goalName`, `amount` (negative for fees and withdrawals), `recurring` (true on scheduled monthly deposits). Query: `type`, `goalId`, `sort=date\|amount`, `order=asc\|desc`, `page`, `pageSize` (default 25, max 100) |

Goal statuses: `scheduled` (created, first deposit not yet made), `active`,
`paused` (monthly deposits stopped; still invested).

## Writes

### `POST /goals`

```json
{ "portfolioId": "core-growth", "name": "Wedding", "target": 15000, "monthlyAmount": 400, "acknowledged": true }
```

- **201:** the new goal, `scheduled`, with `value: 0` and `returnPct: 0` (zeros, not nulls). It's added to the top of `GET /goals`.
- **400** fields:
  - `name`: required, under 40 characters
  - `target`: at least $100
  - `monthlyAmount`: at least the portfolio's `minMonthly`, at most $10,000
  - `acknowledged`: must be true
- **404:** unknown portfolio. **409:** portfolio closed.

### `PATCH /goals/:id`

Any of `name`, `target`, `monthlyAmount`, `paused`.

- **200:** the updated goal.
- **400** fields: `name`; `target` (must be above the current value); `monthlyAmount` (at least the portfolio minimum, unless pausing).
- **404:** unknown goal.

### `POST /goals/:id/deposits`

```json
{ "amount": 250 }
```

- **201:** `{ goal, activity }`. Updates the goal, the totals, the last history point and the activity.
- **400** `amount`: at least $10, and at most $10,000 a day across one-off deposits. The message says how much is left today.
- **404:** unknown goal.

### `PUT /goals/order`

```json
{ "ids": ["goal_0004", "goal_0001", "goal_0002"] }
```

The person's own order (drag to reorder). `ids` must be exactly the current
goals, each once. **200** `{ data }` with the goals in their new order; **409**
if the list doesn't match (the page is stale: refetch).

### `DELETE /goals/:id`

Deletes a goal **with nothing in it**. **204** on success, **409** if money has
gone in (close it instead), **404** if unknown. Deleted goals can be restored:

### `POST /goals/:id/restore`

Undo a delete. **200** with the goal, back in its old position; **404** if
there's nothing to restore.

### `POST /goals/:id/close`

Closes a **funded** goal: its investments are sold and the value withdrawn to
the linked bank. **200** `{ amount, activity }` (a `withdrawal` entry), and the
totals and last history point drop accordingly. **409** if the goal is empty
(delete it instead), **404** if unknown.

## Sample data

Deliberately a little messy, so the front end has edge cases to handle:

| Goal or portfolio | What's unusual |
| --- | --- |
| **Japan trip** | Hasn't started, and returns zeros rather than blanks |
| **Retirement top-up** | Paused |
| **Climate bet** | Down 5% |
| **Global Sustainable Infrastructure & Real Assets Income Portfolio** | 65-character name |
| **Crypto Pioneers** | Closed to new goals |
