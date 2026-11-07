# How Meridian was built

## From private markets to goals

Meridian began as a one-hour front-end exercise: a provided API for a
private-markets investor (fund commitments, capital calls, NAV, MOIC) and a
brief to build a dashboard on it. That version had a summary panel, a sortable
commitments table and a drawer for committing capital to funds.

It worked, but private markets need a glossary before anyone can appreciate
the craft. So I rebuilt it as goal-based investing, a product anyone can read
in seconds, and replaced the provided backend with my own mock API and data.
Most of the engineering carried over:

| Before (private markets) | After (goals) |
| --- | --- |
| Summary panel, count-up | Headline with the same count-up, plus a value chart |
| Capital-called bar | One progress bar per goal |
| Commitments table: sort, filter, server paging, URL state, fixed columns | Activity table, same machinery |
| Two-step commit drawer: pick a fund, then the form | New goal drawer: pick a portfolio, then the form |
| Field errors, 409 / 404 / network handling, toast, refresh-before-close | Shared by New goal, Add money and Edit |
| `isValued` (zeros instead of nulls) | `hasStarted`: the new API has the same quirk |

Before changing any code I mocked the new product as a single HTML page, then
simplified it twice. The first mock carried private-markets density into a
30-second product. I cut it to three blocks: headline with chart, goals,
activity. I also moved repeated text out of the headline into where it
belonged, and gave each goal its own color.

## How I used AI

I used Claude as a pair throughout. It wrote most of the code; I set the
direction, judged every screen, ran the tests and made each commit myself.

**Workflow.**
- Research and mocks first, then small numbered steps: mock API → API layer
  and domain → UI → docs.
- Each step came with its tests, and the old and new code lived side by side
  until the UI moved over, so every commit compiled.
- When something failed, I pasted the failure back rather than asking it to
  "fix the tests".

**Prompts that shaped it**
- *"Let's ensure we write tests for each feature."* No feature lands without them.
- *"Not sure how this appeals as a consumer product."* Led to the dark skin,
  sans figures, a colored growth chart and a color per goal.
- *"This is what I mean: too much text bunched up."* The headline went from
  four lines to a total and one pill.
- *"What if I want to contribute ad hoc or modify a goal?"* Led to Add money
  and Edit, and to deliberately leaving out withdrawals and portfolio switches,
  which mean selling and tax in a real product.

**Where I overrode or corrected it**
- **It overwrote uncommitted files** early on, writing the API client without
  reading what was there. The rule since then: read before writing.
- **Several suggestions I tried and reverted:** a dark mode before the palette
  was designed, a consumer reskin in the old product, and a "RISK" label
  beside the dots. Each looked worse in the browser than in the description.
- **Color meaning.** It pushed back on a green progress bar, because green
  means gain and money paid in isn't a gain. I agreed, and kept color for
  meaning throughout.
- **Bugs it introduced, and the fixes:**
  - Tests failing on duplicate accessible names.
  - Jumping inline numbers during the count-up.
  - Crowded chart labels.
  - Table columns shifting when sorting.
  - Same-day items sorting oldest first.
  - A header animation repainting on every frame while scrolling.

## Trade-offs

- **Projections use one assumed return per portfolio.** They're labelled as
  assumptions, not promises. A real product would show a range.
- **No withdrawals or portfolio switching.** Both mean selling in a real
  product (tax, settlement times), so they're out of scope rather than half-built.
- **One page with drawers.** Quicker in context than separate pages; a goal
  detail page would make sense if goals grew more history.
- **Client-side checks repeat the server's rules,** for instant feedback.
  Server errors still land in the same places if the rules drift.
- **A hand-built chart** instead of a library: smaller and fully themable, at
  the cost of writing the axis, scale and scrubbing logic myself.

## Next

- An end-to-end test (Playwright) against the mock API, covering New goal, Add
  money and Edit, including their error paths.
- Screen reader and contrast checks on the dark palette.
- Goal milestones ("Halfway there") and a "caught up" moment.
- Per-goal history in the chart.
