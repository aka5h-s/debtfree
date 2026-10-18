import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import type { Person, Transaction, TransactionHistory, CreditCard, DeletedItem, Account, Loan, AccountLogType, AccountLogEntry } from '@/lib/types';
import * as FB from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { generateId } from '@/lib/formatters';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleReturnDateReminders, cancelTransactionReminders } from '@/lib/notifications';

interface PendingSyncAction {
  id: string;
  type: 'SAVE_PERSON' | 'DELETE_PERSON' | 'SAVE_TX' | 'DELETE_TX' | 'SAVE_CARD' | 'DELETE_CARD' | 'SAVE_TX_HISTORY' | 'SAVE_ACCOUNT' | 'DELETE_ACCOUNT' | 'SAVE_LOAN' | 'DELETE_LOAN';
  payload: any;
  timestamp: number;
}

const CACHE_KEYS = {
  LAST_UID: '@debtfree_last_uid',
  PEOPLE: (uid: string) => `@debtfree_cached_people_${uid}`,
  TRANSACTIONS: (uid: string) => `@debtfree_cached_txs_${uid}`,
  CARDS: (uid: string) => `@debtfree_cached_cards_${uid}`,
  ACCOUNTS: (uid: string) => `@debtfree_cached_accounts_${uid}`,
  LOANS: (uid: string) => `@debtfree_cached_loans_${uid}`,
  TRASH: (uid: string) => `@debtfree_cached_trash_${uid}`,
  PENDING_SYNC: (uid: string) => `@debtfree_pending_sync_${uid}`,
  ENABLE_LOANS: (uid: string) => `@debtfree_enable_loans_${uid}`,
  INCLUDE_LOANS_IN_TOTAL: (uid: string) => `@debtfree_include_loans_${uid}`,
};

interface DataContextValue {
  people: Person[];
  transactions: Transaction[];
  cards: CreditCard[];
  accounts: Account[];
  loans: Loan[];
  deletedItems: DeletedItem[];
  isLoading: boolean;
  isCacheHydrated: boolean;
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
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => Promise<Account>;
  updateAccount: (account: Account) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  addAccountLog: (accountId: string, logData: {
    amount: number;
    type: AccountLogType;
    note?: string;
    date?: number;
  }) => Promise<void>;
  deleteAccountLog: (accountId: string, logId: string) => Promise<void>;
  addLoan: (loan: Omit<Loan, 'id' | 'createdAt'>) => Promise<Loan>;
  updateLoan: (loan: Loan) => Promise<void>;
  removeLoan: (id: string) => Promise<void>;
  restoreDeletedItem: (id: string, options?: { alsoRestoreTrashIds?: string[] }) => Promise<void>;
  permanentlyDeleteTrashItem: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  globalBalance: number;
  netBalance: number;
  totalLent: number;
  totalBorrowed: number;
  totalCashAndAccounts: number;
  totalCreditCardsDue: number;
  totalLoansRemaining: number;
  enableLoans: boolean;
  setEnableLoans: (val: boolean) => Promise<void>;
  includeLoansInTotal: boolean;
  setIncludeLoansInTotal: (val: boolean) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [enableLoans, setEnableLoansState] = useState<boolean>(true);
  const [includeLoansInTotal, setIncludeLoansInTotalState] = useState<boolean>(false);
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCacheHydrated, setIsCacheHydrated] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSync, setPendingSync] = useState<PendingSyncAction[]>([]);
  const isReloadingRef = React.useRef(false);

  const uid = user?.uid;

  // 1. Instant Cache Hydration (<10ms)
  useEffect(() => {
    let isMounted = true;

    (async () => {
      const activeUid = uid || (await AsyncStorage.getItem(CACHE_KEYS.LAST_UID).catch(() => null));
      if (!activeUid) {
        if (isMounted) {
          setIsCacheHydrated(true);
        }
        return;
      }

      try {
        const [cachedP, cachedT, cachedC, cachedA, cachedL, cachedTrash, cachedSync, cachedEnableLoans, cachedIncludeLoans] = await Promise.all([
          AsyncStorage.getItem(CACHE_KEYS.PEOPLE(activeUid)),
          AsyncStorage.getItem(CACHE_KEYS.TRANSACTIONS(activeUid)),
          AsyncStorage.getItem(CACHE_KEYS.CARDS(activeUid)),
          AsyncStorage.getItem(CACHE_KEYS.ACCOUNTS(activeUid)),
          AsyncStorage.getItem(CACHE_KEYS.LOANS(activeUid)),
          AsyncStorage.getItem(CACHE_KEYS.TRASH(activeUid)),
          AsyncStorage.getItem(CACHE_KEYS.PENDING_SYNC(activeUid)),
          AsyncStorage.getItem(CACHE_KEYS.ENABLE_LOANS(activeUid)),
          AsyncStorage.getItem(CACHE_KEYS.INCLUDE_LOANS_IN_TOTAL(activeUid)),
        ]);

        if (isMounted) {
          const parsedPeople: Person[] = cachedP ? JSON.parse(cachedP) : [];
          const parsedTrash: DeletedItem[] = cachedTrash ? JSON.parse(cachedTrash) : [];
          const parsedCards: CreditCard[] = cachedC ? JSON.parse(cachedC) : [];
          const parsedAccounts: Account[] = cachedA ? JSON.parse(cachedA) : [];
          const parsedLoans: Loan[] = cachedL ? JSON.parse(cachedL) : [];
          let parsedTxs: Transaction[] = cachedT ? JSON.parse(cachedT) : [];

          const activePersonIds = new Set(parsedPeople.map(p => p.id));
          const deletedTxIds = new Set(
            parsedTrash
              .filter(d => d.type === 'TRANSACTION')
              .map(d => d.data?.id || d.id)
          );
          for (const d of parsedTrash) {
            if (d.type === 'PERSON' && d.associatedTxs) {
              for (const at of d.associatedTxs) {
                deletedTxIds.add(at.id);
              }
            }
          }

          parsedTxs = parsedTxs.filter(tx => activePersonIds.has(tx.personId) && !deletedTxIds.has(tx.id));

          if (parsedPeople.length > 0) setPeople(parsedPeople);
          if (parsedTxs.length > 0) setTransactions(parsedTxs);
          if (parsedCards.length > 0) setCards(parsedCards);
          if (parsedAccounts.length > 0) setAccounts(parsedAccounts);
          if (parsedLoans.length > 0) setLoans(parsedLoans);
          if (cachedEnableLoans !== null) setEnableLoansState(JSON.parse(cachedEnableLoans));
          if (cachedIncludeLoans !== null) setIncludeLoansInTotalState(JSON.parse(cachedIncludeLoans));
          if (parsedTrash.length > 0) setDeletedItems(parsedTrash);
          if (cachedSync) setPendingSync(JSON.parse(cachedSync));
          setIsCacheHydrated(true);
        }
      } catch (e) {
        console.log('Cache read error:', e);
        if (isMounted) setIsCacheHydrated(true);
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
    newSync?: PendingSyncAction[],
    newA?: Account[],
    newL?: Loan[]
  ) => {
    const activeUid = uid || (await AsyncStorage.getItem(CACHE_KEYS.LAST_UID).catch(() => null));
    if (!activeUid) return;
    try {
      const promises: Promise<any>[] = [];
      if (newP !== undefined) promises.push(AsyncStorage.setItem(CACHE_KEYS.PEOPLE(activeUid), JSON.stringify(newP)));
      if (newT !== undefined) promises.push(AsyncStorage.setItem(CACHE_KEYS.TRANSACTIONS(activeUid), JSON.stringify(newT)));
      if (newC !== undefined) promises.push(AsyncStorage.setItem(CACHE_KEYS.CARDS(activeUid), JSON.stringify(newC)));
      if (newA !== undefined) promises.push(AsyncStorage.setItem(CACHE_KEYS.ACCOUNTS(activeUid), JSON.stringify(newA)));
      if (newL !== undefined) promises.push(AsyncStorage.setItem(CACHE_KEYS.LOANS(activeUid), JSON.stringify(newL)));
      if (newTrash !== undefined) promises.push(AsyncStorage.setItem(CACHE_KEYS.TRASH(activeUid), JSON.stringify(newTrash)));
      if (newSync !== undefined) promises.push(AsyncStorage.setItem(CACHE_KEYS.PENDING_SYNC(activeUid), JSON.stringify(newSync)));
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
        else if (item.type === 'SAVE_ACCOUNT') await FB.saveAccount(uid, item.payload);
        else if (item.type === 'DELETE_ACCOUNT') await FB.deleteAccount(uid, item.payload);
        else if (item.type === 'SAVE_LOAN') await FB.saveLoan(uid, item.payload);
        else if (item.type === 'DELETE_LOAN') await FB.deleteLoan(uid, item.payload);
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
    if (isReloadingRef.current) return;
    isReloadingRef.current = true;
    try {
      setIsSyncing(true);
      // First flush pending changes
      if (pendingSync.length > 0) {
        await flushPendingSync(pendingSync);
      }

      const [p, t, c, a, l, trash] = await Promise.all([
        FB.getPeople(uid),
        FB.getTransactions(uid),
        FB.getCards(uid),
        FB.getAccounts(uid).catch(() => []),
        FB.getLoans(uid).catch(() => []),
        FB.getDeletedItems(uid).catch(() => []),
      ]);

      // Merge remote trash with local trash
      const allTrashMap = new Map<string, DeletedItem>();
      for (const item of deletedItems) allTrashMap.set(item.id, item);
      for (const item of trash) allTrashMap.set(item.id, item);
      const mergedTrash = Array.from(allTrashMap.values()).sort((a, b) => b.deletedAt - a.deletedAt);

      // Clean up transactions: must belong to active people and not be in trash
      const activePersonIds = new Set(p.map(person => person.id));
      const deletedTxIds = new Set(
        mergedTrash
          .filter(d => d.type === 'TRANSACTION')
          .map(d => d.data?.id || d.id)
      );
      for (const d of mergedTrash) {
        if (d.type === 'PERSON' && d.associatedTxs) {
          for (const at of d.associatedTxs) {
            deletedTxIds.add(at.id);
          }
        }
      }

      const cleanTxs = t.filter(tx => activePersonIds.has(tx.personId) && !deletedTxIds.has(tx.id));

      // Smart diff before triggering React state updates to avoid unnecessary screen flickers
      setPeople(prev => (JSON.stringify(prev) !== JSON.stringify(p) ? p : prev));
      setTransactions(prev => (JSON.stringify(prev) !== JSON.stringify(cleanTxs) ? cleanTxs : prev));
      setCards(prev => (JSON.stringify(prev) !== JSON.stringify(c) ? c : prev));
      setAccounts(prev => (JSON.stringify(prev) !== JSON.stringify(a) ? a : prev));
      setLoans(prev => (JSON.stringify(prev) !== JSON.stringify(l) ? l : prev));
      setDeletedItems(prev => (JSON.stringify(prev) !== JSON.stringify(mergedTrash) ? mergedTrash : prev));
      setIsOnline(true);
      setIsCacheHydrated(true);
      await persistState(p, cleanTxs, c, mergedTrash, undefined, a, l);
    } catch (e) {
      console.log('Firebase fetch failed, running in offline mode:', e);
      setIsOnline(false);
    } finally {
      setIsSyncing(false);
      isReloadingRef.current = false;
    }
  }, [uid, pendingSync, flushPendingSync, persistState, deletedItems]);

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

  // Financial Vault totals
  const totalCashAndAccounts = useMemo(() => {
    return accounts.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0);
  }, [accounts]);

  const totalCreditCardsDue = useMemo(() => {
    return cards.reduce((acc, curr) => acc + (Number(curr.currentBill) || 0), 0);
  }, [cards]);

  const totalLoansRemaining = useMemo(() => {
    return loans.reduce((acc, curr) => acc + (Number(curr.remainingAmount) || 0), 0);
  }, [loans]);

  // Overall Net Balance: (Lent - Borrowed) + Cash/Accounts - Credit Card Dues (- Loans if enabled)
  const netBalance = useMemo(() => {
    const loanDebt = (enableLoans && includeLoansInTotal) ? totalLoansRemaining : 0;
    return (globalBalance + totalCashAndAccounts) - (totalCreditCardsDue + loanDebt);
  }, [globalBalance, totalCashAndAccounts, totalCreditCardsDue, totalLoansRemaining, enableLoans, includeLoansInTotal]);

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

  // Optimistic Add Account
  const addAccount = useCallback(async (accountData: Omit<Account, 'id' | 'createdAt'>) => {
    if (!uid) throw new Error('Not authenticated');
    const newId = generateId();
    const initialLog: AccountLogEntry = {
      id: generateId(),
      accountId: newId,
      amount: accountData.balance,
      type: 'SET_BALANCE',
      previousBalance: 0,
      newBalance: accountData.balance,
      note: accountData.notes || 'Initial balance',
      date: Date.now(),
      createdAt: Date.now(),
    };
    const newAccount: Account = {
      ...accountData,
      id: newId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      history: [initialLog],
    };
    const nextAccounts = [newAccount, ...accounts];
    setAccounts(nextAccounts);
    persistState(undefined, undefined, undefined, undefined, undefined, nextAccounts);

    FB.saveAccount(uid, newAccount).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'SAVE_ACCOUNT', payload: newAccount, timestamp: Date.now() });
    });

    return newAccount;
  }, [uid, accounts, persistState, queueSyncAction]);

  // Optimistic Update Account
  const updateAccount = useCallback(async (account: Account) => {
    if (!uid) throw new Error('Not authenticated');
    const updated = { ...account, updatedAt: Date.now() };
    const nextAccounts = accounts.map(a => a.id === updated.id ? updated : a);
    setAccounts(nextAccounts);
    persistState(undefined, undefined, undefined, undefined, undefined, nextAccounts);

    FB.saveAccount(uid, updated).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'SAVE_ACCOUNT', payload: updated, timestamp: Date.now() });
    });
  }, [uid, accounts, persistState, queueSyncAction]);

  // Optimistic Add Account Log (Money in / out / balance update)
  const addAccountLog = useCallback(async (accountId: string, logData: {
    amount: number;
    type: AccountLogType;
    note?: string;
    date?: number;
  }) => {
    if (!uid) throw new Error('Not authenticated');
    const target = accounts.find(a => a.id === accountId);
    if (!target) return;

    const prevBalance = target.balance || 0;
    let newBalance = prevBalance;
    if (logData.type === 'ADD_MONEY') {
      newBalance = prevBalance + logData.amount;
    } else if (logData.type === 'WITHDRAW_MONEY') {
      newBalance = prevBalance - logData.amount;
    } else if (logData.type === 'SET_BALANCE') {
      newBalance = logData.amount;
    }

    const logEntry: AccountLogEntry = {
      id: generateId(),
      accountId,
      amount: logData.amount,
      type: logData.type,
      previousBalance: prevBalance,
      newBalance,
      note: logData.note || '',
      date: logData.date || Date.now(),
      createdAt: Date.now(),
    };

    const existingHistory = target.history || [];
    const updatedAccount: Account = {
      ...target,
      balance: newBalance,
      updatedAt: Date.now(),
      history: [logEntry, ...existingHistory],
    };

    const nextAccounts = accounts.map(a => a.id === accountId ? updatedAccount : a);
    setAccounts(nextAccounts);
    persistState(undefined, undefined, undefined, undefined, undefined, nextAccounts);

    FB.saveAccount(uid, updatedAccount).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'SAVE_ACCOUNT', payload: updatedAccount, timestamp: Date.now() });
    });
  }, [uid, accounts, persistState, queueSyncAction]);

  // Optimistic Delete Account Log
  const deleteAccountLog = useCallback(async (accountId: string, logId: string) => {
    if (!uid) throw new Error('Not authenticated');
    const target = accounts.find(a => a.id === accountId);
    if (!target || !target.history) return;

    const nextHistory = target.history.filter(h => h.id !== logId);
    const newBalance = nextHistory.length > 0 ? nextHistory[0].newBalance : 0;

    const updatedAccount: Account = {
      ...target,
      balance: newBalance,
      updatedAt: Date.now(),
      history: nextHistory,
    };

    const nextAccounts = accounts.map(a => a.id === accountId ? updatedAccount : a);
    setAccounts(nextAccounts);
    persistState(undefined, undefined, undefined, undefined, undefined, nextAccounts);

    FB.saveAccount(uid, updatedAccount).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'SAVE_ACCOUNT', payload: updatedAccount, timestamp: Date.now() });
    });
  }, [uid, accounts, persistState, queueSyncAction]);

  // Optimistic Remove Account -> move to Trash
  const removeAccount = useCallback(async (id: string) => {
    if (!uid) throw new Error('Not authenticated');
    const target = accounts.find(a => a.id === id);
    if (!target) return;

    const nextAccounts = accounts.filter(a => a.id !== id);
    const trashEntry: DeletedItem = {
      id: generateId(),
      type: 'ACCOUNT',
      title: target.name,
      subtitle: `${target.type} • ₹${target.balance.toLocaleString('en-IN')}`,
      amount: target.balance,
      deletedAt: Date.now(),
      data: target,
    };
    const nextTrash = [trashEntry, ...deletedItems];

    setAccounts(nextAccounts);
    setDeletedItems(nextTrash);
    persistState(undefined, undefined, undefined, nextTrash, undefined, nextAccounts);

    FB.deleteAccount(uid, id).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'DELETE_ACCOUNT', payload: id, timestamp: Date.now() });
    });
    FB.saveDeletedItem(uid, trashEntry).catch(() => {});
  }, [uid, accounts, deletedItems, persistState, queueSyncAction]);

  // Optimistic Add Loan
  const addLoan = useCallback(async (loanData: Omit<Loan, 'id' | 'createdAt'>) => {
    if (!uid) throw new Error('Not authenticated');
    const newLoan: Loan = {
      ...loanData,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const nextLoans = [newLoan, ...loans];
    setLoans(nextLoans);
    persistState(undefined, undefined, undefined, undefined, undefined, undefined, nextLoans);

    FB.saveLoan(uid, newLoan).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'SAVE_LOAN', payload: newLoan, timestamp: Date.now() });
    });

    return newLoan;
  }, [uid, loans, persistState, queueSyncAction]);

  // Optimistic Update Loan
  const updateLoan = useCallback(async (loan: Loan) => {
    if (!uid) throw new Error('Not authenticated');
    const updated = { ...loan, updatedAt: Date.now() };
    const nextLoans = loans.map(l => l.id === updated.id ? updated : l);
    setLoans(nextLoans);
    persistState(undefined, undefined, undefined, undefined, undefined, undefined, nextLoans);

    FB.saveLoan(uid, updated).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'SAVE_LOAN', payload: updated, timestamp: Date.now() });
    });
  }, [uid, loans, persistState, queueSyncAction]);

  // Optimistic Remove Loan -> move to Trash
  const removeLoan = useCallback(async (id: string) => {
    if (!uid) throw new Error('Not authenticated');
    const target = loans.find(l => l.id === id);
    if (!target) return;

    const nextLoans = loans.filter(l => l.id !== id);
    const trashEntry: DeletedItem = {
      id: generateId(),
      type: 'LOAN',
      title: target.name,
      subtitle: `${target.type} • Remaining ₹${target.remainingAmount.toLocaleString('en-IN')}`,
      amount: target.remainingAmount,
      deletedAt: Date.now(),
      data: target,
    };
    const nextTrash = [trashEntry, ...deletedItems];

    setLoans(nextLoans);
    setDeletedItems(nextTrash);
    persistState(undefined, undefined, undefined, nextTrash, undefined, undefined, nextLoans);

    FB.deleteLoan(uid, id).catch(() => {
      setIsOnline(false);
      queueSyncAction({ id: generateId(), type: 'DELETE_LOAN', payload: id, timestamp: Date.now() });
    });
    FB.saveDeletedItem(uid, trashEntry).catch(() => {});
  }, [uid, loans, deletedItems, persistState, queueSyncAction]);

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
    let nextAccounts = [...accounts];
    let nextLoans = [...loans];

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
      } else if (item.type === 'ACCOUNT') {
        const restoredAccount: Account = item.data;
        nextAccounts = [restoredAccount, ...nextAccounts.filter(a => a.id !== restoredAccount.id)];

        FB.saveAccount(uid, restoredAccount).catch(() => {});
      } else if (item.type === 'LOAN') {
        const restoredLoan: Loan = item.data;
        nextLoans = [restoredLoan, ...nextLoans.filter(l => l.id !== restoredLoan.id)];

        FB.saveLoan(uid, restoredLoan).catch(() => {});
      }

      FB.permanentlyDeleteTrashItem(uid, item.id).catch(() => {});
    }

    setPeople(nextPeople);
    setTransactions(nextTxs);
    setCards(nextCards);
    setAccounts(nextAccounts);
    setLoans(nextLoans);
    persistState(nextPeople, nextTxs, nextCards, nextTrash, undefined, nextAccounts, nextLoans);
  }, [uid, deletedItems, people, transactions, cards, accounts, loans, persistState]);

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

  const setEnableLoans = useCallback(async (val: boolean) => {
    setEnableLoansState(val);
    const activeUid = uid || (await AsyncStorage.getItem(CACHE_KEYS.LAST_UID).catch(() => null));
    if (activeUid) {
      AsyncStorage.setItem(CACHE_KEYS.ENABLE_LOANS(activeUid), JSON.stringify(val)).catch(() => {});
    }
  }, [uid]);

  const setIncludeLoansInTotal = useCallback(async (val: boolean) => {
    setIncludeLoansInTotalState(val);
    const activeUid = uid || (await AsyncStorage.getItem(CACHE_KEYS.LAST_UID).catch(() => null));
    if (activeUid) {
      AsyncStorage.setItem(CACHE_KEYS.INCLUDE_LOANS_IN_TOTAL(activeUid), JSON.stringify(val)).catch(() => {});
    }
  }, [uid]);

  const value = useMemo(() => ({
    people, transactions, cards, accounts, loans, deletedItems, isLoading, isCacheHydrated,
    isOnline, isSyncing, pendingSyncCount: pendingSync.length, reload,
    addPerson, updatePerson, removePerson,
    getPersonTransactions, getPersonBalance,
    addTransaction, updateTransaction, removeTransaction, getTransactionHistory,
    addCard, updateCard, removeCard,
    addAccount, updateAccount, removeAccount, addAccountLog, deleteAccountLog,
    addLoan, updateLoan, removeLoan,
    restoreDeletedItem, permanentlyDeleteTrashItem, emptyTrash,
    globalBalance, netBalance, totalLent, totalBorrowed,
    totalCashAndAccounts, totalCreditCardsDue, totalLoansRemaining,
    enableLoans, setEnableLoans, includeLoansInTotal, setIncludeLoansInTotal,
  }), [people, transactions, cards, accounts, loans, deletedItems, isLoading, isCacheHydrated,
    isOnline, isSyncing, pendingSync.length, reload,
    addPerson, updatePerson, removePerson,
    getPersonTransactions, getPersonBalance,
    addTransaction, updateTransaction, removeTransaction, getTransactionHistory,
    addCard, updateCard, removeCard,
    addAccount, updateAccount, removeAccount, addAccountLog, deleteAccountLog,
    addLoan, updateLoan, removeLoan,
    restoreDeletedItem, permanentlyDeleteTrashItem, emptyTrash,
    globalBalance, netBalance, totalLent, totalBorrowed,
    totalCashAndAccounts, totalCreditCardsDue, totalLoansRemaining,
    enableLoans, setEnableLoans, includeLoansInTotal, setIncludeLoansInTotal]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

