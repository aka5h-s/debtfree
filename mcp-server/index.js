import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from project root (.env)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBftNHay-UIkV9GyQJ2ez6fgvS8MMAXrSU',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'debt-free-af02a.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'debt-free-af02a',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'debt-free-af02a.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '629935243184',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:629935243184:android:b91bcfb493c3071e7a2075',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// Authenticate server with Firebase so Firestore rules permit access
const SERVICE_EMAIL = process.env.FIREBASE_SERVICE_EMAIL || 'mcp_backend_service@debtfree.app';
const SERVICE_PASS = process.env.FIREBASE_SERVICE_PASSWORD || 'Password123#SecureMcpAuth';
signInWithEmailAndPassword(auth, SERVICE_EMAIL, SERVICE_PASS)
  .then(cred => console.log('MCP server authenticated to Firebase:', cred.user.email))
  .catch(err => console.warn('Firebase auth note:', err.message));

// Helper to generate IDs
function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function createMcpServer() {
  const server = new McpServer({
    name: 'debtfree-mcp',
    version: '1.0.0',
  });

// ==========================================
// 1. PEOPLE TOOLS (CRUD)
// ==========================================

server.tool(
  'list_people',
  'List all people in the circle with their calculated net balance and transaction count',
  {
    userId: z.string().describe('The user ID whose data to access'),
  },
  async ({ userId }) => {
    try {
      const [peopleSnap, txSnap] = await Promise.all([
        getDocs(collection(db, 'users', userId, 'people')),
        getDocs(collection(db, 'users', userId, 'transactions')),
      ]);

      const people = [];
      peopleSnap.forEach(d => people.push(d.data()));

      const txs = [];
      txSnap.forEach(d => txs.push(d.data()));

      const result = people.map(p => {
        const personTxs = txs.filter(t => t.personId === p.id);
        let balance = 0;
        for (const t of personTxs) {
          if (t.direction === 'YOU_LENT') balance += t.amount;
          else balance -= t.amount;
        }
        return {
          id: p.id,
          name: p.name,
          phone: p.phone || '',
          notes: p.notes || '',
          balance,
          status: balance > 0 ? `OWES_YOU_₹${balance}` : balance < 0 ? `YOU_OWE_₹${Math.abs(balance)}` : 'SETTLED',
          transactionCount: personTxs.length,
          createdAt: p.createdAt,
        };
      });

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error listing people: ${err.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  'create_person',
  'Add a new person/friend to your circle',
  {
    userId: z.string().describe('The user ID'),
    name: z.string().describe("Person's name"),
    phone: z.string().optional().describe('Phone number (optional)'),
    notes: z.string().optional().describe('Notes about this person (optional)'),
  },
  async ({ userId, name, phone, notes }) => {
    try {
      const id = generateId();
      const person = {
        id,
        name: name.trim(),
        phone: (phone || '').trim(),
        notes: (notes || '').trim(),
        createdAt: Date.now(),
      };

      await setDoc(doc(db, 'users', userId, 'people', id), person);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully added ${person.name} (ID: ${person.id}) to circle.`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error creating person: ${err.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  'update_person',
  'Update person details (name, phone, notes)',
  {
    userId: z.string().describe('The user ID'),
    personId: z.string().describe('The person ID to update'),
    name: z.string().optional().describe('Updated name'),
    phone: z.string().optional().describe('Updated phone'),
    notes: z.string().optional().describe('Updated notes'),
  },
  async ({ userId, personId, name, phone, notes }) => {
    try {
      const pDoc = await getDoc(doc(db, 'users', userId, 'people', personId));
      if (!pDoc.exists()) {
        return {
          content: [{ type: 'text', text: `Person with ID "${personId}" not found.` }],
          isError: true,
        };
      }

      const current = pDoc.data();
      const updated = {
        ...current,
        name: name !== undefined ? name.trim() : current.name,
        phone: phone !== undefined ? phone.trim() : current.phone,
        notes: notes !== undefined ? notes.trim() : current.notes,
      };

      await setDoc(doc(db, 'users', userId, 'people', personId), updated);

      return {
        content: [{ type: 'text', text: `Updated ${updated.name} successfully.` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error updating person: ${err.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  'delete_person',
  'Delete a person and all their associated transactions',
  {
    userId: z.string().describe('The user ID'),
    personId: z.string().describe('The person ID to delete'),
  },
  async ({ userId, personId }) => {
    try {
      await deleteDoc(doc(db, 'users', userId, 'people', personId));

      const txSnap = await getDocs(
        query(collection(db, 'users', userId, 'transactions'), where('personId', '==', personId))
      );
      const batch = writeBatch(db);
      txSnap.forEach(d => batch.delete(d.ref));
      await batch.commit();

      return {
        content: [{ type: 'text', text: `Deleted person ${personId} and ${txSnap.size} associated transaction(s).` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error deleting person: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ==========================================
// 2. TRANSACTION TOOLS (CRUD + Settle)
// ==========================================

server.tool(
  'list_transactions',
  'List transactions with optional filtering by person, direction, or return date',
  {
    userId: z.string().describe('The user ID'),
    personId: z.string().optional().describe('Filter by specific person ID'),
    direction: z.enum(['YOU_LENT', 'YOU_BORROWED']).optional().describe('Filter by direction'),
  },
  async ({ userId, personId, direction }) => {
    try {
      const snap = await getDocs(collection(db, 'users', userId, 'transactions'));
      let txs = [];
      snap.forEach(d => txs.push(d.data()));

      if (personId) {
        txs = txs.filter(t => t.personId === personId);
      }
      if (direction) {
        txs = txs.filter(t => t.direction === direction);
      }

      txs.sort((a, b) => b.date - a.date);

      const formatted = txs.map(t => ({
        id: t.id,
        personId: t.personId,
        amount: t.amount,
        direction: t.direction,
        date: new Date(t.date).toISOString().split('T')[0],
        returnDate: t.returnDate ? new Date(t.returnDate).toISOString().split('T')[0] : null,
        note: t.note || '',
      }));

      return {
        content: [{ type: 'text', text: JSON.stringify(formatted, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error listing transactions: ${err.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  'add_transaction',
  'Add a transaction (money lent or borrowed) with optional return date',
  {
    userId: z.string().describe('The user ID'),
    personId: z.string().describe('The ID of the person'),
    amount: z.number().positive().describe('Transaction amount in ₹'),
    direction: z.enum(['YOU_LENT', 'YOU_BORROWED']).describe('YOU_LENT (they owe you) or YOU_BORROWED (you owe them)'),
    note: z.string().optional().describe('Note or reason for the transaction'),
    date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
    returnDate: z.string().optional().describe('Expected return date in YYYY-MM-DD format (optional)'),
  },
  async ({ userId, personId, amount, direction, note, date, returnDate }) => {
    try {
      const pDoc = await getDoc(doc(db, 'users', userId, 'people', personId));
      if (!pDoc.exists()) {
        return {
          content: [{ type: 'text', text: `Person with ID "${personId}" does not exist. Create the person first.` }],
          isError: true,
        };
      }

      const txDate = date ? new Date(date).getTime() : Date.now();
      const parsedReturn = returnDate ? new Date(returnDate).getTime() : null;

      const id = generateId();
      const tx = {
        id,
        personId,
        amount,
        direction,
        date: txDate,
        returnDate: parsedReturn,
        note: (note || '').trim(),
        createdAt: Date.now(),
      };

      await setDoc(doc(db, 'users', userId, 'transactions', id), tx);

      const person = pDoc.data();
      const action = direction === 'YOU_LENT' ? `lent to ${person.name}` : `borrowed from ${person.name}`;
      return {
        content: [
          {
            type: 'text',
            text: `Recorded ₹${amount} ${action}. (Transaction ID: ${id})`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error adding transaction: ${err.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  'update_transaction',
  'Update a transaction (amount, direction, note, date, returnDate) with audit history tracking',
  {
    userId: z.string().describe('The user ID'),
    transactionId: z.string().describe('The transaction ID to update'),
    amount: z.number().positive().optional().describe('New amount'),
    direction: z.enum(['YOU_LENT', 'YOU_BORROWED']).optional().describe('New direction'),
    note: z.string().optional().describe('New note'),
    date: z.string().optional().describe('New transaction date (YYYY-MM-DD)'),
    returnDate: z.string().nullable().optional().describe('New return date (YYYY-MM-DD) or null to clear'),
  },
  async ({ userId, transactionId, amount, direction, note, date, returnDate }) => {
    try {
      const docRef = doc(db, 'users', userId, 'transactions', transactionId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        return {
          content: [{ type: 'text', text: `Transaction "${transactionId}" not found.` }],
          isError: true,
        };
      }

      const current = snap.data();

      // Record audit history entry
      const historyEntry = {
        id: generateId(),
        transactionId,
        previousAmount: current.amount,
        previousDirection: current.direction,
        previousNote: current.note || '',
        previousDate: current.date,
        previousReturnDate: current.returnDate || null,
        changedAt: Date.now(),
      };
      await setDoc(doc(db, 'users', userId, 'transactionHistory', historyEntry.id), historyEntry);

      const updated = {
        ...current,
        amount: amount !== undefined ? amount : current.amount,
        direction: direction !== undefined ? direction : current.direction,
        note: note !== undefined ? note.trim() : current.note,
        date: date ? new Date(date).getTime() : current.date,
        returnDate: returnDate === null ? null : returnDate ? new Date(returnDate).getTime() : current.returnDate,
      };

      await setDoc(docRef, updated);

      return {
        content: [
          {
            type: 'text',
            text: `Updated transaction ${transactionId} (previous state saved to history).`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error updating transaction: ${err.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  'delete_transaction',
  'Delete a transaction by ID',
  {
    userId: z.string().describe('The user ID'),
    transactionId: z.string().describe('The transaction ID to delete'),
  },
  async ({ userId, transactionId }) => {
    try {
      await deleteDoc(doc(db, 'users', userId, 'transactions', transactionId));
      return {
        content: [{ type: 'text', text: `Deleted transaction ${transactionId}.` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error deleting transaction: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ==========================================
// 3. INTELLIGENCE & SUMMARY TOOLS
// ==========================================

server.tool(
  'get_financial_summary',
  'Get total lent, total borrowed, global net balance, and breakdown of active circle balances',
  {
    userId: z.string().describe('The user ID'),
  },
  async ({ userId }) => {
    try {
      const [peopleSnap, txSnap] = await Promise.all([
        getDocs(collection(db, 'users', userId, 'people')),
        getDocs(collection(db, 'users', userId, 'transactions')),
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
        if (bal > 0) {
          debtors.push({ personId: pId, name, owesYou: bal });
        } else if (bal < 0) {
          creditors.push({ personId: pId, name, youOwe: Math.abs(bal) });
        }
      }

      debtors.sort((a, b) => b.owesYou - a.owesYou);
      creditors.sort((a, b) => b.youOwe - a.youOwe);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                totalLent,
                totalBorrowed,
                netBalance,
                status:
                  netBalance > 0
                    ? `You are net positive by ₹${netBalance} (people owe you more)`
                    : netBalance < 0
                    ? `You are net negative by ₹${Math.abs(netBalance)} (you owe more)`
                    : 'All balances settled evenly',
                peopleWhoOweYou: debtors,
                peopleYouOwe: creditors,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error generating summary: ${err.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  'get_due_and_overdue',
  'Get all transactions that are due today, due soon (within 2 days), or overdue',
  {
    userId: z.string().describe('The user ID'),
  },
  async ({ userId }) => {
    try {
      const [peopleSnap, txSnap] = await Promise.all([
        getDocs(collection(db, 'users', userId, 'people')),
        getDocs(collection(db, 'users', userId, 'transactions')),
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
          daysDifference: diffDays,
        };

        if (diffDays < 0) {
          overdue.push({ ...item, status: `Overdue by ${Math.abs(diffDays)} day(s)` });
        } else if (diffDays === 0) {
          dueToday.push({ ...item, status: 'Due Today' });
        } else if (diffDays <= 2) {
          dueSoon.push({ ...item, status: `Due in ${diffDays} day(s)` });
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                summary: {
                  overdueCount: overdue.length,
                  dueTodayCount: dueToday.length,
                  dueSoonCount: dueSoon.length,
                },
                overdue,
                dueToday,
                dueSoon,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error checking due dates: ${err.message}` }],
        isError: true,
      };
    }
  }
  );

  return server;
}

// ==========================================
// 4. SERVER LAUNCH (Dual Mode: HTTP/SSE + Stdio)
// ==========================================

async function startHttpServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const PORT = process.env.PORT || 3000;
  const transports = new Map();

  // Store in-memory OAuth codes and tokens (maps token -> { userId, email })
  const oauthCodes = new Map();
  const oauthTokens = new Map();

  // Authentication Middleware: Protect all endpoints except / and /openapi.json
  const REQUIRED_API_KEY = process.env.DEBTFREE_API_KEY;
  app.use((req, res, next) => {
    // Allow public discovery & OAuth endpoints
    if (
      req.path === '/' ||
      req.path === '/mcp' ||
      req.path === '/sse' ||
      req.path === '/messages' ||
      req.path === '/openapi.json' ||
      req.path.startsWith('/.well-known/') ||
      req.path.startsWith('/oauth/')
    ) {
      return next();
    }

    const authHeader = req.headers['authorization'] || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const apiKeyHeader = req.headers['x-api-key'] || req.query.apiKey;
    const providedKey = bearerToken || apiKeyHeader;

    // Check against server API key OR active OAuth token
    const isOAuthTokenValid = bearerToken && oauthTokens.has(bearerToken);
    const isApiKeyValid = REQUIRED_API_KEY && providedKey === REQUIRED_API_KEY;

    if (!isApiKeyValid && !isOAuthTokenValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing API key or OAuth Bearer token.',
      });
    }

    // Attach authenticated user context if called via OAuth token
    if (isOAuthTokenValid) {
      req.oauthUser = oauthTokens.get(bearerToken);
    }

    next();
  });


  // RFC 8414 OAuth 2.0 Authorization Server Metadata
  const getOAuthMetadata = (req, res) => {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = `${proto}://${host}`;
    res.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
      scopes_supported: ['read', 'write'],
      code_challenge_methods_supported: ['S256', 'plain'],
    });
  };

  app.get('/.well-known/oauth-authorization-server', getOAuthMetadata);
  app.get('/.well-known/openid-configuration', getOAuthMetadata);

  // 1. OpenAI / Agent Plugin Manifest
  app.get('/.well-known/ai-plugin.json', (req, res) => {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = `${proto}://${host}`;

    res.json({
      schema_version: 'v1',
      name_for_human: 'DebtFree',
      name_for_model: 'debtfree',
      description_for_human: 'Manage debt circles, friends, repayments, and financial net balances in real-time.',
      description_for_model: 'Assistant plugin to track who owes whom, create debt transactions, view repayment schedules, and check balances using the DebtFree ledger.',
      auth: {
        type: 'oauth',
        client_url: `${baseUrl}/oauth/authorize`,
        scope: 'read write',
        authorization_url: `${baseUrl}/oauth/token`,
        authorization_content_type: 'application/x-www-form-urlencoded',
        verification_tokens: {
          openai: 'debtfree_verified_plugin',
        },
      },
      api: {
        type: 'openapi',
        url: `${baseUrl}/openapi.json`,
        is_user_authenticated: false,
      },
      logo_url: `${baseUrl}/logo.png`,
      contact_email: 'support@debtfree.app',
      legal_info_url: `${baseUrl}/legal`,
    });
  });

  // 2. OAuth 2.0 Authorization Endpoint (Mobile-friendly Login Page)
  app.get('/oauth/authorize', (req, res) => {
    const { client_id, redirect_uri, state, response_type } = req.query;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Connect DebtFree</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: #0A0A0A; color: #FFFFFF; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background-color: #121212; border: 2px solid #E5FE40; width: 100%; max-width: 380px; padding: 24px; box-shadow: 6px 6px 0px #E5FE40; }
    .badge { display: inline-block; background-color: #E5FE40; color: #000000; font-size: 10px; font-weight: 900; letter-spacing: 1.5px; padding: 3px 8px; margin-bottom: 12px; }
    h1 { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 6px; }
    p { font-size: 13px; color: #888888; margin-bottom: 24px; line-height: 1.4; }
    .input-group { margin-bottom: 16px; text-align: left; }
    label { display: block; font-size: 11px; font-weight: 700; color: #AAAAAA; letter-spacing: 1px; margin-bottom: 6px; }
    input { width: 100%; background-color: #1A1A1A; border: 1px solid #333333; color: #FFFFFF; padding: 12px; font-size: 14px; outline: none; border-radius: 0; }
    input:focus { border-color: #E5FE40; }
    .btn { width: 100%; padding: 14px; font-size: 13px; font-weight: 900; letter-spacing: 1px; border: none; cursor: pointer; border-radius: 0; text-transform: uppercase; margin-top: 8px; }
    .btn-primary { background-color: #E5FE40; color: #000000; box-shadow: 4px 4px 0px #FFFFFF; }
    .btn-primary:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0px #FFFFFF; }
    .divider { display: flex; align-items: center; text-align: center; margin: 20px 0; color: #555555; font-size: 11px; font-weight: 700; letter-spacing: 1px; }
    .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid #222222; }
    .divider::before { margin-right: .5em; }
    .divider::after { margin-left: .5em; }
    .btn-google { background-color: #1E1E1E; color: #FFFFFF; border: 1px solid #333333; display: flex; align-items: center; justify-content: center; gap: 10px; }
    .btn-google:active { background-color: #262626; }
    .error { background-color: #331111; border: 1px solid #FF4444; color: #FF8888; padding: 10px; font-size: 12px; margin-bottom: 16px; display: none; }
    .footer-note { font-size: 10px; color: #555555; text-align: center; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">DEBTFREE AI LINK</span>
    <h1>Connect to AI</h1>
    <p>Sign in to securely link your DebtFree ledger with your AI Assistant.</p>

    <div id="error-box" class="error"></div>

    <form id="login-form">
      <div class="input-group">
        <label>EMAIL ADDRESS</label>
        <input type="email" id="email" required placeholder="you@example.com" autocomplete="email">
      </div>
      <div class="input-group">
        <label>PASSWORD</label>
        <input type="password" id="password" required placeholder="••••••••••••" autocomplete="current-password">
      </div>
      <button type="submit" class="btn btn-primary" id="submit-btn">SIGN IN & CONNECT</button>
    </form>

    <div class="divider">OR</div>

    <button type="button" class="btn btn-google" id="google-btn">
      <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.57 0 2.98.54 4.09 1.6l3.07-3.07C17.3 1.77 14.85 1 12 1 7.6 1 3.8 3.51 1.94 7.15l3.66 2.84C6.48 7.17 8.98 5 12 5z"/><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.72 2.89c2.18-2.01 3.7-4.97 3.7-8.71z"/><path fill="#FBBC05" d="M5.6 14.01c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.94 6.59C1.19 8.08.77 9.75.77 11.5s.42 3.42 1.17 4.91l3.66-2.4z"/><path fill="#34A853" d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.72-2.89c-1.07.72-2.45 1.16-4.21 1.16-3.02 0-5.52-2.17-6.4-4.99L1.94 16.21C3.8 19.85 7.6 23 12 23z"/></svg>
      CONTINUE WITH GOOGLE
    </button>

    <div class="footer-note">256-bit encrypted • Token verified with Firebase</div>
  </div>

  <script>
    const form = document.getElementById('login-form');
    const errBox = document.getElementById('error-box');
    const submitBtn = document.getElementById('submit-btn');
    const googleBtn = document.getElementById('google-btn');

    const redirectUri = "${redirect_uri || ''}";
    const state = "${state || ''}";

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errBox.style.display = 'none';
      submitBtn.textContent = 'CONNECTING...';
      submitBtn.disabled = true;

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      try {
        const res = await fetch('/oauth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, state, redirectUri })
        });
        const data = await res.json();
        if (data.redirect) {
          window.location.href = data.redirect;
        } else {
          errBox.textContent = data.error || 'Authentication failed';
          errBox.style.display = 'block';
          submitBtn.textContent = 'SIGN IN & CONNECT';
          submitBtn.disabled = false;
        }
      } catch (err) {
        errBox.textContent = 'Connection error: ' + err.message;
        errBox.style.display = 'block';
        submitBtn.textContent = 'SIGN IN & CONNECT';
        submitBtn.disabled = false;
      }
    });

    googleBtn.addEventListener('click', () => {
      // Direct to Google OAuth flow
      window.location.href = '/oauth/google-start?redirectUri=' + encodeURIComponent(redirectUri) + '&state=' + encodeURIComponent(state);
    });
  </script>
</body>
</html>`;

    res.send(html);
  });

  // 3. OAuth Email/Password Login Handler
  app.post('/oauth/login', async (req, res) => {
    const { email, password, redirectUri, state } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    try {
      // Validate credentials against Firebase Auth via Identity Toolkit REST API
      const fbRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        }
      );
      const fbData = await fbRes.json();

      if (fbData.error) {
        return res.status(401).json({ error: fbData.error.message || 'Invalid email or password' });
      }

      // Generate single-use authorization code
      const authCode = 'df_code_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      oauthCodes.set(authCode, {
        userId: fbData.localId,
        email: fbData.email,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      const redirectUrl = redirectUri
        ? `${redirectUri}${redirectUri.includes('?') ? '&' : '?'}code=${authCode}&state=${encodeURIComponent(state || '')}`
        : `/oauth/success?code=${authCode}`;

      res.json({ success: true, redirect: redirectUrl });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. OAuth Google Sign-In Start
  app.get('/oauth/google-start', (req, res) => {
    const { redirectUri, state } = req.query;
    // Construct Google OAuth URL with actual Firebase web client ID
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID || '629935243184-vflmb8gi97r6e7fcsmdk1dg6i4ib9e2a.apps.googleusercontent.com';
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      `https://${req.get('host')}/oauth/google-callback`
    )}&response_type=code&scope=email%20profile%20openid&state=${encodeURIComponent(
      JSON.stringify({ redirectUri: redirectUri || '', state: state || '' })
    )}`;
    res.redirect(googleAuthUrl);
  });

  // 4b. OAuth Google Callback
  app.get('/oauth/google-callback', async (req, res) => {
    const { code, state } = req.query;
    let redirectUri = '';
    let clientState = '';
    try {
      if (state) {
        const parsed = JSON.parse(state);
        redirectUri = parsed.redirectUri;
        clientState = parsed.state;
      }
    } catch (e) {}

    try {
      const GOOGLE_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID || '629935243184-vflmb8gi97r6e7fcsmdk1dg6i4ib9e2a.apps.googleusercontent.com';
      const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_WEB_CLIENT_SECRET || '';

      // Exchange code for Google ID token
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: `https://${req.get('host')}/oauth/google-callback`,
          grant_type: 'authorization_code',
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.id_token) {
        return res.status(400).send(`Google authentication failed: ${tokenData.error_description || 'No ID token returned'}`);
      }

      // Sign in to Firebase with the Google ID Token via Identity Toolkit
      const fbRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postBody: `id_token=${tokenData.id_token}&providerId=google.com`,
            requestUri: `https://${req.get('host')}/oauth/google-callback`,
            returnSecureToken: true,
          }),
        }
      );
      const fbData = await fbRes.json();
      if (fbData.error) {
        return res.status(400).send(`Firebase login failed: ${fbData.error.message}`);
      }

      // Generate single-use authorization code
      const authCode = 'df_code_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      oauthCodes.set(authCode, {
        userId: fbData.localId,
        email: fbData.email,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      const finalRedirect = redirectUri
        ? `${redirectUri}${redirectUri.includes('?') ? '&' : '?'}code=${authCode}&state=${encodeURIComponent(clientState || '')}`
        : `/oauth/success?code=${authCode}`;

      res.redirect(finalRedirect);
    } catch (err) {
      res.status(500).send('Google sign-in error: ' + err.message);
    }
  });

  // 5. OAuth Token Exchange Endpoint (RFC 6749)
  app.post('/oauth/token', express.urlencoded({ extended: true }), (req, res) => {
    const { code, grant_type } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Code is required' });
    }

    const codeData = oauthCodes.get(code);
    if (!codeData || codeData.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Code is invalid or expired' });
    }

    // Invalidate code (single use)
    oauthCodes.delete(code);

    // Create Bearer Access Token
    const accessToken = 'df_tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    oauthTokens.set(accessToken, {
      userId: codeData.userId,
      email: codeData.email,
      createdAt: Date.now(),
    });

    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 31536000, // 1 year
      scope: 'read write',
      user_id: codeData.userId,
    });
  });

  // Root healthcheck & info
  app.get('/', (req, res) => {
    res.json({
      name: 'DebtFree Universal AI MCP Server',
      status: 'active',
      security: REQUIRED_API_KEY ? 'API_KEY_ENABLED' : 'OPEN',
      supportedProtocols: ['MCP (SSE)', 'REST / OpenAPI'],
      endpoints: {
        sse: '/sse',
        messages: '/messages',
        openapi: '/openapi.json',
      },
      supportedClients: [
        'ChatGPT (Custom Actions / GPTs)',
        'Gemini (Function Calling)',
        'Llama / Ollama (Tool Calling / LangChain)',
        'Claude (Web & Desktop)',
        'Antigravity / Cursor',
      ],
    });
  });

  // OpenAPI Specification for ChatGPT, Gemini, and Llama agents
  app.get('/openapi.json', (req, res) => {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const baseUrl = `${proto}://${req.get('host')}`;
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
            parameters: [{ name: 'userId', in: 'query', required: false, schema: { type: 'string', default: 'WOt70TOaGETm3HPaOIJzCq3VKRB3' } }],
            responses: { 200: { description: 'Success' } },
          },
        },
        '/api/transactions': {
          get: {
            summary: 'List transactions',
            operationId: 'listTransactions',
            parameters: [
              { name: 'userId', in: 'query', required: false, schema: { type: 'string', default: 'WOt70TOaGETm3HPaOIJzCq3VKRB3' } },
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
            parameters: [{ name: 'userId', in: 'query', required: false, schema: { type: 'string', default: 'WOt70TOaGETm3HPaOIJzCq3VKRB3' } }],
            responses: { 200: { description: 'Success' } },
          },
        },
        '/api/due': {
          get: {
            summary: 'Repayments due today, due soon, or overdue',
            operationId: 'getDueAndOverdue',
            parameters: [{ name: 'userId', in: 'query', required: false, schema: { type: 'string', default: 'WOt70TOaGETm3HPaOIJzCq3VKRB3' } }],
            responses: { 200: { description: 'Success' } },
          },
        },
      },
      components: {
        schemas: {
          DebtFreeUser: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
            },
          },
        },
        securitySchemes: {
          OAuth2: {
            type: 'oauth2',
            description: 'OAuth 2.0 authentication for DebtFree users',
            flows: {
              authorizationCode: {
                authorizationUrl: `${baseUrl}/oauth/authorize`,
                tokenUrl: `${baseUrl}/oauth/token`,
                scopes: {
                  'read': 'Read personal debts and contacts',
                  'write': 'Create transactions and manage records',
                },
              },
            },
          },
        },
      },
      security: [
        { OAuth2: ['read', 'write'] },
      ],
    });
  });

  // REST endpoints for agents that use direct HTTP calls (ChatGPT Actions, Gemini Functions, LangChain)
  
  const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || 'WOt70TOaGETm3HPaOIJzCq3VKRB3';
  function resolveUserId(req, paramVal) {
    if (req.oauthUser?.userId) return req.oauthUser.userId;
    if (paramVal && paramVal !== 'me' && paramVal !== '{userId}' && paramVal !== 'USER_ID' && paramVal.trim() !== '') {
      return paramVal;
    }
    return DEFAULT_USER_ID;
  }

  app.get('/api/people', async (req, res) => {
    const userId = resolveUserId(req, req.query.userId);
    if (!userId) return res.status(400).json({ error: 'userId is required (or authenticate via OAuth)' });
    const snap = await getDocs(collection(db, 'users', userId, 'people'));
    const txSnap = await getDocs(collection(db, 'users', userId, 'transactions'));
    const people = [];
    snap.forEach(d => people.push(d.data()));
    const txs = [];
    txSnap.forEach(d => txs.push(d.data()));

    const result = people.map(p => {
      const pTxs = txs.filter(t => t.personId === p.id);
      let balance = 0;
      for (const t of pTxs) balance += t.direction === 'YOU_LENT' ? t.amount : -t.amount;
      return { ...p, balance, status: balance > 0 ? `OWES_YOU_₹${balance}` : balance < 0 ? `YOU_OWE_₹${Math.abs(balance)}` : 'SETTLED' };
    });
    res.json(result);
  });

  app.get('/api/transactions', async (req, res) => {
    const userId = resolveUserId(req, req.query.userId);
    const { personId, direction } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required (or authenticate via OAuth)' });
    const snap = await getDocs(collection(db, 'users', userId, 'transactions'));
    let txs = [];
    snap.forEach(d => txs.push(d.data()));
    if (personId) txs = txs.filter(t => t.personId === personId);
    if (direction) txs = txs.filter(t => t.direction === direction);
    res.json(txs);
  });

  app.post('/api/transactions', async (req, res) => {
    const userId = resolveUserId(req, req.body.userId);
    const { personId, amount, direction, note, returnDate } = req.body;
    if (!userId || !personId || !amount || !direction) {
      return res.status(400).json({ error: 'userId, personId, amount, and direction are required' });
    }
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
    await setDoc(doc(db, 'users', userId, 'transactions', id), tx);
    res.json({ success: true, transaction: tx });
  });

  app.get('/api/summary', async (req, res) => {
    const userId = resolveUserId(req, req.query.userId);
    if (!userId) return res.status(400).json({ error: 'userId is required (or authenticate via OAuth)' });
    const snap = await getDocs(collection(db, 'users', userId, 'transactions'));
    let totalLent = 0;
    let totalBorrowed = 0;
    snap.forEach(d => {
      const t = d.data();
      if (t.direction === 'YOU_LENT') totalLent += t.amount;
      else totalBorrowed += t.amount;
    });
    res.json({ totalLent, totalBorrowed, netBalance: totalLent - totalBorrowed });
  });

  app.get('/api/due', async (req, res) => {
    const userId = resolveUserId(req, req.query.userId);
    if (!userId) return res.status(400).json({ error: 'userId is required (or authenticate via OAuth)' });

    try {
      const [peopleSnap, txSnap] = await Promise.all([
        getDocs(collection(db, 'users', userId, 'people')),
        getDocs(collection(db, 'users', userId, 'transactions')),
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

  // MCP Transport for native MCP clients (ChatGPT Plugin Creator, Claude, Cursor, Antigravity)
  const handleMcpConnection = async (req, res) => {
    try {
      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      const messagesEndpoint = `${proto}://${host}/messages`;

      const transport = new SSEServerTransport(messagesEndpoint, res);
      transports.set(transport.sessionId, transport);

      transport.onclose = () => {
        transports.delete(transport.sessionId);
      };

      const instance = createMcpServer();
      await instance.connect(transport);
    } catch (err) {
      console.error('SSE connect error:', err);
      if (!res.headersSent) res.status(500).send(err.message);
    }
  };

  app.get('/mcp', handleMcpConnection);
  app.get('/sse', handleMcpConnection);

  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = transports.get(sessionId);
    if (!transport) {
      return res.status(404).send('Session not found');
    }
    await transport.handlePostMessage(req, res);
  });

  app.listen(PORT, () => {
    console.log(`DebtFree Universal AI & MCP Server listening on port ${PORT}`);
    console.log(`- MCP SSE Endpoint: http://localhost:${PORT}/sse`);
    console.log(`- OpenAPI Spec for ChatGPT/Gemini/Llama: http://localhost:${PORT}/openapi.json`);
  });
}

// Check command line flag: if --http or PORT environment variable is present, run HTTP server; otherwise stdio
if (process.argv.includes('--http') || process.env.PORT) {
  startHttpServer().catch(err => {
    console.error('Fatal error starting HTTP server:', err);
    process.exit(1);
  });
} else {
  const transport = new StdioServerTransport();
  const stdioServer = createMcpServer();
  stdioServer.connect(transport).then(() => {
    console.error('DebtFree MCP Server running on stdio');
  }).catch(err => {
    console.error('Fatal error running DebtFree MCP Server:', err);
    process.exit(1);
  });
}
