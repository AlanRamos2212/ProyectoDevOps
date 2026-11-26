import { Request, Response } from 'express';
import { db } from '../database/db.js';
import { TransactionInput, validateTransaction } from '../validators/transaction.validator.js';

const toTransaction = (row: any) => ({
  id: row.id,
  type: row.type,
  amountCents: row.amount_cents,
  category: row.category,
  description: row.description,
  date: row.date,
  createdAt: row.created_at
});

export function listTransactions(req: Request, res: Response) {
  const { type, from, to } = req.query;
  if (type && type !== 'income' && type !== 'expense') return res.status(422).json({ error: 'type debe ser income o expense' });
  let sql = 'SELECT * FROM transactions WHERE 1=1';
  const params: unknown[] = [];
  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (from) { sql += ' AND date >= ?'; params.push(from); }
  if (to) { sql += ' AND date <= ?'; params.push(to); }
  sql += ' ORDER BY date DESC, id DESC';
  return res.json({ data: (db.prepare(sql).all(...params) as any[]).map(toTransaction) });
}

export function createTransaction(req: Request, res: Response) {
  if (!validateTransaction(req.body)) return res.status(422).json({ error: 'Datos inválidos', details: validateTransaction.errors });
  const input = req.body as TransactionInput;
  const result = db.prepare('INSERT INTO transactions(type, amount_cents, category, description, date) VALUES(?,?,?,?,?)')
    .run(input.type, input.amountCents, input.category.trim(), input.description?.trim() ?? '', input.date);
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json({ data: toTransaction(row) });
}

export function getTransaction(req: Request, res: Response) {
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Movimiento no encontrado' });
  return res.json({ data: toTransaction(row) });
}

export function updateTransaction(req: Request, res: Response) {
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Movimiento no encontrado' });
  const merged = { ...toTransaction(existing), ...req.body };
  delete (merged as any).id;
  delete (merged as any).createdAt;
  if (!validateTransaction(merged)) return res.status(422).json({ error: 'Datos inválidos', details: validateTransaction.errors });
  const input = merged as TransactionInput;
  db.prepare('UPDATE transactions SET type=?, amount_cents=?, category=?, description=?, date=? WHERE id=?')
    .run(input.type, input.amountCents, input.category.trim(), input.description?.trim() ?? '', input.date, req.params.id);
  return res.json({ data: toTransaction(db.prepare('SELECT * FROM transactions WHERE id=?').get(req.params.id)) });
}

export function deleteTransaction(req: Request, res: Response) {
  const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Movimiento no encontrado' });
  return res.status(204).end();
}
