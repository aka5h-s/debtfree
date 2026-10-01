import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import type { Person, Transaction, TransactionHistory, CreditCard, DeletedItem } from '@/lib/types';
import * as FB from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { generateId } from '@/lib/formatters';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleReturnDateReminders, cancelTransactionReminders } from '@/lib/notifications';

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
  TRASH: (uid: string) => `@debtfree_cached_trash_${uid}`,
  PENDING_SYNC: (uid: string) => `@debtfree_pending_sync_${uid}`,
};

interface DataContextValue {
  people: Person[];
  transactions: Transaction[];
  cards: CreditCard[];
  deletedItems: DeletedItem[];
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
  addTransaction: (personId: string, amount: number, direction: 'YOU_LENT' | 'YOU_BORROWED', note: string, date?: number, returnDate?: number | null) => Promise<Transaction>;
  updateTransaction: (tx: Transaction, newAmount: number, newDirection: 'YOU_LENT' | 'YOU_BORROWED', newNote: string, newDate?: number, newReturnDate?: number | null) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  getTransactionHistory: (txId: string) => Promise<TransactionHistory[]>;
  addCard: (card: Omit<CreditCard, 'id' | 'createdAt'>) => Promise<CreditCard>;
  updateCard: (card: CreditCard) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  restoreDeletedItem: (id: string, options?: { alsoRestoreTrashIds?: string[] }) => Promise<void>;
  permanentlyDeleteTrashItem: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
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
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
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
      setDeletedItems([]);
      setPendingSync([]);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const [cachedP, cachedT, cachedC, cachedTrash, cachedSync] = await Promise.all([
          AsyncStorage.getItem(CACHE_KEYS.PEOPLE(uid)),
          AsyncStorage.getItem(CACHE_KEYS.TRANSACTIONS(uid)),
          AsyncStorage.getItem(CACHE_KEYS.CARDS(uid)),
          AsyncStorage.getItem(CACHE_KEYS.TRASH(uid)),
          AsyncStorage.getItem(CACHE_KEYS.PENDING_SYNC(uid)),
        ]);
        if (isMounted) {
          if (cachedP) setPeople(JSON.parse(cachedP));
          if (cachedT) setTransactions(JSON.parse(cachedT));
          if (cachedC) setCards(JSON.parse(cachedC));
          if (cachedTrash) setDeletedItems(JSON.parse(cachedTrash));
          if (cachedSync) setPendingSync(JSON.parse(cachedSync));
        }
      } catch (e) {
        console.log('Cache read error:', e);
      }
    })();

    return () => { isMounted = false; };
  }, [uid]);

  // Persist locally helper
  const persistState = useCallback(async (
    newP?: Person[],
    newT?: Transaction[],
    newC?: CreditCard[],
    newTrash?: DeletedItem[],
    newSync?: PendingSyncAction[]
  ) => {
    if (!uid) return;
    try {
      const promises: Promise<any>[] = [];
      if (newP !== undefined) promises.push(AsyncStorage.setItem(CACHE_KEYS.PEOPLE(uid), JSON.stringify(newP)));
      if (newT !== undefined) promises.push(AsyncStorage.setItem(CACHE_KEYS.TRANSACTIONS(uid), JSON.stringify(newT)));
      if (newC !== undefined) promises.push(AsyncStorage.setItem(CACHE_KEYS.CARDS(uid), JSON.stringify(newC)));
      if (newTrash !== undefined) promises.push(AsyncStorage.setItem(CACHE_KEYS.TRASH(uid), JSON.stringify(newTrash)));
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

  // Optimistic Remove Person (Instant UI) -> move to Trash
  const removePerson = useCallback(async (id: string) => {
    if (!uid) throw new Error('Not authenticated');
    const targetPerson = people.find(p => p.id === id);
    if (!targetPerson) return;

    const personTxs = transactions.filter(t => t.personId === id);
    const nextPeople = people.filter(p => p.id !== id);
    const nextTxs = transactions.filter(t => t.personId !== id);

    const trashEntry: DeletedItem = {
      id: generateId(),
      type: 'PERSON',
      title: targetPerson.name,
      subtitle: `${personTxs.length} transaction${personTxs.length === 1 ? '' : 's'}`,
      amount: Math.abs(personTxs.reduce((sum, t) => sum + (t.direction === 'YOU_LENT' ? t.amount : -t.amount), 0)),
      direction: personTxs.reduce((sum, t) => sum + (t.direction === 'YOU_LENT' ? t.amount : -t.amount), 0) >= 0 ? 'YOU_LENT' : 'YOU_BORROWED',
      deletedAt: Date.now(),
      data: targetPerson,
      associatedTxs: personTxs,
    };

    const nextTrash = [trashEntry, ...deletedItems];

    setPeople(nextPeople);
    setTransactions(nextTxs);
    setDeletedItems(nextTrash);
    persistState(nextPeople, nextTxs, undefined, nextTrash);

    FB.deletePerson(uid, id).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'DELETE_PERSON', payload: id, timestamp: Date.now() });
    });
    FB.saveDeletedItem(uid, trashEntry).catch(() => {});
  }, [uid, people, transactions, deletedItems, persistState, queueSyncAction]);

  // Optimistic Add Transaction (Instant UI)
  const addTransaction = useCallback(async (
    personId: string,
    amount: number,
    direction: 'YOU_LENT' | 'YOU_BORROWED',
    note: string,
    date?: number,
    returnDate?: number | null
  ) => {
    if (!uid) throw new Error('Not authenticated');
    const txDate = date ?? Date.now();
    const person = people.find(p => p.id === personId);
    const personName = person?.name || 'Someone';

    const tx: Transaction = {
      id: generateId(),
      personId,
      amount,
      direction,
      date: txDate,
      note,
      createdAt: Date.now(),
      returnDate: returnDate ?? null,
    };

    // Schedule return date push reminders if returnDate is set
    if (tx.returnDate) {
      scheduleReturnDateReminders(tx, personName).then(ids => {
        if (ids.length > 0) {
          tx.notificationIds = ids;
          setTransactions(curr => curr.map(t => t.id === tx.id ? { ...t, notificationIds: ids } : t));
          if (uid) {
            FB.saveTransaction(uid, tx).catch(() => {});
          }
        }
      }).catch(err => console.log('Reminder scheduling error:', err));
    }

    const nextTxs = [tx, ...transactions];
    setTransactions(nextTxs);
    persistState(undefined, nextTxs);

    FB.saveTransaction(uid, tx).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'SAVE_TX', payload: tx, timestamp: Date.now() });
    });

    return tx;
  }, [uid, people, transactions, persistState, queueSyncAction]);

  // Optimistic Update Transaction (Instant UI)
  const updateTransaction = useCallback(async (
    tx: Transaction,
    newAmount: number,
    newDirection: 'YOU_LENT' | 'YOU_BORROWED',
    newNote: string,
    newDate?: number,
    newReturnDate?: number | null
  ) => {
    if (!uid) throw new Error('Not authenticated');
    const historyEntry: TransactionHistory = {
      id: generateId(),
      transactionId: tx.id,
      previousAmount: tx.amount,
      previousDirection: tx.direction,
      previousNote: tx.note,
      previousDate: tx.date,
      previousReturnDate: tx.returnDate ?? null,
      changedAt: Date.now(),
    };

    const finalReturnDate = newReturnDate !== undefined ? newReturnDate : (tx.returnDate ?? null);

    // Cancel prior notifications if returnDate or amount or direction changed
    cancelTransactionReminders(tx.notificationIds).catch(() => {});

    const updated: Transaction = {
      ...tx,
      amount: newAmount,
      direction: newDirection,
      note: newNote,
      ...(newDate !== undefined ? { date: newDate } : {}),
      returnDate: finalReturnDate,
      notificationIds: undefined,
    };

    // Re-schedule reminders if a returnDate is present
    if (finalReturnDate) {
      const person = people.find(p => p.id === tx.personId);
      scheduleReturnDateReminders(updated, person?.name || 'Someone').then(ids => {
        if (ids.length > 0) {
          updated.notificationIds = ids;
          setTransactions(curr => curr.map(t => t.id === tx.id ? { ...t, notificationIds: ids } : t));
          if (uid) {
            FB.saveTransaction(uid, updated).catch(() => {});
          }
        }
      }).catch(err => console.log('Reminder rescheduling error:', err));
    }

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
  }, [uid, people, transactions, persistState, queueSyncAction]);

  // Optimistic Remove Transaction (Instant UI) -> move to Trash
  const removeTransaction = useCallback(async (id: string) => {
    if (!uid) throw new Error('Not authenticated');
    const targetTx = transactions.find(t => t.id === id);
    if (!targetTx) return;

    if (targetTx.notificationIds) {
      cancelTransactionReminders(targetTx.notificationIds).catch(() => {});
    }

    const person = people.find(p => p.id === targetTx.personId);
    const nextTxs = transactions.filter(t => t.id !== id);

    const trashEntry: DeletedItem = {
      id: generateId(),
      type: 'TRANSACTION',
      title: `${targetTx.direction === 'YOU_LENT' ? 'Lent to' : 'Borrowed from'} ${person?.name || 'Someone'}`,
      subtitle: targetTx.note || 'No note',
      amount: targetTx.amount,
      direction: targetTx.direction,
      deletedAt: Date.now(),
      data: targetTx,
    };

    const nextTrash = [trashEntry, ...deletedItems];

    setTransactions(nextTxs);
    setDeletedItems(nextTrash);
    persistState(undefined, nextTxs, undefined, nextTrash);

    FB.deleteTransaction(uid, id).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'DELETE_TX', payload: id, timestamp: Date.now() });
    });
    FB.saveDeletedItem(uid, trashEntry).catch(() => {});
  }, [uid, people, transactions, deletedItems, persistState, queueSyncAction]);

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

  // Optimistic Remove Card (Instant UI) -> move to Trash
  const removeCard = useCallback(async (id: string) => {
    if (!uid) throw new Error('Not authenticated');
    const targetCard = cards.find(c => c.id === id);
    if (!targetCard) return;

    const nextCards = cards.filter(c => c.id !== id);

    const trashEntry: DeletedItem = {
      id: generateId(),
      type: 'CARD',
      title: targetCard.cardName,
      subtitle: `Ends in ${targetCard.cardNumber.slice(-4)}`,
      deletedAt: Date.now(),
      data: targetCard,
    };

    const nextTrash = [trashEntry, ...deletedItems];

    setCards(nextCards);
    setDeletedItems(nextTrash);
    persistState(undefined, undefined, nextCards, nextTrash);

    FB.deleteCard(uid, id).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'DELETE_CARD', payload: id, timestamp: Date.now() });
    });
    FB.saveDeletedItem(uid, trashEntry).catch(() => {});
  }, [uid, cards, deletedItems, persistState, queueSyncAction]);

  // Restore deleted item from Trash
  const restoreDeletedItem = useCallback(async (id: string, options?: { alsoRestoreTrashIds?: string[] }) => {
    if (!uid) throw new Error('Not authenticated');
    const idsToRestore = [id, ...(options?.alsoRestoreTrashIds || [])];
    const itemsToRestore = deletedItems.filter(d => idsToRestore.includes(d.id));
    if (itemsToRestore.length === 0) return;

    const nextTrash = deletedItems.filter(d => !idsToRestore.includes(d.id));
    setDeletedItems(nextTrash);

    let nextPeople = [...people];
    let nextTxs = [...transactions];
    let nextCards = [...cards];

    for (const item of itemsToRestore) {
      if (item.type === 'PERSON') {
        const restoredPerson: Person = item.data;
        const restoredTxs: Transaction[] = item.associatedTxs || [];

        nextPeople = [restoredPerson, ...nextPeople.filter(p => p.id !== restoredPerson.id)];
        nextTxs = [...restoredTxs, ...nextTxs.filter(t => !restoredTxs.some(rt => rt.id === t.id))];

        FB.savePerson(uid, restoredPerson).catch(() => {});
        for (const t of restoredTxs) {
          FB.saveTransaction(uid, t).catch(() => {});
        }
      } else if (item.type === 'TRANSACTION') {
        const restoredTx: Transaction = item.data;
        nextTxs = [restoredTx, ...nextTxs.filter(t => t.id !== restoredTx.id)];

        FB.saveTransaction(uid, restoredTx).catch(() => {});
      } else if (item.type === 'CARD') {
        const restoredCard: CreditCard = item.data;
        nextCards = [restoredCard, ...nextCards.filter(c => c.id !== restoredCard.id)];

        FB.saveCard(uid, restoredCard).catch(() => {});
      }

      FB.permanentlyDeleteTrashItem(uid, item.id).catch(() => {});
    }

    setPeople(nextPeople);
    setTransactions(nextTxs);
    setCards(nextCards);
    persistState(nextPeople, nextTxs, nextCards, nextTrash);
  }, [uid, deletedItems, people, transactions, cards, persistState]);

  // Permanently delete a trash item
  const permanentlyDeleteTrashItem = useCallback(async (id: string) => {
    if (!uid) throw new Error('Not authenticated');
    const nextTrash = deletedItems.filter(d => d.id !== id);
    setDeletedItems(nextTrash);
    persistState(undefined, undefined, undefined, nextTrash);

    FB.permanentlyDeleteTrashItem(uid, id).catch(() => {});
  }, [uid, deletedItems, persistState]);

  // Empty entire Trash bin
  const emptyTrash = useCallback(async () => {
    if (!uid) throw new Error('Not authenticated');
    const toDelete = [...deletedItems];
    setDeletedItems([]);
    persistState(undefined, undefined, undefined, []);

    for (const item of toDelete) {
      FB.permanentlyDeleteTrashItem(uid, item.id).catch(() => {});
    }
  }, [uid, deletedItems, persistState]);

  const value = useMemo(() => ({
    people, transactions, cards, deletedItems, isLoading,
    isOnline, isSyncing, pendingSyncCount: pendingSync.length, reload,
    addPerson, updatePerson, removePerson,
    getPersonTransactions, getPersonBalance,
    addTransaction, updateTransaction, removeTransaction, getTransactionHistory,
    addCard, updateCard, removeCard,
    restoreDeletedItem, permanentlyDeleteTrashItem, emptyTrash,
    globalBalance, totalLent, totalBorrowed,
  }), [people, transactions, cards, deletedItems, isLoading,
    isOnline, isSyncing, pendingSync.length, reload,
    addPerson, updatePerson, removePerson,
    getPersonTransactions, getPersonBalance,
    addTransaction, updateTransaction, removeTransaction, getTransactionHistory,
    addCard, updateCard, removeCard,
    restoreDeletedItem, permanentlyDeleteTrashItem, emptyTrash,
    globalBalance, totalLent, totalBorrowed]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

