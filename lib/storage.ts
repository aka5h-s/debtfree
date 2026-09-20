import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Person, Transaction, TransactionHistory, CreditCard } from './types';

const KEYS = {
  PEOPLE: '@debtfree_people',
  TRANSACTIONS: '@debtfree_transactions',
  TRANSACTION_HISTORY: '@debtfree_tx_history',
  CARDS: '@debtfree_cards',
};

async function getArray<T>(key: string): Promise<T[]> {
  try {
    const json = await AsyncStorage.getItem(key);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

async function setArray<T>(key: string, data: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

export async function getPeople(): Promise<Person[]> {
  return getArray<Person>(KEYS.PEOPLE);
}

export async function savePerson(person: Person): Promise<void> {
  const people = await getPeople();
  const idx = people.findIndex(p => p.id === person.id);
  if (idx >= 0) {
    people[idx] = person;
  } else {
    people.push(person);
  }
  await setArray(KEYS.PEOPLE, people);
}

export async function deletePerson(id: string): Promise<void> {
  const people = await getPeople();
  await setArray(KEYS.PEOPLE, people.filter(p => p.id !== id));
  const txs = await getTransactions();
  const toDelete = txs.filter(t => t.personId === id).map(t => t.id);
  await setArray(KEYS.TRANSACTIONS, txs.filter(t => t.personId !== id));
  const history = await getTransactionHistory();
  await setArray(KEYS.TRANSACTION_HISTORY, history.filter(h => !toDelete.includes(h.transactionId)));
}

export async function getTransactions(): Promise<Transaction[]> {
  return getArray<Transaction>(KEYS.TRANSACTIONS);
}

export async function getTransactionsForPerson(personId: string): Promise<Transaction[]> {
  const txs = await getTransactions();
  return txs.filter(t => t.personId === personId).sort((a, b) => b.date - a.date);
}

export async function saveTransaction(tx: Transaction): Promise<void> {
  const txs = await getTransactions();
  const idx = txs.findIndex(t => t.id === tx.id);
  if (idx >= 0) {
    txs[idx] = tx;
  } else {
    txs.push(tx);
  }
  await setArray(KEYS.TRANSACTIONS, txs);
}

export async function deleteTransaction(id: string): Promise<void> {
  const txs = await getTransactions();
  await setArray(KEYS.TRANSACTIONS, txs.filter(t => t.id !== id));
  const history = await getTransactionHistory();
  await setArray(KEYS.TRANSACTION_HISTORY, history.filter(h => h.transactionId !== id));
}

export async function getTransactionHistory(): Promise<TransactionHistory[]> {
  return getArray<TransactionHistory>(KEYS.TRANSACTION_HISTORY);
}

export async function getHistoryForTransaction(txId: string): Promise<TransactionHistory[]> {
  const history = await getTransactionHistory();
  return history.filter(h => h.transactionId === txId).sort((a, b) => a.changedAt - b.changedAt);
}

export async function addTransactionHistory(entry: TransactionHistory): Promise<void> {
  const history = await getTransactionHistory();
  history.push(entry);
  await setArray(KEYS.TRANSACTION_HISTORY, history);
}

export async function getCards(): Promise<CreditCard[]> {
  return getArray<CreditCard>(KEYS.CARDS);
}

export async function saveCard(card: CreditCard): Promise<void> {
  const cards = await getCards();
  const idx = cards.findIndex(c => c.id === card.id);
  if (idx >= 0) {
    cards[idx] = card;
  } else {
    cards.push(card);
  }
  await setArray(KEYS.CARDS, cards);
}

export async function deleteCard(id: string): Promise<void> {
  const cards = await getCards();
  await setArray(KEYS.CARDS, cards.filter(c => c.id !== id));
}

export function calculatePersonBalance(transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => {
    return sum + (tx.direction === 'YOU_LENT' ? tx.amount : -tx.amount);
  }, 0);
}
