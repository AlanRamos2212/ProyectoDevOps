import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

// OpenTelemetry se carga como dependencia opcional en el contenedor de producción.
// Así el backend sigue funcionando localmente aunque no se haya configurado un exporter.
const otelApi = (() => {
  try {
    return require('@opentelemetry/api') as any;
  } catch {
    return undefined;
  }
})();

const file = process.env.DATABASE_PATH ?? './data/finance.db';
if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
const sqlite = new Database(file);

// better-sqlite3 es síncrono y no cuenta con instrumentación automática oficial.
// Envolvemos get/all/run para registrar spans sin incluir valores de parámetros.
export const db: Database.Database = new Proxy(sqlite, {
  get(target, property, receiver) {
    if (property === 'prepare') {
      return (sql: string) => {
        const statement = target.prepare(sql);
        return new Proxy(statement, {
          get(statementTarget, statementProperty, statementReceiver) {
            const value = Reflect.get(statementTarget, statementProperty, statementTarget);
            if (!['get', 'all', 'run'].includes(String(statementProperty)) || typeof value !== 'function' || !otelApi) {
              return typeof value === 'function' ? value.bind(statementTarget) : value;
            }

            return (...params: unknown[]) => {
              const tracer = otelApi.trace.getTracer('finance-backend.sqlite');
              return tracer.startActiveSpan('sqlite.query', {
                attributes: {
                  'db.system': 'sqlite',
                  'db.operation': String(statementProperty).toUpperCase(),
                  'db.query.summary': sql.replace(/\s+/g, ' ').trim().slice(0, 120),
                },
              }, (span: any) => {
                try {
                  return Reflect.apply(value, statementTarget, params);
                } catch (error) {
                  span.recordException(error as Error);
                  span.setStatus({ code: otelApi.SpanStatusCode.ERROR });
                  throw error;
                } finally {
                  span.end();
                }
              });
            };
          },
        });
      };
    }

    const value = Reflect.get(target, property, target);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});
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
