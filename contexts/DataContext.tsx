import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import type { Person, Transaction, TransactionHistory, CreditCard } from '@/lib/types';
import * as FB from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { generateId } from '@/lib/formatters';

interface DataContextValue {
  people: Person[];
  transactions: Transaction[];
  cards: CreditCard[];
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);

  const uid = user?.uid;

  const reload = useCallback(async () => {
    if (!uid) {
      setPeople([]);
      setTransactions([]);
      setCards([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const [p, t, c] = await Promise.all([
      FB.getPeople(uid),
      FB.getTransactions(uid),
      FB.getCards(uid),
    ]);
    setPeople(p);
    setTransactions(t);
    setCards(c);
    setIsLoading(false);
  }, [uid]);

  useEffect(() => {
    reload();
  }, [reload]);

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

  const addPerson = useCallback(async (name: string, phone: string, notes: string) => {
    if (!uid) throw new Error('Not authenticated');
    const person: Person = { id: generateId(), name, phone, notes, createdAt: Date.now() };
    await FB.savePerson(uid, person);
    setPeople(prev => [person, ...prev]);
    return person;
  }, [uid]);

  const updatePerson = useCallback(async (person: Person) => {
    if (!uid) throw new Error('Not authenticated');
    await FB.savePerson(uid, person);
    setPeople(prev => prev.map(p => p.id === person.id ? person : p));
  }, [uid]);

  const removePerson = useCallback(async (id: string) => {
    if (!uid) throw new Error('Not authenticated');
    await FB.deletePerson(uid, id);
    setPeople(prev => prev.filter(p => p.id !== id));
    setTransactions(prev => prev.filter(t => t.personId !== id));
  }, [uid]);

  const addTransaction = useCallback(async (personId: string, amount: number, direction: 'YOU_LENT' | 'YOU_BORROWED', note: string) => {
    if (!uid) throw new Error('Not authenticated');
    const tx: Transaction = { id: generateId(), personId, amount, direction, date: Date.now(), note, createdAt: Date.now() };
    await FB.saveTransaction(uid, tx);
    setTransactions(prev => [tx, ...prev]);
    return tx;
  }, [uid]);

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
    await FB.addTransactionHistory(uid, historyEntry);
    const updated = { ...tx, amount: newAmount, direction: newDirection, note: newNote };
    await FB.saveTransaction(uid, updated);
    setTransactions(prev => prev.map(t => t.id === tx.id ? updated : t));
  }, [uid]);

  const removeTransaction = useCallback(async (id: string) => {
    if (!uid) throw new Error('Not authenticated');
    await FB.deleteTransaction(uid, id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, [uid]);

  const getTransactionHistory = useCallback(async (txId: string) => {
    if (!uid) return [];
    return FB.getHistoryForTransaction(uid, txId);
  }, [uid]);

  const addCard = useCallback(async (data: Omit<CreditCard, 'id' | 'createdAt'>) => {
    if (!uid) throw new Error('Not authenticated');
    const card: CreditCard = { ...data, id: generateId(), createdAt: Date.now() };
    await FB.saveCard(uid, card);
    setCards(prev => [card, ...prev]);
    return card;
  }, [uid]);

  const updateCard = useCallback(async (card: CreditCard) => {
    if (!uid) throw new Error('Not authenticated');
    await FB.saveCard(uid, card);
    setCards(prev => prev.map(c => c.id === card.id ? card : c));
  }, [uid]);

  const removeCard = useCallback(async (id: string) => {
    if (!uid) throw new Error('Not authenticated');
    await FB.deleteCard(uid, id);
    setCards(prev => prev.filter(c => c.id !== id));
  }, [uid]);

  const value = useMemo(() => ({
    people, transactions, cards, isLoading, reload,
    addPerson, updatePerson, removePerson,
    getPersonTransactions, getPersonBalance,
    addTransaction, updateTransaction, removeTransaction, getTransactionHistory,
    addCard, updateCard, removeCard,
    globalBalance, totalLent, totalBorrowed,
  }), [people, transactions, cards, isLoading, reload,
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
