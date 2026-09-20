import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import type { Person, Transaction, TransactionHistory, CreditCard } from '@/lib/types';
import * as FB from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { generateId } from '@/lib/formatters';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PendingSyncAction {
  id: string;
  type: 'SAVE_PERSON' | 'DELETE_PERSON' | 'SAVE_TX' | 'DELETE_TX' | 'SAVE_CARD' | 'DELETE_CARD' | 'SAVE_TX_HISTORY';
  payload: any;
  timestamp: number;
}

const CACHE_KEYS = {
  PEOPLE: (uid: string) => `@debtfree_cached_people_${uid}`,
  TRANSACTIONS: (uid: string) => `@debtfree_cached_txs_${uid}`,
  CARDS: (uid: string) => `@debtfree_cached_cards_${uid}`,
  PENDING_SYNC: (uid: string) => `@debtfree_pending_sync_${uid}`,
};

interface DataContextValue {
  people: Person[];
  transactions: Transaction[];
  cards: CreditCard[];
  isLoading: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  reload: () => Promise<void>;
  addPerson: (name: string, phone: string, notes: string) => Promise<Person>;
  updatePerson: (person: Person) => Promise<void>;
  removePerson: (id: string) => Promise<void>;
  getPersonTransactions: (personId: string) => Transaction[];
  getPersonBalance: (personId: string) => number;
  addTransaction: (personId: string, amount: number, direction: 'YOU_LENT' | 'YOU_BORROWED', note: string) => Promise<Transaction>;
  updateTransaction: (tx: Transaction, newAmount: number, newDirection: 'YOU_LENT' | 'YOU_BORROWED', newNote: string) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  getTransactionHistory: (txId: string) => Promise<TransactionHistory[]>;
  addCard: (card: Omit<CreditCard, 'id' | 'createdAt'>) => Promise<CreditCard>;
  updateCard: (card: CreditCard) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  globalBalance: number;
  totalLent: number;
  totalBorrowed: number;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSync, setPendingSync] = useState<PendingSyncAction[]>([]);

  const uid = user?.uid;

  // 1. Immediate cache load on user change (<50ms startup)
  useEffect(() => {
    if (!uid) {
      setPeople([]);
      setTransactions([]);
      setCards([]);
      setPendingSync([]);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const [cachedP, cachedT, cachedC, cachedSync] = await Promise.all([
          AsyncStorage.getItem(CACHE_KEYS.PEOPLE(uid)),
          AsyncStorage.getItem(CACHE_KEYS.TRANSACTIONS(uid)),
          AsyncStorage.getItem(CACHE_KEYS.CARDS(uid)),
          AsyncStorage.getItem(CACHE_KEYS.PENDING_SYNC(uid)),
        ]);
        if (isMounted) {
          if (cachedP) setPeople(JSON.parse(cachedP));
          if (cachedT) setTransactions(JSON.parse(cachedT));
          if (cachedC) setCards(JSON.parse(cachedC));
          if (cachedSync) setPendingSync(JSON.parse(cachedSync));
        }
      } catch (e) {
        console.log('Cache read error:', e);
      }
    })();

    return () => { isMounted = false; };
  }, [uid]);

  // Persist locally helper
  const persistState = useCallback(async (newP?: Person[], newT?: Transaction[], newC?: CreditCard[], newSync?: PendingSyncAction[]) => {
    if (!uid) return;
    try {
      const promises: Promise<any>[] = [];
      if (newP !== undefined) promises.push(AsyncStorage.setItem(CACHE_KEYS.PEOPLE(uid), JSON.stringify(newP)));
      if (newT !== undefined) promises.push(AsyncStorage.setItem(CACHE_KEYS.TRANSACTIONS(uid), JSON.stringify(newT)));
      if (newC !== undefined) promises.push(AsyncStorage.setItem(CACHE_KEYS.CARDS(uid), JSON.stringify(newC)));
      if (newSync !== undefined) promises.push(AsyncStorage.setItem(CACHE_KEYS.PENDING_SYNC(uid), JSON.stringify(newSync)));
      await Promise.all(promises);
    } catch (e) {
      console.log('Cache write error:', e);
    }
  }, [uid]);

  // Queue an offline sync action
  const queueSyncAction = useCallback((action: PendingSyncAction) => {
    setPendingSync(prev => {
      const updated = [...prev, action];
      if (uid) AsyncStorage.setItem(CACHE_KEYS.PENDING_SYNC(uid), JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, [uid]);

  // Process any pending queue actions to Firebase
  const flushPendingSync = useCallback(async (currentQueue: PendingSyncAction[]) => {
    if (!uid || currentQueue.length === 0) return;
    setIsSyncing(true);
    const remaining: PendingSyncAction[] = [];

    for (const item of currentQueue) {
      try {
        if (item.type === 'SAVE_PERSON') await FB.savePerson(uid, item.payload);
        else if (item.type === 'DELETE_PERSON') await FB.deletePerson(uid, item.payload);
        else if (item.type === 'SAVE_TX') await FB.saveTransaction(uid, item.payload);
        else if (item.type === 'DELETE_TX') await FB.deleteTransaction(uid, item.payload);
        else if (item.type === 'SAVE_CARD') await FB.saveCard(uid, item.payload);
        else if (item.type === 'DELETE_CARD') await FB.deleteCard(uid, item.payload);
        else if (item.type === 'SAVE_TX_HISTORY') await FB.addTransactionHistory(uid, item.payload);
      } catch (err) {
        remaining.push(item);
      }
    }

    setPendingSync(remaining);
    if (uid) AsyncStorage.setItem(CACHE_KEYS.PENDING_SYNC(uid), JSON.stringify(remaining)).catch(() => {});
    setIsSyncing(false);
  }, [uid]);

  // Silent Background Sync / Reload
  const reload = useCallback(async () => {
    if (!uid) return;
    try {
      setIsSyncing(true);
      // First flush pending changes
      if (pendingSync.length > 0) {
        await flushPendingSync(pendingSync);
      }

      const [p, t, c] = await Promise.all([
        FB.getPeople(uid),
        FB.getTransactions(uid),
        FB.getCards(uid),
      ]);

      setPeople(p);
      setTransactions(t);
      setCards(c);
      setIsOnline(true);
      await persistState(p, t, c);
    } catch (e) {
      console.log('Firebase fetch failed, running in offline mode:', e);
      setIsOnline(false);
    } finally {
      setIsSyncing(false);
    }
  }, [uid, pendingSync, flushPendingSync, persistState]);

  // Background refresh on load
  useEffect(() => {
    if (uid) {
      reload();
    }
  }, [uid]);

  const getPersonTransactions = useCallback((personId: string) => {
    return transactions.filter(t => t.personId === personId).sort((a, b) => b.date - a.date);
  }, [transactions]);

  const getPersonBalance = useCallback((personId: string) => {
    const txs = transactions.filter(t => t.personId === personId);
    return FB.calculatePersonBalance(txs);
  }, [transactions]);

  const { globalBalance, totalLent, totalBorrowed } = useMemo(() => {
    const balanceMap = new Map<string, number>();
    for (const p of people) {
      const txs = transactions.filter(t => t.personId === p.id);
      balanceMap.set(p.id, FB.calculatePersonBalance(txs));
    }
    let global = 0;
    let lent = 0;
    let borrowed = 0;
    for (const bal of balanceMap.values()) {
      global += bal;
      if (bal > 0) lent += bal;
      else if (bal < 0) borrowed += Math.abs(bal);
    }
    return { globalBalance: global, totalLent: lent, totalBorrowed: borrowed };
  }, [people, transactions]);

  // Optimistic Add Person (Instant UI)
  const addPerson = useCallback(async (name: string, phone: string, notes: string) => {
    if (!uid) throw new Error('Not authenticated');
    const person: Person = { id: generateId(), name, phone, notes, createdAt: Date.now() };
    const nextPeople = [person, ...people];
    setPeople(nextPeople);
    persistState(nextPeople);

    // Save to Firebase asynchronously
    FB.savePerson(uid, person).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'SAVE_PERSON', payload: person, timestamp: Date.now() });
    });

    return person;
  }, [uid, people, persistState, queueSyncAction]);

  // Optimistic Update Person (Instant UI)
  const updatePerson = useCallback(async (person: Person) => {
    if (!uid) throw new Error('Not authenticated');
    const nextPeople = people.map(p => p.id === person.id ? person : p);
    setPeople(nextPeople);
    persistState(nextPeople);

    FB.savePerson(uid, person).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'SAVE_PERSON', payload: person, timestamp: Date.now() });
    });
  }, [uid, people, persistState, queueSyncAction]);

  // Optimistic Remove Person (Instant UI)
  const removePerson = useCallback(async (id: string) => {
    if (!uid) throw new Error('Not authenticated');
    const nextPeople = people.filter(p => p.id !== id);
    const nextTxs = transactions.filter(t => t.personId !== id);
    setPeople(nextPeople);
    setTransactions(nextTxs);
    persistState(nextPeople, nextTxs);

    FB.deletePerson(uid, id).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'DELETE_PERSON', payload: id, timestamp: Date.now() });
    });
  }, [uid, people, transactions, persistState, queueSyncAction]);

  // Optimistic Add Transaction (Instant UI)
  const addTransaction = useCallback(async (personId: string, amount: number, direction: 'YOU_LENT' | 'YOU_BORROWED', note: string) => {
    if (!uid) throw new Error('Not authenticated');
    const tx: Transaction = { id: generateId(), personId, amount, direction, date: Date.now(), note, createdAt: Date.now() };
    const nextTxs = [tx, ...transactions];
    setTransactions(nextTxs);
    persistState(undefined, nextTxs);

    FB.saveTransaction(uid, tx).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'SAVE_TX', payload: tx, timestamp: Date.now() });
    });

    return tx;
  }, [uid, transactions, persistState, queueSyncAction]);

  // Optimistic Update Transaction (Instant UI)
  const updateTransaction = useCallback(async (tx: Transaction, newAmount: number, newDirection: 'YOU_LENT' | 'YOU_BORROWED', newNote: string) => {
    if (!uid) throw new Error('Not authenticated');
    const historyEntry: TransactionHistory = {
      id: generateId(),
      transactionId: tx.id,
      previousAmount: tx.amount,
      previousDirection: tx.direction,
      previousNote: tx.note,
      changedAt: Date.now(),
    };
    const updated = { ...tx, amount: newAmount, direction: newDirection, note: newNote };
    const nextTxs = transactions.map(t => t.id === tx.id ? updated : t);
    setTransactions(nextTxs);
    persistState(undefined, nextTxs);

    FB.addTransactionHistory(uid, historyEntry).catch(() => {
      queueSyncAction({ id: generateId(), type: 'SAVE_TX_HISTORY', payload: historyEntry, timestamp: Date.now() });
    });
    FB.saveTransaction(uid, updated).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'SAVE_TX', payload: updated, timestamp: Date.now() });
    });
  }, [uid, transactions, persistState, queueSyncAction]);

  // Optimistic Remove Transaction (Instant UI)
  const removeTransaction = useCallback(async (id: string) => {
    if (!uid) throw new Error('Not authenticated');
    const nextTxs = transactions.filter(t => t.id !== id);
    setTransactions(nextTxs);
    persistState(undefined, nextTxs);

    FB.deleteTransaction(uid, id).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'DELETE_TX', payload: id, timestamp: Date.now() });
    });
  }, [uid, transactions, persistState, queueSyncAction]);

  const getTransactionHistory = useCallback(async (txId: string) => {
    if (!uid) return [];
    try {
      return await FB.getHistoryForTransaction(uid, txId);
    } catch {
      return [];
    }
  }, [uid]);

  // Optimistic Add Card (Instant UI)
  const addCard = useCallback(async (data: Omit<CreditCard, 'id' | 'createdAt'>) => {
    if (!uid) throw new Error('Not authenticated');
    const card: CreditCard = { ...data, id: generateId(), createdAt: Date.now() };
    const nextCards = [card, ...cards];
    setCards(nextCards);
    persistState(undefined, undefined, nextCards);

    FB.saveCard(uid, card).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'SAVE_CARD', payload: card, timestamp: Date.now() });
    });

    return card;
  }, [uid, cards, persistState, queueSyncAction]);

  // Optimistic Update Card (Instant UI)
  const updateCard = useCallback(async (card: CreditCard) => {
    if (!uid) throw new Error('Not authenticated');
    const nextCards = cards.map(c => c.id === card.id ? card : c);
    setCards(nextCards);
    persistState(undefined, undefined, nextCards);

    FB.saveCard(uid, card).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'SAVE_CARD', payload: card, timestamp: Date.now() });
    });
  }, [uid, cards, persistState, queueSyncAction]);

  // Optimistic Remove Card (Instant UI)
  const removeCard = useCallback(async (id: string) => {
    if (!uid) throw new Error('Not authenticated');
    const nextCards = cards.filter(c => c.id !== id);
    setCards(nextCards);
    persistState(undefined, undefined, nextCards);

    FB.deleteCard(uid, id).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'DELETE_CARD', payload: id, timestamp: Date.now() });
    });
  }, [uid, cards, persistState, queueSyncAction]);

  const value = useMemo(() => ({
    people, transactions, cards, isLoading,
    isOnline, isSyncing, pendingSyncCount: pendingSync.length, reload,
    addPerson, updatePerson, removePerson,
    getPersonTransactions, getPersonBalance,
    addTransaction, updateTransaction, removeTransaction, getTransactionHistory,
    addCard, updateCard, removeCard,
    globalBalance, totalLent, totalBorrowed,
  }), [people, transactions, cards, isLoading,
    isOnline, isSyncing, pendingSync.length, reload,
    addPerson, updatePerson, removePerson,
    getPersonTransactions, getPersonBalance,
    addTransaction, updateTransaction, removeTransaction, getTransactionHistory,
    addCard, updateCard, removeCard,
    globalBalance, totalLent, totalBorrowed]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

