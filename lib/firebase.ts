import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  Firestore,
} from 'firebase/firestore';
import type { Person, Transaction, TransactionHistory, CreditCard } from '@/lib/types';
import * as Storage from '@/lib/storage';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

const COLLECTIONS = {
  people: 'people',
  transactions: 'transactions',
  transactionHistory: 'transactionHistory',
  cards: 'cards',
} as const;

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export function isFirebaseInitialized(): boolean {
  return app !== null && db !== null;
}

export function initFirebase(config: FirebaseConfig): boolean {
  try {
    if (getApps().length > 0) {
      app = getApps()[0];
    } else {
      app = initializeApp(config);
    }
    db = getFirestore(app);
    return true;
  } catch (error) {
    console.error('Firebase init error:', error);
    return false;
  }
}

export function disconnectFirebase() {
  app = null;
  db = null;
}

function getDb(): Firestore {
  if (!db) throw new Error('Firebase not initialized');
  return db;
}

export async function uploadAllToCloud(): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = getDb();
    const [people, transactions, cards] = await Promise.all([
      Storage.getPeople(),
      Storage.getTransactions(),
      Storage.getCards(),
    ]);

    const batch = writeBatch(firestore);

    for (const person of people) {
      batch.set(doc(firestore, COLLECTIONS.people, person.id), person);
    }

    for (const tx of transactions) {
      batch.set(doc(firestore, COLLECTIONS.transactions, tx.id), tx);
    }

    for (const card of cards) {
      batch.set(doc(firestore, COLLECTIONS.cards, card.id), card);
    }

    const allHistory: TransactionHistory[] = [];
    for (const tx of transactions) {
      const history = await Storage.getHistoryForTransaction(tx.id);
      allHistory.push(...history);
    }
    for (const h of allHistory) {
      batch.set(doc(firestore, COLLECTIONS.transactionHistory, h.id), h);
    }

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Upload failed' };
  }
}

export async function downloadFromCloud(): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = getDb();

    const [peopleSnap, txSnap, cardsSnap, historySnap] = await Promise.all([
      getDocs(collection(firestore, COLLECTIONS.people)),
      getDocs(collection(firestore, COLLECTIONS.transactions)),
      getDocs(collection(firestore, COLLECTIONS.cards)),
      getDocs(collection(firestore, COLLECTIONS.transactionHistory)),
    ]);

    const people: Person[] = [];
    peopleSnap.forEach(d => people.push(d.data() as Person));

    const transactions: Transaction[] = [];
    txSnap.forEach(d => transactions.push(d.data() as Transaction));

    const cards: CreditCard[] = [];
    cardsSnap.forEach(d => cards.push(d.data() as CreditCard));

    const history: TransactionHistory[] = [];
    historySnap.forEach(d => history.push(d.data() as TransactionHistory));

    for (const p of people) await Storage.savePerson(p);
    for (const t of transactions) await Storage.saveTransaction(t);
    for (const c of cards) await Storage.saveCard(c);
    for (const h of history) await Storage.addTransactionHistory(h);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Download failed' };
  }
}
