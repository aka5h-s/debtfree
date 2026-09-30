import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { initializeApp, getApps } from 'firebase/app';
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
const db = getFirestore(app);

// Helper to generate IDs
function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Create the MCP server instance
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

// Start server on stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('DebtFree MCP Server running on stdio');
}

main().catch(err => {
  console.error('Fatal error running DebtFree MCP Server:', err);
  process.exit(1);
});
