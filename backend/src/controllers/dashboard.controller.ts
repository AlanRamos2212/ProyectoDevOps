import { Request, Response } from 'express';
import { db } from '../database/db.js';

type TransactionType = 'income' | 'expense';

export function getSummary(_req: Request, res: Response) {
  const totals = db.prepare('SELECT type, COALESCE(SUM(amount_cents),0) total FROM transactions GROUP BY type')
    .all() as { type: TransactionType; total: number }[];
  const income = totals.find(item => item.type === 'income')?.total ?? 0;
  const expense = totals.find(item => item.type === 'expense')?.total ?? 0;
  const byMonth = db.prepare('SELECT substr(date,1,7) month, type, SUM(amount_cents) amountCents FROM transactions GROUP BY month,type ORDER BY month').all();
  const byCategory = db.prepare("SELECT category, SUM(amount_cents) amountCents FROM transactions WHERE type='expense' GROUP BY category ORDER BY amountCents DESC").all();
  return res.json({ data: { incomeCents: income, expenseCents: expense, balanceCents: income - expense, byMonth, expensesByCategory: byCategory } });
}
