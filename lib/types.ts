export interface Person {
  id: string;
  name: string;
  phone: string;
  notes: string;
  createdAt: number;
}

export type TransactionDirection = 'YOU_LENT' | 'YOU_BORROWED';

export interface Transaction {
  id: string;
  personId: string;
  amount: number;
  direction: TransactionDirection;
  date: number;
  note: string;
  createdAt: number;
}

export interface TransactionHistory {
  id: string;
  transactionId: string;
  previousAmount: number;
  previousDirection: TransactionDirection;
  previousNote: string;
  changedAt: number;
}

export type CardType = 'VISA' | 'MASTERCARD' | 'RUPAY';

export type CardColor = '#0D0D0D' | '#1A237E' | '#4A148C' | '#1B5E20' | '#E65100' | '#B71C1C';

export const CARD_COLORS: { name: string; value: CardColor }[] = [
  { name: 'Black', value: '#0D0D0D' },
  { name: 'Midnight Blue', value: '#1A237E' },
  { name: 'Purple', value: '#4A148C' },
  { name: 'Green', value: '#1B5E20' },
  { name: 'Orange', value: '#E65100' },
  { name: 'Dark Red', value: '#B71C1C' },
];

export interface CreditCard {
  id: string;
  cardName: string;
  cardNumber: string;
  cardType: CardType;
  nameOnCard: string;
  expiry: string;
  cvv: string;
  color: CardColor;
  createdAt: number;
}
