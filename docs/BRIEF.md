> The original exercise brief this project started from, kept for reference.
> The project README is [../README.md](../README.md).

# Front-End Engineering Take-Home

Welcome, and thanks for taking the time to work through this exercise. This
repository contains a small backend that serves data for **Meridian** — a
fictional platform where investors manage their portfolio of private-market
(alternative) investments: private equity, venture, credit, infrastructure, and
real estate funds.

Your task is to build the **front end** of a portfolio dashboard on top of the
provided API. **This is a one-hour exercise, and we expect you to use AI coding
tools** — see [Using AI](#using-ai). We are far more interested in the quality
and taste of what you ship, and in how you reason about a real-world UI, than in
how much you build or whether you hand-wrote it.

Approach it like the **foundation of a real, production codebase** — something
built to scale, structured the way you'd want a growing team to inherit it — even
though you'll only build a slice of it in the time you have. We care about how
you'd structure and grow a real front end, not just whether the features work.

---

## The scenario

An investor on Meridian **commits** capital to funds and tracks how those
investments perform over time. They need one place to see their portfolio,
review what they hold, and commit to new funds.

You're building that dashboard. A short glossary of the domain terms
(commitment, distribution, NAV, MOIC, DPI, vintage, …) is at the
bottom of this file — you don't need prior finance experience.

---

## What we're evaluating

- **Judgment & taste** — what you choose to build and polish, the decisions you
  make, and (since you'll use AI) which AI output you accept, refine, or reject.
- **Engineering** — sensible structure, clear data flow, solid handling of a
  real, latency-prone API, no needless complexity.
- **Presentation** — turning the data into something clear, scannable, and good
  to use.
- **UX & accessibility** — a thoughtful, usable, accessible experience.
- **Attention to detail** — how you handle the rough edges that real data and
  real users bring.
- **Code quality** — readability, naming, and a clear commit history.

We are **not** evaluating pixel-perfect visual design or breadth of features.
A focused, polished slice beats a sprawling, half-finished one — **polish over
completeness.**

**Timebox: about one hour.** That's not enough time to do everything well, and
that's deliberate — **what you choose to prioritize is part of the signal.** Get
as far as you can, keep what you ship genuinely solid, and note what you'd do next
in your write-up.

---

## Using AI

We **expect** you to use AI coding tools (Claude Code, Cursor, Copilot, ChatGPT
— whatever you reach for day to day). It's how we work, and it's why this is a
one-hour exercise rather than a four-hour one. We are **not** testing whether you
can hand-write boilerplate from memory.

What we're actually looking at is your **judgment**: what you choose to build,
the architecture and UX decisions you make, and which AI output you accept,
refine, or throw away. An AI can scaffold this whole dashboard in a prompt or two
— so the bar is a genuinely solid result, and the signal is in the taste and
direction you bring to it.

**The floor is high — so clear it.** Because a competent, working version is now
easy to get, a competent, working version isn't what stands out. What impresses
us is where you go *beyond* the baseline: a sharp point of view, one thing done
exceptionally well, a detail or depth of polish a one-shot prompt would never
produce. Build something you'd be proud to ship — not just something that works.

In your `SOLUTION.md`, tell us how you worked with AI: your workflow, a few
notable prompts, and where you overrode or corrected it.

---

## What to build

The API is your canvas. It serves a single investor's private-markets portfolio —
headline metrics, commitments, and open funds. Browse it all in the API docs
(Swagger at `http://localhost:4000/docs`, or [`docs/API.md`](docs/API.md)). Build
a dashboard on top of it.

We'd like what you build to let someone:

- **See their portfolio** — the headline metrics (`GET /portfolio/summary`) and
  their commitments (`GET /commitments`).
- **Commit capital to an open fund** (`GET /funds?stage=open` →
  `POST /funds/:id/commitments`) — enter an amount, acknowledge the terms, and
  submit. The server enforces a per-fund minimum and returns field-level errors;
  surface them, and reflect the outcome on both success and failure.

**Everything about _how_ is yours.** What to show and how to present it; what to
sort, filter, group, chart, or drill into; which parts to go deep on and which to
leave out — all your call. We've handed you the data and the time; we want to see
what you make of it. The decisions *are* the signal.

There may be more in the API than the list above — if something feels worth
building, build it.

---

## Getting started

### Prerequisites
- **Node.js 20.19+ or 22.12+** (the `.nvmrc` pins Node 22; `nvm use` if you use nvm)

### Run everything
One install, one command — this starts **both** the API and the front-end dev
server:
```bash
npm install
npm start
```
- **API** → http://localhost:4000 (and the interactive reference at `/docs`)
- **Front end** → http://localhost:5173 (open this one)

Use `npm run dev` instead if you want the API to restart on change
(`node --watch`). The front end always runs with HMR.

### 📖 View the API docs (Swagger)

**With the server running, open [http://localhost:4000/docs](http://localhost:4000/docs)
in your browser.** This is the interactive **Swagger UI** and the contract you
build against — browse every endpoint, see exact request/response shapes, and use
**Try it out** to make live calls against the running API. A static copy also
lives in [`docs/API.md`](docs/API.md).

### Verify it's running

Verify the API is up:
```bash
curl http://localhost:4000/api/health
```

The API adds ~350ms of simulated latency to every request on purpose. Set
`LATENCY_MS=0 npm start` to turn it off while debugging.

### Build your front end
A **React + Vite + TypeScript** starter is provided in the top-level
**[`client/`](client/)** directory — build the dashboard there.

- The dev server proxies `/api` to the backend, so you can `fetch('/api/...')`
  directly — no CORS or absolute URLs to manage.
- **Use any libraries, tools, and structure you want** — it's your codebase;
  build it however you'd build something real. Add dependencies to the root
  **`package.json`**. The one rule: **don't modify the backend** (if the API
  seems to be missing something, note it in your write-up instead).

**A note on the data.** It's modeled on real portfolios, so expect real-world
messiness. That's intentional — treat it as real data to handle, not bugs to
report.

---

## What to submit

1. Your front-end code in `client/`.
2. A short **`SOLUTION.md`** at the repo root covering:
   - how to install and run your front end,
   - **how you used AI** — your workflow, a few notable prompts, and where you
     overrode or corrected it,
   - the libraries and tooling you added (if any) and why,
   - trade-offs you made and what you'd do with more time,
   - anything you want us to know when reviewing.
3. A clean, readable commit history (small, logical commits over one giant one).

Please don't include `node_modules/` or build output.

### How to submit

**Don't fork this repo.** A fork of a public repository is itself public and
visible to anyone — including other candidates. Instead, **clone it and push your
work to your own repository**:

```bash
git clone https://github.com/dbrudner/meridian-frontend-takehome.git meridian-takehome
cd meridian-takehome
git remote remove origin
# ... build your dashboard, committing as you go ...
git remote add origin <your-new-repo-url>
git push -u origin main
```

1. **Make your repository private** (recommended) and **add the reviewer(s) named
   in your email as collaborators** so the link works for them. A public repo or a
   zip archive is fine too if you'd rather — your call.
2. **Reply to the assessment email with the link** to your repository. That
   message names the reviewers to add and the due date.
3. If anything is unclear or blocking you, reply to that email — reasonable
   questions are welcome and won't count against you.

---

## Domain glossary

| Term | Meaning |
|------|---------|
| **Commitment** | The total amount an investor pledges to a fund. |
| **Called capital** | Cumulative capital the fund has drawn down from the commitment to date. |
| **Unfunded commitment** | Committed but not yet called (`committed − called`). |
| **Distributed capital** | Cumulative cash the fund has returned to the investor to date. |
| **NAV** | Net Asset Value — the current value of the investor's position. |
| **MOIC** | Multiple on Invested Capital — `(NAV + distributions) / called`. |
| **DPI** | Distributions to Paid-In — `distributions / called`. |
| **IRR** | Internal Rate of Return — an annualized, time-weighted return. |
| **Vintage** | The year a fund began investing. |
| **Strategy / asset class** | The kind of fund (private equity, venture, credit, infrastructure, real estate, secondaries). |

---

Good luck — we're looking forward to seeing what you build.
