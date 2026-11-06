'use strict';

/**
 * Meridian mock API: goal-based investing.
 *
 * You set goals ("House deposit, $20,000"), each invested in a ready-made
 * portfolio and funded by a monthly deposit from a linked bank account. You can
 * add money at any time, edit a goal, or pause its deposits.
 *
 * In-memory: changes last until the server restarts. Every /api request waits
 * LATENCY_MS (default 350) so loading states are real.
 *
 *   GET   /api/health
 *   GET   /api/summary                  totals for the headline
 *   GET   /api/history                  monthly value vs. contributed, oldest first
 *   GET   /api/portfolios               ?status=open|closed
 *   GET   /api/goals                    ?status=active|scheduled|paused
 *   GET   /api/goals/:id
 *   POST  /api/goals                    { portfolioId, name, target, monthlyAmount, acknowledged }
 *   PATCH /api/goals/:id                { name?, target?, monthlyAmount?, paused? }
 *   POST  /api/goals/:id/deposits       { amount }
 *   GET   /api/activity                 ?type=deposit|dividend|fee &goalId= &sort=date|amount &order=asc|desc &page= &pageSize=
 *
 * Lists return { data, meta: { page, pageSize, total, totalPages } }.
 * Errors return { error, fields? } with 400 (validation), 404 (not found) or 409 (conflict).
 */

const express = require('express');
const cors = require('cors');
const { portfolios, portfolioById, goals, activity, history, isoDate, nextDeposit, round1, nextActivityId } = require('./data');

const PORT = process.env.PORT || 4000;
const LATENCY_MS = Number.isFinite(Number(process.env.LATENCY_MS)) ? Number(process.env.LATENCY_MS) : 350;
const MIN_DEPOSIT = 10;
const DAILY_DEPOSIT_LIMIT = 10000;
const MAX_NAME_LENGTH = 40;

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', (_req, _res, next) => (LATENCY_MS > 0 ? setTimeout(next, LATENCY_MS) : next()));

// ---- Helpers ----

const badRequest = (res, fields) => res.status(400).json({ error: 'Please correct the highlighted fields.', fields });
const notFound = (res, what) => res.status(404).json({ error: `${what} not found.` });
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const money = (n) => `$${n.toLocaleString('en-US')}`;

function paginate(rows, query, defaultPageSize = 25) {
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || defaultPageSize));
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  return { data: rows.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, total, totalPages } };
}

function findGoal(req, res) {
  const goal = goals.find((g) => g.id === req.params.id);
  if (!goal) notFound(res, 'Goal');
  return goal;
}

function refreshReturn(goal) {
  goal.returnPct = goal.contributed ? round1(((goal.value - goal.contributed) / goal.contributed) * 100) : 0;
}

// ---- Reads ----

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/summary', (_req, res) => {
  const value = goals.reduce((s, g) => s + g.value, 0);
  const contributed = goals.reduce((s, g) => s + g.contributed, 0);
  const depositing = goals.filter((g) => g.status !== 'paused');
  res.json({
    value: Math.round(value * 100) / 100,
    contributed,
    gain: Math.round((value - contributed) * 100) / 100,
    gainPct: contributed ? round1(((value - contributed) / contributed) * 100) : 0,
    monthlyTotal: depositing.reduce((s, g) => s + g.monthlyAmount, 0),
    nextDepositDate: depositing.length ? nextDeposit : null,
    goalCount: goals.length,
    currency: 'USD',
  });
});

app.get('/api/history', (_req, res) => res.json({ data: history }));

app.get('/api/portfolios', (req, res) => {
  const rows = req.query.status ? portfolios.filter((p) => p.status === req.query.status) : portfolios;
  res.json(paginate(rows, req.query, 100));
});

app.get('/api/goals', (req, res) => {
  const rows = req.query.status ? goals.filter((g) => g.status === req.query.status) : goals;
  res.json(paginate(rows, req.query, 100));
});

app.get('/api/goals/:id', (req, res) => {
  const goal = findGoal(req, res);
  if (goal) res.json(goal);
});

app.get('/api/activity', (req, res) => {
  const { type, goalId, sort = 'date', order = 'desc' } = req.query;
  let rows = activity;
  if (type) rows = rows.filter((a) => a.type === type);
  if (goalId) rows = rows.filter((a) => a.goalId === goalId);
  const dir = order === 'asc' ? 1 : -1;
  // Ties (same date, same amount) fall back to newest-created first, so today's
  // latest deposit sits above earlier ones from today.
  rows = [...rows].sort((a, b) => {
    const primary = sort === 'amount' ? a.amount - b.amount : a.date.localeCompare(b.date);
    return primary * dir || b.id.localeCompare(a.id);
  });
  res.json(paginate(rows, req.query));
});

// ---- Writes ----

app.post('/api/goals', (req, res) => {
  const { portfolioId, name, target, monthlyAmount, acknowledged } = req.body || {};
  const portfolio = portfolioById.get(portfolioId);
  if (!portfolio) return notFound(res, 'Portfolio');
  if (portfolio.status === 'closed') {
    return res.status(409).json({ error: `${portfolio.name} is no longer open to new goals.` });
  }

  const fields = {};
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) fields.name = 'Give your goal a name.';
  else if (trimmed.length > MAX_NAME_LENGTH) fields.name = `Keep the name under ${MAX_NAME_LENGTH} characters.`;
  if (!isNumber(target) || target < 100) fields.target = 'Set a target of at least $100.';
  if (!isNumber(monthlyAmount)) fields.monthlyAmount = 'Enter a monthly amount.';
  else if (monthlyAmount < portfolio.minMonthly) fields.monthlyAmount = `${portfolio.name} needs at least ${money(portfolio.minMonthly)} a month.`;
  else if (monthlyAmount > DAILY_DEPOSIT_LIMIT) fields.monthlyAmount = `The most you can deposit monthly is ${money(DAILY_DEPOSIT_LIMIT)}.`;
  if (acknowledged !== true) fields.acknowledged = 'Confirm the monthly deposit to continue.';
  if (Object.keys(fields).length) return badRequest(res, fields);

  const goal = {
    id: `goal_${String(goals.length + 1).padStart(4, '0')}`,
    name: trimmed,
    portfolioId: portfolio.id,
    portfolioName: portfolio.name,
    risk: portfolio.risk,
    target,
    monthlyAmount,
    contributed: 0,
    value: 0,
    returnPct: 0,
    status: 'scheduled',
    nextDepositDate: nextDeposit,
    createdAt: isoDate(new Date()),
  };
  goals.push(goal);
  res.status(201).json(goal);
});

app.patch('/api/goals/:id', (req, res) => {
  const goal = findGoal(req, res);
  if (!goal) return;
  const portfolio = portfolioById.get(goal.portfolioId);
  const body = req.body || {};
  const next = {
    name: 'name' in body ? (typeof body.name === 'string' ? body.name.trim() : '') : goal.name,
    target: 'target' in body ? body.target : goal.target,
    monthlyAmount: 'monthlyAmount' in body ? body.monthlyAmount : goal.monthlyAmount,
    paused: 'paused' in body ? body.paused === true : goal.status === 'paused',
  };

  const fields = {};
  if (!next.name) fields.name = 'Give your goal a name.';
  else if (next.name.length > MAX_NAME_LENGTH) fields.name = `Keep the name under ${MAX_NAME_LENGTH} characters.`;
  if (!isNumber(next.target) || next.target <= goal.value) fields.target = `Set a target above what's already saved (${money(Math.round(goal.value))}).`;
  if (!next.paused) {
    if (!isNumber(next.monthlyAmount)) fields.monthlyAmount = 'Enter a monthly amount.';
    else if (next.monthlyAmount < portfolio.minMonthly) fields.monthlyAmount = `${portfolio.name} needs at least ${money(portfolio.minMonthly)} a month.`;
  }
  if (Object.keys(fields).length) return badRequest(res, fields);

  if (next.name !== goal.name) activity.forEach((a) => { if (a.goalId === goal.id) a.goalName = next.name; });
  Object.assign(goal, {
    name: next.name,
    target: next.target,
    monthlyAmount: isNumber(next.monthlyAmount) ? next.monthlyAmount : goal.monthlyAmount,
    status: next.paused ? 'paused' : goal.contributed > 0 ? 'active' : 'scheduled',
    nextDepositDate: next.paused ? null : nextDeposit,
  });
  res.json(goal);
});

app.post('/api/goals/:id/deposits', (req, res) => {
  const goal = findGoal(req, res);
  if (!goal) return;
  const { amount } = req.body || {};
  const todayIso = isoDate(new Date());
  const alreadyToday = activity
    .filter((a) => a.type === 'deposit' && a.oneOff && a.date === todayIso)
    .reduce((s, a) => s + a.amount, 0);

  if (!isNumber(amount)) return badRequest(res, { amount: 'Enter an amount.' });
  if (amount < MIN_DEPOSIT) return badRequest(res, { amount: `The minimum one-off deposit is ${money(MIN_DEPOSIT)}.` });
  if (alreadyToday + amount > DAILY_DEPOSIT_LIMIT) {
    const left = Math.max(0, DAILY_DEPOSIT_LIMIT - alreadyToday);
    return badRequest(res, { amount: `You can add up to ${money(DAILY_DEPOSIT_LIMIT)} a day (${money(left)} left today).` });
  }

  goal.contributed += amount;
  goal.value = Math.round((goal.value + amount) * 100) / 100;
  if (goal.status === 'scheduled') goal.status = 'active';
  refreshReturn(goal);
  const last = history.at(-1);
  last.contributed += amount;
  last.value = Math.round(last.value + amount);

  const entry = {
    id: nextActivityId(),
    date: todayIso,
    type: 'deposit',
    description: 'One-off deposit from Chase ••4821',
    goalId: goal.id,
    goalName: goal.name,
    amount,
    oneOff: true,
  };
  activity.push(entry);
  res.status(201).json({ goal, activity: entry });
});

app.use('/api', (_req, res) => notFound(res, 'Endpoint'));

app.listen(PORT, () => {
  console.log(`\n  Meridian mock API at http://localhost:${PORT}/api`);
  console.log(`  Simulated latency: ${LATENCY_MS}ms per request\n`);
});
