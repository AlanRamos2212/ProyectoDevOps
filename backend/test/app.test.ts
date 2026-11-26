import request from 'supertest';
process.env.DATABASE_PATH = ':memory:';
import app from '../src/app';

const validTransaction = {
  type: 'expense', amountCents: 100, category: 'Comida',
  description: 'Prueba de validación', date: '2026-11-02'
};

const invalidTransactionCases = [
  ...Array.from({ length: 120 }, (_, i) => ({
    caseName: `category length ${61 + i}`,
    payload: { ...validTransaction, category: 'c'.repeat(61 + i) }
  })),
  ...Array.from({ length: 120 }, (_, i) => ({
    caseName: `description length ${251 + i}`,
    payload: { ...validTransaction, description: 'd'.repeat(251 + i) }
  })),
  ...Array.from({ length: 100 }, (_, i) => ({
    caseName: `invalid calendar date 2026-13-${String(i + 1).padStart(2, '0')}`,
    payload: { ...validTransaction, date: `2026-13-${String(i + 1).padStart(2, '0')}` }
  })),
  ...Array.from({ length: 100 }, (_, i) => ({
    caseName: `amount sent as string ${i}`,
    payload: { ...validTransaction, amountCents: String(i) }
  })),
  ...Array.from({ length: 60 }, (_, i) => ({
    caseName: `unsupported transaction type ${i}`,
    payload: { ...validTransaction, type: `transfer-${i}` }
  })),
  ...Array.from({ length: 66 }, (_, i) => ({
    caseName: `unknown request field extra_${i}`,
    payload: { ...validTransaction, [`extra_${i}`]: true }
  }))
];

describe('Finance API', () => {
  let token = '';
  it('requires login before exposing transactions', async () => {
    const response = await request(app).get('/api/v1/transactions');
    expect(response.status).toBe(401);
  });
  it('logs in with the demo account', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({ email: 'demo@finanzas.local', password: 'Demo123!' });
    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
    token = response.body.token;
  });
  it.each(invalidTransactionCases)(
    'rejects invalid transaction: $caseName',
    async ({ payload }) => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Datos inválidos');
    }
  );
  it('creates and lists a valid income transaction', async () => {
    const created = await request(app).post('/api/v1/transactions').set('Authorization', `Bearer ${token}`).send({ type: 'income', amountCents: 120000, category: 'Sueldo', description: 'Pago mensual', date: '2026-11-01' });
    expect(created.status).toBe(201);
    const list = await request(app).get('/api/v1/transactions').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data[0].amountCents).toBe(120000);
  });
  it('rejects invalid amount and summarizes balance', async () => {
    const invalid = await request(app).post('/api/v1/transactions').set('Authorization', `Bearer ${token}`).send({ type: 'expense', amountCents: -4, category: 'Comida', date: '2026-11-02' });
    expect(invalid.status).toBe(422);
    const summary = await request(app).get('/api/v1/dashboard/summary').set('Authorization', `Bearer ${token}`);
    expect(summary.body.data.balanceCents).toBe(120000);
  });
});
