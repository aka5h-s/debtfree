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

function userDoc(userId: string) {
  return doc(db, 'users', userId);
}

function userCollection(userId: string, col: string) {
  return collection(db, 'users', userId, col);
}

export async function savePerson(userId: string, person: Person): Promise<void> {
  await setDoc(doc(db, 'users', userId, 'people', person.id), person);
}

export async function getPeople(userId: string): Promise<Person[]> {
  const snap = await getDocs(collection(db, 'users', userId, 'people'));
  const items: Person[] = [];
  snap.forEach(d => items.push(d.data() as Person));
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deletePerson(userId: string, personId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'people', personId));
  const txSnap = await getDocs(
    query(collection(db, 'users', userId, 'transactions'), where('personId', '==', personId))
  );
  const batch = writeBatch(db);
  txSnap.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

export async function saveTransaction(userId: string, tx: Transaction): Promise<void> {
  await setDoc(doc(db, 'users', userId, 'transactions', tx.id), tx);
}

export async function getTransactions(userId: string): Promise<Transaction[]> {
  const snap = await getDocs(collection(db, 'users', userId, 'transactions'));
  const items: Transaction[] = [];
  snap.forEach(d => items.push(d.data() as Transaction));
  return items.sort((a, b) => b.date - a.date);
}

export async function deleteTransaction(userId: string, txId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'transactions', txId));
}

export async function addTransactionHistory(userId: string, entry: TransactionHistory): Promise<void> {
  await setDoc(doc(db, 'users', userId, 'transactionHistory', entry.id), entry);
}

export async function getHistoryForTransaction(userId: string, txId: string): Promise<TransactionHistory[]> {
  const snap = await getDocs(
    query(collection(db, 'users', userId, 'transactionHistory'), where('transactionId', '==', txId))
  );
  const items: TransactionHistory[] = [];
  snap.forEach(d => items.push(d.data() as TransactionHistory));
  return items.sort((a, b) => b.changedAt - a.changedAt);
}

export async function saveCard(userId: string, card: CreditCard): Promise<void> {
  await setDoc(doc(db, 'users', userId, 'cards', card.id), card);
}

export async function getCards(userId: string): Promise<CreditCard[]> {
  const snap = await getDocs(collection(db, 'users', userId, 'cards'));
  const items: CreditCard[] = [];
  snap.forEach(d => items.push(d.data() as CreditCard));
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteCard(userId: string, cardId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'cards', cardId));
}

export function calculatePersonBalance(txs: Transaction[]): number {
  let balance = 0;
  for (const tx of txs) {
    if (tx.direction === 'YOU_LENT') balance += tx.amount;
    else balance -= tx.amount;
  }
  return balance;
}
