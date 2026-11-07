# Architecture

How Meridian is put together: what runs where, how data moves, where state
lives, and how writes and errors are handled. For the caching details see
[data-layer.md](data-layer.md); for every endpoint see [API.md](API.md).

## 1. The system

Two pieces: a React app, and a small Express server that plays the part of a
real backend.

```mermaid
flowchart LR
  subgraph Browser
    App["React app<br/>(client/)"]
  end
  subgraph Node["Node: server/index.js"]
    API["Mock API<br/>/api/*"]
    Static["Static files<br/>client/dist (production)"]
    Data[("In-memory data<br/>server/data.js")]
  end
  App -- "fetch /api/..." --> API
  API --> Data
  Static -. "serves the built app" .-> App
```

- **The API** keeps its data in memory, seeded relative to today on start. It
  adds about 350 ms of latency to every request, so loading states are real.
- **No database, no auth.** It's a demo backend, shaped like a real one:
  validation, 400 / 404 / 409 errors, and server-side paging and sorting.

### Development vs. production

The app always calls `/api` on its own address. What answers changes:

```mermaid
flowchart TB
  subgraph Dev["npm run dev"]
    B1[Browser] -->|":5173"| Vite["Vite dev server<br/>(hot reload)"]
    Vite -->|"/api proxied"| E1["Express :4000"]
  end
  subgraph Prod["Production (Render)"]
    B2[Browser] -->|"one URL"| E2["Express"]
    E2 -->|"/api/*"| A2[Mock API]
    E2 -->|"everything else"| D2["client/dist<br/>(built app)"]
  end
```

- In **development**, Vite serves the app and proxies `/api` to Express.
- In **production**, `npm run build` compiles the app into `client/dist`, and
  Express serves it alongside the API. One service, one URL, no CORS. Any
  address that isn't an API route returns the app, which handles its own
  routing and 404 page.

## 2. The front end in layers

Each layer has one job, and data only flows one way.

```mermaid
flowchart LR
  UI["features/<br/>components"] --> Q["api/queries.ts<br/>TanStack Query hooks"]
  UI --> D["domain/<br/>rules & formatting"]
  Q --> E["api/endpoints.ts<br/>one function per endpoint"]
  E --> C["api/client.ts<br/>fetch + ApiError"]
  C --> S[("/api")]
```

| Layer | Job | Uses React? |
| --- | --- | --- |
| `features/` | Screens and components | Yes |
| `api/queries.ts` | Fetch, cache, share and refresh server data | Yes |
| `domain/` | Rules about the data: progress, projections, risk, formatting | No |
| `api/endpoints.ts` | Typed function per endpoint | No |
| `api/client.ts` | HTTP, JSON, and turning every failure into an `ApiError` | No |

Components never call `fetch` or know a URL. Business rules never touch React,
so they're tested as plain functions.

## 3. Components

One page, with two drawers on top of it.

```mermaid
flowchart TB
  main["main.tsx<br/>Mantine · Notifications · QueryClient · Router"] --> App
  App --> Layout["AppLayout<br/>header · theme toggle · skip link"]
  Layout --> Home[HomePage]
  Layout --> NF[NotFoundPage]

  Home --> Headline
  Headline --> Chart[ValueChart]
  Home --> GoalList
  Home --> Activity[ActivityTable]
  Home --> GD[GoalDrawer]
  Home --> NGD[NewGoalDrawer]

  GD --> Overview[GoalOverview]
  GD --> Add[AddMoneyForm]
  GD --> Edit[EditGoalForm]
  NGD --> Picker[PortfolioPicker]
  NGD --> NGF[NewGoalForm]
```

Which data each part reads:

| Component | Hooks |
| --- | --- |
| `Headline` | `useOverview`, `useHistory` |
| `GoalList` | `useGoals`, `useOverview`, `usePortfolios` (for projections) |
| `ActivityTable` | `useActivity(filter, sort, page)` |
| `GoalDrawer` | `useGoals`, `usePortfolios`; `GoalOverview` adds `useActivity(goalId)` |
| `PortfolioPicker` | `usePortfolios` |
| Forms | `useCreateGoal`, `useAddMoney`, `useUpdateGoal` |

Each card loads and fails on its own. If the chart's request fails, the totals
and goals still show, each with its own retry.

## 4. Where state lives

Four kinds of state, each kept in the place that suits it:

```mermaid
flowchart LR
  subgraph Server["Server state"]
    TQ["TanStack Query cache<br/>overview · history · portfolios<br/>goals · activity pages"]
  end
  subgraph URL["URL"]
    P["?type= &sort= &order= &page=<br/>(activity view)"]
  end
  subgraph Local["Component state"]
    L["which drawer is open<br/>drawer step · form values<br/>chart range · hovered month"]
  end
  subgraph Storage["localStorage"]
    LS["light / dark choice"]
  end
```

- **Server data** lives only in the query cache. There's no separate store
  (Redux etc.), because there's nothing to keep that the server doesn't own.
- **The activity view** lives in the URL, so a refresh or a shared link keeps
  the filter, sort and page. Only `activityParams.ts` reads or writes it.
- **UI state** stays in the component that owns it. The drawers reset when
  they finish closing.
- **The theme choice** is saved by Mantine. A small script in `index.html`
  applies it before the first paint, so there's no flash.

## 5. A write, end to end: Add money

The same pattern is used by New goal and Edit.

```mermaid
sequenceDiagram
  actor User
  participant Form as AddMoneyForm
  participant Hook as useAddMoney
  participant API as Mock API
  participant Cache as Query cache

  User->>Form: enter $250, press Add
  Form->>Form: check rules (min $10, max $10,000)
  alt invalid
    Form-->>User: message under the field, nothing sent
  else valid
    Form->>Hook: mutateAsync({ goalId, amount })
    Hook->>API: POST /goals/:id/deposits
    API-->>Hook: 201 { goal, activity }
    Hook->>Cache: invalidate overview, history, goals, activity
    Cache->>API: refetch the visible ones
    API-->>Cache: fresh data
    Hook-->>Form: resolves only now
    Form-->>User: toast, back to the goal, totals count up
  end
```

The important design choice: **the write isn't "done" until the page is
right.** `onSuccess` returns the refetch promises, so the form stays in its
loading state until the fresh numbers are in the cache. When the drawer goes
back to the goal, it already shows the new value, and the count-up animates
to it. Writes are never retried automatically, since a retried deposit could
add money twice.

## 6. Errors

Every failure becomes an `ApiError` with a `status` (0 means no network) and
any per-field messages. One helper, `toFormProblem`, decides where each one
goes, for all three forms:

```mermaid
flowchart TB
  E[Request failed] --> Q1{"400 with fields<br/>the form shows?"}
  Q1 -- yes --> F["Message under each field"]
  Q1 -- no --> Q2{"404 or 409?<br/>(gone / closed)"}
  Q2 -- yes --> G["Alert with a way back<br/>e.g. Choose another portfolio"]
  Q2 -- no --> Q3{"No network?"}
  Q3 -- yes --> N["Nothing was sent, try again"]
  Q3 -- no --> X["Something went wrong, try again"]
```

In every case, what the user typed stays in the form. On a 404 or 409, the
relevant list is also refetched, so the stale item disappears.

## 7. Theming

Two looks share one set of tokens. Components use `--meridian-*` variables,
never raw colors, so they follow whichever scheme is on.

```mermaid
flowchart LR
  T["theme.ts<br/>cssVariablesResolver"] --> Light["light: warm paper & ink<br/>monospaced figures"]
  T --> Dark["dark (default): near-black<br/>teal chart · goal colors · sans figures"]
  Light --> V["--meridian-gain / loss / pending<br/>--meridian-card / track / ink<br/>--meridian-chart-* / figure-font"]
  Dark --> V
  V --> CSS["CSS Modules in features/"]
```

Color is kept for meaning: green and red are gain and loss, and amber is
"waiting". Goal colors are identity only, shown in dark mode.

## 8. Testing

```mermaid
flowchart LR
  subgraph Unit["Plain unit tests"]
    D["domain/*<br/>projections · progress · formatting"]
    C["api/client · activityParams<br/>formErrors · useCountUp"]
  end
  subgraph Hooks["Hook tests"]
    H["api/queries<br/>requests · what each write refreshes"]
  end
  subgraph UI["Component tests"]
    U["Headline · ValueChart · GoalList<br/>ActivityTable · both drawers · App"]
  end
  Fake["test/fakeApi.ts<br/>fakes every endpoint"] --> UI
  Fake --> Hooks
```

- **Vitest + React Testing Library**, about 100 tests. Elements are found by
  role and accessible name, so the tests double as an accessibility check.
- **`fakeApi.ts`** answers every GET from sample data (paging and filtering
  activity like the real server). Each test only overrides the write it's
  about.
- **Tests run as if the user prefers reduced motion,** so animations finish
  instantly. `useCountUp`'s own tests turn motion back on with a fake clock.
- **Dates are pinned** in tests that show projections or "Dec 1"-style dates.

## 9. Folder map

```
client/src/
  main.tsx, App.tsx       providers and routes
  app/                    layout, header, theme toggle
  pages/                  HomePage, NotFoundPage
  features/
    overview/             Headline, ValueChart
    goals/                GoalList, GoalDrawer (+ overview, add money, edit),
                          NewGoalDrawer (+ portfolio picker, form)
    activity/             ActivityTable, activityParams (URL state)
    shared/               RiskDots, formErrors
  api/                    client, endpoints, queries, types
  domain/                 goals.ts (rules), format.ts
  hooks/                  useCountUp
  lib/                    queryClient defaults
  theme/                  theme.ts (both schemes, tokens)
  test/                   fakeApi, factories, render helpers, setup
server/
  index.js                Express: API, validation, static app in production
  data.js                 sample data, relative to today
render.yaml               one-service deploy
```

## 10. Decisions worth knowing

| Decision | Why | Cost |
| --- | --- | --- |
| One server for API and app in production | One deploy, one URL, no CORS | The free host sleeps when idle |
| TanStack Query, no global store | Server data is the only shared state | Learning curve for newcomers |
| Activity view in the URL | Refresh and share keep the view | A small parse/write module to maintain |
| Writes resolve after the refetch | Drawers close onto correct numbers | A write takes one extra round trip |
| Hand-built SVG chart | Small, themable, keyboard-accessible; scrubbing drives the headline | Axis, scale and scrubbing logic is ours to maintain |
| Client checks repeat the server's rules | Instant feedback | Rules can drift; server errors still land in the same place |
| In-memory mock data | Zero setup to run | Shared by all visitors; resets on restart |
