'use strict';

/**
 * Seed data for the Meridian mock API: portfolios, goals, their activity, and
 * 24 months of value history. Everything is built relative to today, so dates
 * stay current whenever the server starts.
 *
 * The data is deliberately a little messy, so the front end's edge-case handling
 * has something to do: a goal that hasn't started returns zeros (not nulls), one
 * portfolio has a very long name, one is closed to new goals, one goal is paused,
 * and one is down.
 */

/** "2026-11-05" in local time (toISOString would shift late-evening dates to tomorrow). */
function isoDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const today = new Date();
const firstOfMonth = (monthsFromNow, day = 1) =>
  new Date(today.getFullYear(), today.getMonth() + monthsFromNow, day);
/** Deposits go out on the 1st, so the next one is the 1st of next month. */
const nextDeposit = isoDate(firstOfMonth(1));

const portfolios = [
  { id: 'core-growth', name: 'Core Growth', category: 'Stocks', risk: 4, minMonthly: 25, feePct: 0.25, assumedReturnPct: 7, status: 'open',
    description: 'US and international stock index funds.' },
  { id: 'balanced-60-40', name: 'Balanced 60/40', category: 'Stocks and bonds', risk: 3, minMonthly: 25, feePct: 0.25, assumedReturnPct: 5.5, status: 'open',
    description: 'Sixty percent stocks, forty percent bonds, for a smoother ride.' },
  { id: 'dividend-income', name: 'Dividend Income', category: 'Stocks', risk: 2, minMonthly: 25, feePct: 0.3, assumedReturnPct: 5, status: 'open',
    description: 'Established companies that pay and raise dividends.' },
  { id: 'clean-energy', name: 'Clean Energy', category: 'Thematic', risk: 5, minMonthly: 50, feePct: 0.45, assumedReturnPct: 8, status: 'open',
    description: 'Solar, wind and storage companies. Bigger swings.' },
  { id: 'bond-ladder', name: 'Bond Ladder', category: 'Bonds', risk: 1, minMonthly: 25, feePct: 0.2, assumedReturnPct: 3, status: 'open',
    description: 'Government and corporate bonds with staggered maturities.' },
  { id: 'sustainable-real-assets', name: 'Global Sustainable Infrastructure & Real Assets Income Portfolio', category: 'Real assets', risk: 3,
    minMonthly: 100, feePct: 0.55, assumedReturnPct: 6, status: 'open',
    description: 'Toll roads, utilities, renewable power and property income, worldwide.' },
  { id: 'crypto-pioneers', name: 'Crypto Pioneers', category: 'Thematic', risk: 5, minMonthly: 50, feePct: 0.95, assumedReturnPct: 10, status: 'closed',
    description: 'Companies building on blockchain technology. No longer open to new goals.' },
];
const portfolioById = new Map(portfolios.map((p) => [p.id, p]));

// [name, portfolio, target, monthly, months contributed so far, value now, status]
const seedGoals = [
  ['House deposit', 'core-growth', 20000, 500, 12, 7140, 'active'],
  ['Emergency cushion', 'dividend-income', 6000, 250, 18, 4950, 'active'],
  ['Kids’ college', 'balanced-60-40', 40000, 300, 9, 3105, 'active'],
  ['Climate bet', 'clean-energy', 5000, 150, 15, 2138, 'active'],
  ['Retirement top-up', 'sustainable-real-assets', 50000, 100, 12, 1302, 'paused'],
  ['Japan trip', 'balanced-60-40', 3000, 200, 0, 0, 'scheduled'],
];

const goals = seedGoals.map(([name, portfolioId, target, monthlyAmount, months, value, status], i) => {
  const portfolio = portfolioById.get(portfolioId);
  const contributed = monthlyAmount * months;
  return {
    id: `goal_${String(i + 1).padStart(4, '0')}`,
    name,
    portfolioId,
    portfolioName: portfolio.name,
    risk: portfolio.risk,
    target,
    monthlyAmount,
    contributed,
    value,
    // Not-yet-started goals come back as 0, not null, like a real API might.
    returnPct: contributed ? round1(((value - contributed) / contributed) * 100) : 0,
    status,
    nextDepositDate: status === 'paused' ? null : nextDeposit,
    createdAt: isoDate(firstOfMonth(-months)),
  };
});

// Activity: monthly deposits for each started goal, quarterly dividends and fees.
const activity = [];
let activitySeq = 0;
const addActivity = (entry) => activity.push({ id: `act_${String(++activitySeq).padStart(5, '0')}`, ...entry });

goals.forEach((goal) => {
  const months = goal.contributed / goal.monthlyAmount || 0;
  for (let m = 0; m < months; m++) {
    addActivity({
      date: isoDate(firstOfMonth(-m)), // deposits go out on the 1st
      type: 'deposit',
      description: 'Monthly deposit from Chase ••4821',
      goalId: goal.id,
      goalName: goal.name,
      amount: goal.monthlyAmount,
    });
  }
});
for (let m = 0; m < 18; m++) {
  if (m % 3 === 0) {
    const goal = goals[1]; // Emergency cushion, in Dividend Income
    addActivity({ date: isoDate(firstOfMonth(-m, 15)), type: 'dividend', description: 'Dividend reinvested · Dividend Income',
      goalId: goal.id, goalName: goal.name, amount: round2(18 + (m % 5) * 3.4) });
  }
  if (m % 3 === 1) {
    addActivity({ date: isoDate(firstOfMonth(-m, 28)), type: 'fee', description: 'Quarterly management fee',
      goalId: null, goalName: null, amount: -round2(9.2 + m * 0.4) });
  }
}

// Nothing dated after today (a mid-month dividend can't have happened yet).
const todayIso = isoDate(today);
for (let i = activity.length - 1; i >= 0; i--) if (activity[i].date > todayIso) activity.splice(i, 1);

// History: 24 monthly points of value vs. contributed, ending at today's totals.
const history = (() => {
  const points = [];
  let contributed = 0;
  let value = 0;
  for (let i = 0; i < 24; i++) {
    const deposit = 350 + Math.min(i, 12) * 60;
    contributed += deposit;
    value = (value + deposit) * (1 + 0.011 + Math.sin(i / 2.3) * 0.015 - (i === 15 ? 0.045 : 0));
    const d = firstOfMonth(i - 23);
    points.push({ month: isoDate(d).slice(0, 7), contributed, value });
  }
  const totalContributed = goals.reduce((s, g) => s + g.contributed, 0);
  const totalValue = goals.reduce((s, g) => s + g.value, 0);
  const kc = totalContributed / points.at(-1).contributed;
  const kv = totalValue / points.at(-1).value;
  return points.map((p) => ({ month: p.month, contributed: Math.round(p.contributed * kc), value: Math.round(p.value * kv) }));
})();

function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }

module.exports = { portfolios, portfolioById, goals, activity, history, isoDate, nextDeposit, round1, nextActivityId: () => `act_${String(++activitySeq).padStart(5, '0')}` };
