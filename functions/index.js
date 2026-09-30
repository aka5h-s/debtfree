const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Root info
app.get('/', (req, res) => {
  res.json({
    name: 'DebtFree Firebase AI Integration',
    status: 'online',
    supportedClients: ['ChatGPT', 'Gemini', 'Llama', 'Claude'],
    openapi: '/openapi.json',
  });
});

// OpenAPI Spec for ChatGPT Actions / Gemini / Llama
app.get('/openapi.json', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'DebtFree AI API',
      description: 'Universal AI connection to DebtFree app for ChatGPT, Gemini, Llama, and Claude.',
      version: '1.0.0',
    },
    servers: [{ url: baseUrl }],
    paths: {
      '/api/people': {
        get: {
          summary: 'List circle members and their balances',
          operationId: 'listPeople',
          parameters: [{ name: 'userId', in: 'query', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Success' } },
        },
      },
      '/api/transactions': {
        get: {
          summary: 'List transactions',
          operationId: 'listTransactions',
          parameters: [
            { name: 'userId', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'personId', in: 'query', required: false, schema: { type: 'string' } },
            { name: 'direction', in: 'query', required: false, schema: { type: 'string', enum: ['YOU_LENT', 'YOU_BORROWED'] } },
          ],
          responses: { 200: { description: 'Success' } },
        },
        post: {
          summary: 'Record a new lending or borrowing transaction',
          operationId: 'addTransaction',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['userId', 'personId', 'amount', 'direction'],
                  properties: {
                    userId: { type: 'string' },
                    personId: { type: 'string' },
                    amount: { type: 'number' },
                    direction: { type: 'string', enum: ['YOU_LENT', 'YOU_BORROWED'] },
                    note: { type: 'string' },
                    returnDate: { type: 'string', description: 'YYYY-MM-DD' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Created' } },
        },
      },
      '/api/summary': {
        get: {
          summary: 'Financial summary (total lent, borrowed, net balance, debtors/creditors)',
          operationId: 'getFinancialSummary',
          parameters: [{ name: 'userId', in: 'query', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Success' } },
        },
      },
      '/api/due': {
        get: {
          summary: 'Repayments due today, due soon, or overdue',
          operationId: 'getDueAndOverdue',
          parameters: [{ name: 'userId', in: 'query', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Success' } },
        },
      },
    },
  });
});

// 1. List People & Balances
app.get('/api/people', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const peopleSnap = await db.collection('users').doc(userId).collection('people').get();
    const txSnap = await db.collection('users').doc(userId).collection('transactions').get();

    const people = [];
    peopleSnap.forEach(d => people.push(d.data()));

    const txs = [];
    txSnap.forEach(d => txs.push(d.data()));

    const result = people.map(p => {
      const pTxs = txs.filter(t => t.personId === p.id);
      let balance = 0;
      for (const t of pTxs) {
        if (t.direction === 'YOU_LENT') balance += t.amount;
        else balance -= t.amount;
      }
      return {
        ...p,
        balance,
        status: balance > 0 ? `OWES_YOU_₹${balance}` : balance < 0 ? `YOU_OWE_₹${Math.abs(balance)}` : 'SETTLED',
        transactionCount: pTxs.length,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. List Transactions
app.get('/api/transactions', async (req, res) => {
  const { userId, personId, direction } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const snap = await db.collection('users').doc(userId).collection('transactions').get();
    let txs = [];
    snap.forEach(d => txs.push(d.data()));

    if (personId) txs = txs.filter(t => t.personId === personId);
    if (direction) txs = txs.filter(t => t.direction === direction);

    txs.sort((a, b) => b.date - a.date);
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Add Transaction
app.post('/api/transactions', async (req, res) => {
  const { userId, personId, amount, direction, note, returnDate } = req.body;
  if (!userId || !personId || !amount || !direction) {
    return res.status(400).json({ error: 'userId, personId, amount, and direction are required' });
  }

  try {
    const id = generateId();
    const tx = {
      id,
      personId,
      amount: Number(amount),
      direction,
      date: Date.now(),
      returnDate: returnDate ? new Date(returnDate).getTime() : null,
      note: note || '',
      createdAt: Date.now(),
    };

    await db.collection('users').doc(userId).collection('transactions').doc(id).set(tx);
    res.json({ success: true, transaction: tx });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Financial Summary
app.get('/api/summary', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const [peopleSnap, txSnap] = await Promise.all([
      db.collection('users').doc(userId).collection('people').get(),
      db.collection('users').doc(userId).collection('transactions').get(),
    ]);

    const people = new Map();
    peopleSnap.forEach(d => people.set(d.id, d.data()));

    let totalLent = 0;
    let totalBorrowed = 0;
    const personBalances = new Map();

    txSnap.forEach(d => {
      const tx = d.data();
      const currentBal = personBalances.get(tx.personId) || 0;
      if (tx.direction === 'YOU_LENT') {
        totalLent += tx.amount;
        personBalances.set(tx.personId, currentBal + tx.amount);
      } else {
        totalBorrowed += tx.amount;
        personBalances.set(tx.personId, currentBal - tx.amount);
      }
    });

    const netBalance = totalLent - totalBorrowed;
    const debtors = [];
    const creditors = [];

    for (const [pId, bal] of personBalances.entries()) {
      const person = people.get(pId);
      const name = person ? person.name : 'Unknown';
      if (bal > 0) debtors.push({ personId: pId, name, owesYou: bal });
      else if (bal < 0) creditors.push({ personId: pId, name, youOwe: Math.abs(bal) });
    }

    res.json({
      totalLent,
      totalBorrowed,
      netBalance,
      peopleWhoOweYou: debtors,
      peopleYouOwe: creditors,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Due & Overdue
app.get('/api/due', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const [peopleSnap, txSnap] = await Promise.all([
      db.collection('users').doc(userId).collection('people').get(),
      db.collection('users').doc(userId).collection('transactions').get(),
    ]);

    const people = new Map();
    peopleSnap.forEach(d => people.set(d.id, d.data()));

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const overdue = [];
    const dueToday = [];
    const dueSoon = [];

    txSnap.forEach(d => {
      const tx = d.data();
      if (!tx.returnDate) return;

      const returnDate = new Date(tx.returnDate);
      const targetStart = new Date(returnDate.getFullYear(), returnDate.getMonth(), returnDate.getDate()).getTime();
      const diffDays = Math.round((targetStart - todayStart) / 86400000);
      const person = people.get(tx.personId);
      const personName = person ? person.name : 'Unknown';

      const item = {
        txId: tx.id,
        personId: tx.personId,
        personName,
        amount: tx.amount,
        direction: tx.direction,
        dueDate: returnDate.toISOString().split('T')[0],
      };

      if (diffDays < 0) overdue.push({ ...item, status: `Overdue by ${Math.abs(diffDays)} day(s)` });
      else if (diffDays === 0) dueToday.push({ ...item, status: 'Due Today' });
      else if (diffDays <= 2) dueSoon.push({ ...item, status: `Due in ${diffDays} day(s)` });
    });

    res.json({ overdue, dueToday, dueSoon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export the HTTPS Cloud Function
exports.ai = functions.https.onRequest(app);
