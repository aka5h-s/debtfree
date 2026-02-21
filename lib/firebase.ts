import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
// @ts-ignore - getReactNativePersistence exists at runtime in React Native
import { getReactNativePersistence } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  where,
  writeBatch,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Person, Transaction, TransactionHistory, CreditCard } from '@/lib/types';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let auth: ReturnType<typeof getAuth>;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(app);
  }
}

const db = getFirestore(app);

export { auth, db, GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword, firebaseSignOut, onAuthStateChanged };
export type { User };

function emailKey(email: string): string {
  return email.toLowerCase().replace(/[.#$/\[\]]/g, '_');
}

export async function savePerson(userEmail: string, person: Person): Promise<void> {
  const key = emailKey(userEmail);
  await setDoc(doc(db, 'users', key, 'people', person.id), person);
}

export async function getPeople(userEmail: string): Promise<Person[]> {
  const key = emailKey(userEmail);
  const snap = await getDocs(collection(db, 'users', key, 'people'));
  const items: Person[] = [];
  snap.forEach(d => items.push(d.data() as Person));
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deletePerson(userEmail: string, personId: string): Promise<void> {
  const key = emailKey(userEmail);
  await deleteDoc(doc(db, 'users', key, 'people', personId));
  const txSnap = await getDocs(
    query(collection(db, 'users', key, 'transactions'), where('personId', '==', personId))
  );
  const batch = writeBatch(db);
  txSnap.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

export async function saveTransaction(userEmail: string, tx: Transaction): Promise<void> {
  const key = emailKey(userEmail);
  await setDoc(doc(db, 'users', key, 'transactions', tx.id), tx);
}

export async function getTransactions(userEmail: string): Promise<Transaction[]> {
  const key = emailKey(userEmail);
  const snap = await getDocs(collection(db, 'users', key, 'transactions'));
  const items: Transaction[] = [];
  snap.forEach(d => items.push(d.data() as Transaction));
  return items.sort((a, b) => b.date - a.date);
}

export async function deleteTransaction(userEmail: string, txId: string): Promise<void> {
  const key = emailKey(userEmail);
  await deleteDoc(doc(db, 'users', key, 'transactions', txId));
}

export async function addTransactionHistory(userEmail: string, entry: TransactionHistory): Promise<void> {
  const key = emailKey(userEmail);
  await setDoc(doc(db, 'users', key, 'transactionHistory', entry.id), entry);
}

export async function getHistoryForTransaction(userEmail: string, txId: string): Promise<TransactionHistory[]> {
  const key = emailKey(userEmail);
  const snap = await getDocs(
    query(collection(db, 'users', key, 'transactionHistory'), where('transactionId', '==', txId))
  );
  const items: TransactionHistory[] = [];
  snap.forEach(d => items.push(d.data() as TransactionHistory));
  return items.sort((a, b) => b.changedAt - a.changedAt);
}

export async function saveCard(userEmail: string, card: CreditCard): Promise<void> {
  const key = emailKey(userEmail);
  await setDoc(doc(db, 'users', key, 'cards', card.id), card);
}

export async function getCards(userEmail: string): Promise<CreditCard[]> {
  const key = emailKey(userEmail);
  const snap = await getDocs(collection(db, 'users', key, 'cards'));
  const items: CreditCard[] = [];
  snap.forEach(d => items.push(d.data() as CreditCard));
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteCard(userEmail: string, cardId: string): Promise<void> {
  const key = emailKey(userEmail);
  await deleteDoc(doc(db, 'users', key, 'cards', cardId));
}

export function calculatePersonBalance(txs: Transaction[]): number {
  let balance = 0;
  for (const tx of txs) {
    if (tx.direction === 'YOU_LENT') balance += tx.amount;
    else balance -= tx.amount;
  }
  return balance;
}
