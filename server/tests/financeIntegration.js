// Uses a new database per run; never reads or changes the owner's Finance records.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';
import { writeFile } from 'node:fs/promises';
import { config } from '../src/config.js';
import { app } from '../src/app.js';
import { today } from '../src/dates.js';
import { Session } from '../src/models.js';
import { FinanceCategory, FinanceTransaction, initializeFinance } from '../src/financeModels.js';
import { readOverviewLedger } from '../src/financeRepository.js';

const database = `fin_test_${randomUUID().replaceAll('-', '').slice(0, 24)}`;
let server;
try {
  await mongoose.connect(config.MONGODB_URI, { dbName: database, serverSelectionTimeoutMS:15000 });
  await Session.init();
  await initializeFinance();
  const sid = randomUUID();
  await Session.create({ id: sid, expiresAt: new Date(Date.now() + 3600000) });
  const token = jwt.sign({ role: 'owner', sid }, config.JWT_SECRET, { expiresIn: '7d', issuer: 'mysystem', audience: 'owner' });
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/finance`;
  const request = async (path, method = 'GET', body, status = 200) => {
    const response = await fetch(base + path, { method, headers: { cookie: `mysystem_session=${token}`, 'Content-Type': 'application/json', 'X-MySystem-Request': '1' }, body: body === undefined ? undefined : JSON.stringify(body) });
    assert.equal(response.status, status, `${method} ${path}`);
    return response.json();
  };
  assert.equal((await fetch(base + '/overview')).status, 401);
  const initial = await request('/settings');
  assert.equal(initial.setupCompleted, false);
  assert.equal(initial.openingAvailable, 0);
  const categories = await request('/categories');
  assert.equal(categories.length, 8);
  assert.equal((await request('/categories')).length, 8);
  const food = categories.find(item => item.name === 'Food').id;
  const bills = categories.find(item => item.name === 'Bills').id;
  const income = categories.find(item => item.kind === 'income').id;
  const date = today(), month = date.slice(0, 7);
  await request('/settings', 'PUT', { openingAvailable: 1000, openingSavings: 100 });
  await request('/transactions', 'POST', { type: 'expense', amount: 1.5, date, categoryId: food }, 400);
  await request('/transactions', 'POST', { type: 'expense', amount: 10, date: dayjs(date).add(1, 'day').format('YYYY-MM-DD'), categoryId: food }, 400);
  await request('/transactions', 'POST', { type: 'income', amount: 10, date, categoryId: food }, 400);
  await request('/settings', 'PUT', { openingAvailable: 0, openingSavings: 0, available: 900 }, 400);

  const concurrent = await Promise.all([1, 2].map(() => fetch(base + '/transfers', { method: 'POST', headers: { cookie: `mysystem_session=${token}`, 'Content-Type': 'application/json', 'X-MySystem-Request': '1' }, body: JSON.stringify({ bucket: 'savings', direction: 'in', amount: 800, date }) })));
  assert.deepEqual(concurrent.map(response => response.status).sort(), [201, 409]);
  const savingsIn = await concurrent.find(response => response.status === 201).json();
  await request('/transactions/' + savingsIn.id, 'PATCH', { amount: 10 }, 409);
  const savingsOut = await request('/transfers', 'POST', { bucket: 'savings', direction: 'out', amount: 500, date }, 201);
  await request('/transfers/' + savingsIn.id, 'DELETE', undefined, 409);
  await request('/transfers/' + savingsOut.id, 'DELETE');
  await request('/transfers/' + savingsIn.id, 'DELETE');
  const goal = await request('/goals', 'POST', { name: 'Test goal', targetAmount: 50 }, 201);
  await request('/transfers', 'POST', { bucket: 'goal', goalId: goal.id, direction: 'in', amount: 60, date }, 201);
  assert.equal((await request('/goals'))[0].saved, 60);
  assert.ok((await request('/goals'))[0].completedOn);
  await request('/goals/' + goal.id, 'PATCH', { targetAmount: 100 });
  assert.equal((await request('/goals'))[0].completedOn, null);
  await request('/goals/' + goal.id + '/archive', 'POST', {}, 409);
  await request('/goals/' + goal.id + '/archive', 'POST', { returnMoney: true, delete: true });
  assert.equal((await request('/goals')).length, 0);
  const goalReturn = (await request('/transactions?type=transfer&month=all')).items.find(item => item.goalId === goal.id && item.direction === 'out');
  assert.ok(goalReturn);
  await request('/transfers/' + goalReturn.id, 'DELETE', undefined, 409);

  const expense = await request('/transactions', 'POST', { type: 'expense', amount: 150, date, categoryId: food, note: 'Literal [note].*' }, 201);
  await request('/categories/' + food, 'PATCH', { name: 'Renamed Food' });
  await request('/categories/' + food, 'PATCH', { kind: 'income' }, 409);
  await request('/budgets/' + food, 'PUT', { limit: 100 });
  await request('/categories/' + food + '/archive', 'POST');
  await request('/transactions', 'POST', { type: 'expense', amount: 10, date, categoryId: food }, 400);
  await request('/transactions/' + expense.id, 'PATCH', { note: 'Literal [note].* edited' });
  const log = await request('/transactions?month=' + month + '&search=' + encodeURIComponent('[note].*'));
  assert.equal(log.items.length, 1);
  assert.equal(log.items[0].categoryNameSnapshot, 'Food');
  const overview = await request('/overview?month=' + month);
  assert.equal(overview.available, 850);
  assert.equal(overview.savings, 100);
  assert.equal(overview.spentThisMonth, 150);
  assert.equal(overview.budgets.find(item => item.categoryId === food).isOverBudget, true);
  await request('/transactions/' + expense.id, 'DELETE');
  await request('/budgets/' + food, 'DELETE');

  const recurring = await request('/recurring', 'POST', { name: 'Test recurring', amount: 20, categoryId: bills, dueDay: 31 }, 201);
  const payments = await Promise.all([1, 2].map(() => fetch(base + '/recurring/' + recurring.id + '/pay', { method: 'POST', headers: { cookie: `mysystem_session=${token}`, 'Content-Type': 'application/json', 'X-MySystem-Request': '1' }, body: JSON.stringify({ period: month }) })));
  assert.deepEqual(payments.map(response => response.status).sort(), [201, 409]);
  const payment = await payments.find(response => response.status === 201).json();
  assert.equal((await request('/recurring?month=' + month))[0].status, 'Paid');
  await request('/recurring/' + recurring.id, 'PATCH', { amount: 30 });
  assert.equal((await FinanceTransaction.findOne({ id: payment.id })).amount, 20);
  await request('/transactions/' + payment.id, 'DELETE');
  assert.notEqual((await request('/recurring?month=' + month))[0].status, 'Paid');
  await request('/recurring/' + recurring.id + '/pay', 'POST', { period: month }, 201);
  await request('/recurring/' + recurring.id, 'DELETE');

  const owed = await request('/owed', 'POST', { person: 'Test person', direction: 'i_owe', amount: 100 }, 201);
  const availableBeforeOwedPayments = (await request('/overview?month=' + month)).available;
  await request('/owed/' + owed.id + '/payment', 'POST', { amount: 40 });
  assert.equal((await request('/owed'))[0].remaining, 60);
  assert.equal((await request('/overview?month=' + month)).owed.iOwe, 60);
  await request('/owed/' + owed.id + '/payment', 'POST', { amount: 61 }, 409);
  await request('/owed/' + owed.id, 'PATCH', { amount: 39 }, 400);
  await request('/owed/' + owed.id + '/settle', 'POST');
  assert.equal((await request('/owed'))[0].isSettled, true);
  assert.equal((await request('/owed'))[0].remaining, 0);
  assert.equal((await request('/overview?month=' + month)).available, availableBeforeOwedPayments);
  assert.equal((await request('/overview?month=' + month)).owed.iOwe, 0);
  await request('/owed/' + owed.id, 'DELETE');

  const addedCategory = await request('/categories', 'POST', { name: 'Test income', kind: 'income' }, 201);
  await request('/categories/' + addedCategory.id + '/archive', 'POST');
  assert.equal(await FinanceCategory.countDocuments(), 9);
  for (let index = 0; index < 22; index++) await request('/transactions', 'POST', { type: 'income', amount: 10, categoryId: income, date, note: 'Pagination test' }, 201);
  const firstPage = await request('/transactions?type=income&page=1&month=all');
  const secondPage = await request('/transactions?type=income&page=2&month=all');
  assert.equal(firstPage.items.length, 20);
  assert.equal(secondPage.items.length, 2);
  assert.equal(firstPage.total, 22);
  assert.equal(new Set([...firstPage.items, ...secondPage.items].map(item => item.id)).size, 22);
  assert.equal((await request('/overview')).spentThisMonth, 30);
  await request('/transactions?page=0', 'GET', undefined, 400);
  await request('/goals/missing', 'PATCH', { name: 'Missing' }, 404);
  if(process.argv.includes('--benchmark')){
    const baseline=(await request('/overview')).available;
    const note='FAKE PERFORMANCE FIXTURE '.repeat(30);
    for(let batch=0;batch<5;batch++)await FinanceTransaction.insertMany(Array.from({length:1000},()=>({type:'income',amount:1,date,categoryId:income,categoryNameSnapshot:'Test income',note})));
    const all=await FinanceTransaction.find().lean();
    const snapshot=await readOverviewLedger(null,{openingAvailable:1000,openingSavings:100},month);
    const ledgerBytes=Buffer.byteLength(JSON.stringify(all)),groupedBytes=Buffer.byteLength(JSON.stringify(snapshot));
    assert.ok(groupedBytes<ledgerBytes/20);
    const times=[];for(let sample=0;sample<3;sample++){const start=performance.now();const data=await request('/overview');times.push(Math.round(performance.now()-start));assert.equal(data.available,baseline+5000);}
    const plan=await FinanceTransaction.find({type:'income'}).sort({date:-1,createdAt:-1,id:-1}).limit(20).explain('executionStats');
    assert.ok(plan.executionStats.totalDocsExamined<=25);
    const report={scope:'Temporary Atlas test database; 5,000 synthetic history rows, not owner data',generatedAt:new Date().toISOString(),ledgerRows:all.length,legacyLedgerBytes:ledgerBytes,groupedLedgerBytes:groupedBytes,overviewMilliseconds:times,pagination:{returned:plan.executionStats.nReturned,documentsExamined:plan.executionStats.totalDocsExamined,keysExamined:plan.executionStats.totalKeysExamined}};
    await writeFile(new URL('../../docs/performance-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  }
  console.log('Finance API integration passed: authentication, strict validation, balances, concurrent overdraw protection, recurring uniqueness, goals, category history, budgets, owed tracking and pagination.');
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  // Only the uniquely named test database created above may be removed.
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === database && /^fin_test_[a-f0-9]{24}$/.test(database)) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
