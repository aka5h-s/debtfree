import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import type { Person, Transaction, TransactionHistory, CreditCard } from '@/lib/types';
import * as Storage from '@/lib/storage';
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
  const [people, setPeople] = useState<Person[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const [p, t, c] = await Promise.all([
      Storage.getPeople(),
      Storage.getTransactions(),
      Storage.getCards(),
    ]);
    setPeople(p);
    setTransactions(t);
    setCards(c);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const getPersonTransactions = useCallback((personId: string) => {
    return transactions.filter(t => t.personId === personId).sort((a, b) => b.date - a.date);
  }, [transactions]);

  const getPersonBalance = useCallback((personId: string) => {
    const txs = transactions.filter(t => t.personId === personId);
    return Storage.calculatePersonBalance(txs);
  }, [transactions]);

  const { globalBalance, totalLent, totalBorrowed } = useMemo(() => {
    const balanceMap = new Map<string, number>();
    for (const p of people) {
      const txs = transactions.filter(t => t.personId === p.id);
      balanceMap.set(p.id, Storage.calculatePersonBalance(txs));
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
    const person: Person = { id: generateId(), name, phone, notes, createdAt: Date.now() };
    await Storage.savePerson(person);
    setPeople(prev => [...prev, person]);
    return person;
  }, []);

  const updatePerson = useCallback(async (person: Person) => {
    await Storage.savePerson(person);
    setPeople(prev => prev.map(p => p.id === person.id ? person : p));
  }, []);

  const removePerson = useCallback(async (id: string) => {
    await Storage.deletePerson(id);
    setPeople(prev => prev.filter(p => p.id !== id));
    setTransactions(prev => prev.filter(t => t.personId !== id));
  }, []);

  const addTransaction = useCallback(async (personId: string, amount: number, direction: 'YOU_LENT' | 'YOU_BORROWED', note: string) => {
    const tx: Transaction = { id: generateId(), personId, amount, direction, date: Date.now(), note, createdAt: Date.now() };
    await Storage.saveTransaction(tx);
    setTransactions(prev => [...prev, tx]);
    return tx;
  }, []);

  const updateTransaction = useCallback(async (tx: Transaction, newAmount: number, newDirection: 'YOU_LENT' | 'YOU_BORROWED', newNote: string) => {
    const historyEntry: TransactionHistory = {
      id: generateId(),
      transactionId: tx.id,
      previousAmount: tx.amount,
      previousDirection: tx.direction,
      previousNote: tx.note,
      changedAt: Date.now(),
    };
    await Storage.addTransactionHistory(historyEntry);
    const updated = { ...tx, amount: newAmount, direction: newDirection, note: newNote };
    await Storage.saveTransaction(updated);
    setTransactions(prev => prev.map(t => t.id === tx.id ? updated : t));
  }, []);

  const removeTransaction = useCallback(async (id: string) => {
    await Storage.deleteTransaction(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const getTransactionHistory = useCallback(async (txId: string) => {
    return Storage.getHistoryForTransaction(txId);
  }, []);

  const addCard = useCallback(async (data: Omit<CreditCard, 'id' | 'createdAt'>) => {
    const card: CreditCard = { ...data, id: generateId(), createdAt: Date.now() };
    await Storage.saveCard(card);
    setCards(prev => [...prev, card]);
    return card;
  }, []);

  const updateCard = useCallback(async (card: CreditCard) => {
    await Storage.saveCard(card);
    setCards(prev => prev.map(c => c.id === card.id ? card : c));
  }, []);

  const removeCard = useCallback(async (id: string) => {
    await Storage.deleteCard(id);
    setCards(prev => prev.filter(c => c.id !== id));
  }, []);

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
