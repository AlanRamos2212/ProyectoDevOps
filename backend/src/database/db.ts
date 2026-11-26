import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

const file = process.env.DATABASE_PATH ?? './data/finance.db';
if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
export const db = new Database(file);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('income','expense')),
    amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
    category TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);
const email = process.env.DEMO_EMAIL ?? 'demo@finanzas.local';
const password = process.env.DEMO_PASSWORD ?? 'Demo123!';
if (!db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
  db.prepare('INSERT INTO users(email, password_hash) VALUES (?, ?)').run(email, bcrypt.hashSync(password, 10));
}
