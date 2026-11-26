export type Transaction = {
  id: number;
  type: 'income' | 'expense';
  amountCents: number;
  category: string;
  description: string;
  date: string;
};

export type Summary = {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  byMonth: { month: string; type: string; amountCents: number }[];
};

export type TransactionDraft = {
  type: 'income' | 'expense';
  amountCents: number;
  category: string;
  description: string;
  date: string;
};
