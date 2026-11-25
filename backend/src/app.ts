import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { db } from './db.js';

const app = express();
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const secret = process.env.JWT_SECRET ?? 'local-dev-secret-change-me';
app.use(cors());
app.use(express.json());

type TxType = 'income' | 'expense';
type TxInput = { type: TxType; amountCents: number; category: string; description?: string; date: string };
const txSchema = {
  type: 'object', additionalProperties: false,
  required: ['type', 'amountCents', 'category', 'date'],
  properties: {
    type: { enum: ['income', 'expense'] },
    amountCents: { type: 'integer', minimum: 1 },
    category: { type: 'string', minLength: 1, maxLength: 60 },
    description: { type: 'string', maxLength: 250 },
    date: { type: 'string', format: 'date' }
  }
} as const;
const validateTx = ajv.compile(txSchema);
const validateLogin = ajv.compile({ type: 'object', required: ['email', 'password'], additionalProperties: false, properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 1 } } });
const toTx = (r: any) => ({ id: r.id, type: r.type, amountCents: r.amount_cents, category: r.category, description: r.description, date: r.date, createdAt: r.created_at });

function auth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try { jwt.verify(token, secret); next(); }
  catch { return res.status(401).json({ error: 'Token inválido o expirado' }); }
}
function txId(req: Request, res: Response, next: NextFunction) {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'Id inválido' });
  next();
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.post('/api/v1/auth/login', (req, res) => {
  if (!validateLogin(req.body)) return res.status(422).json({ error: 'Datos inválidos', details: validateLogin.errors });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(req.body.email) as { id: number; email: string; password_hash: string } | undefined;
  if (!user || !bcrypt.compareSync(req.body.password, user.password_hash)) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  const token = jwt.sign({ sub: user.id, email: user.email }, secret, { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, email: user.email } });
});
app.get('/api/v1/auth/me', auth, (req, res) => {
  const token = req.headers.authorization!.replace(/^Bearer\s+/i, '');
  const user = jwt.verify(token, secret);
  res.json({ user });
});
app.get('/api/v1/transactions', auth, (req, res) => {
  const { type, from, to } = req.query;
  if (type && type !== 'income' && type !== 'expense') return res.status(422).json({ error: 'type debe ser income o expense' });
  let sql = 'SELECT * FROM transactions WHERE 1=1';
  const params: unknown[] = [];
  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (from) { sql += ' AND date >= ?'; params.push(from); }
  if (to) { sql += ' AND date <= ?'; params.push(to); }
  sql += ' ORDER BY date DESC, id DESC';
  res.json({ data: (db.prepare(sql).all(...params) as any[]).map(toTx) });
});
app.post('/api/v1/transactions', auth, (req, res) => {
  if (!validateTx(req.body)) return res.status(422).json({ error: 'Datos inválidos', details: validateTx.errors });
  const input = req.body as TxInput;
  const result = db.prepare('INSERT INTO transactions(type, amount_cents, category, description, date) VALUES(?,?,?,?,?)').run(input.type, input.amountCents, input.category.trim(), input.description?.trim() ?? '', input.date);
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ data: toTx(row) });
});
app.get('/api/v1/transactions/:id', auth, txId, (req, res) => {
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Movimiento no encontrado' });
  res.json({ data: toTx(row) });
});
app.patch('/api/v1/transactions/:id', auth, txId, (req, res) => {
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Movimiento no encontrado' });
  const merged = { ...toTx(existing), ...req.body };
  delete (merged as any).id; delete (merged as any).createdAt;
  if (!validateTx(merged)) return res.status(422).json({ error: 'Datos inválidos', details: validateTx.errors });
  const input = merged as TxInput;
  db.prepare('UPDATE transactions SET type=?, amount_cents=?, category=?, description=?, date=? WHERE id=?').run(input.type, input.amountCents, input.category.trim(), input.description?.trim() ?? '', input.date, req.params.id);
  res.json({ data: toTx(db.prepare('SELECT * FROM transactions WHERE id=?').get(req.params.id)) });
});
app.delete('/api/v1/transactions/:id', auth, txId, (req, res) => {
  const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Movimiento no encontrado' });
  res.status(204).end();
});
app.get('/api/v1/dashboard/summary', auth, (_req, res) => {
  const totals = db.prepare(`SELECT type, COALESCE(SUM(amount_cents),0) total FROM transactions GROUP BY type`).all() as { type: TxType; total: number }[];
  const income = totals.find(x => x.type === 'income')?.total ?? 0;
  const expense = totals.find(x => x.type === 'expense')?.total ?? 0;
  const byMonth = db.prepare(`SELECT substr(date,1,7) month, type, SUM(amount_cents) amountCents FROM transactions GROUP BY month,type ORDER BY month`).all();
  const byCategory = db.prepare(`SELECT category, SUM(amount_cents) amountCents FROM transactions WHERE type='expense' GROUP BY category ORDER BY amountCents DESC`).all();
  res.json({ data: { incomeCents: income, expenseCents: expense, balanceCents: income - expense, byMonth, expensesByCategory: byCategory } });
});

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
export default app;

