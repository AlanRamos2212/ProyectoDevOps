import { expect, Page, test } from '@playwright/test';

type Transaction = {
  id: number;
  type: 'income' | 'expense';
  amountCents: number;
  category: string;
  description: string;
  date: string;
};

async function signInWithTransactions(page: Page, initial: Transaction[] = []) {
  let rows = [...initial];
  let nextId = Math.max(0, ...rows.map(row => row.id)) + 1;
  const requests: { method: string; body?: any }[] = [];

  await page.route('**/api/v1/auth/login', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ token: 'playwright-test-token', user: { id: 1, email: 'demo@finanzas.local' } })
  }));
  await page.route('**/api/v1/transactions**', async route => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = req.postDataJSON();
      requests.push({ method: 'POST', body });
      const created = { id: nextId++, ...body } as Transaction;
      rows = [created, ...rows];
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ data: created }) });
    }
    if (req.method() === 'DELETE') {
      const id = Number(new URL(req.url()).pathname.split('/').pop());
      requests.push({ method: 'DELETE' });
      rows = rows.filter(row => row.id !== id);
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: rows }) });
  });
  await page.route('**/api/v1/dashboard/summary', route => {
    const incomeCents = rows.filter(row => row.type === 'income').reduce((sum, row) => sum + row.amountCents, 0);
    const expenseCents = rows.filter(row => row.type === 'expense').reduce((sum, row) => sum + row.amountCents, 0);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents, byMonth: [], expensesByCategory: [] } })
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByText('¡Hola!')).toBeVisible();
  return requests;
}

test('creates an expense and updates the activity list', async ({ page }) => {
  const requests = await signInWithTransactions(page);
  await page.getByRole('button', { name: 'Nuevo movimiento' }).click();
  await page.getByLabel('Monto (MXN)').fill('123.45');
  await page.getByLabel('Descripción').fill('Compra de prueba');
  await page.getByRole('button', { name: 'Guardar movimiento' }).click();

  await expect(page.getByText('Compra de prueba')).toBeVisible();
  expect(requests.find(request => request.method === 'POST')?.body.amountCents).toBe(12345);
});

test('creates an income with the selected type', async ({ page }) => {
  const requests = await signInWithTransactions(page);
  await page.getByRole('button', { name: 'Nuevo movimiento' }).click();
  await page.getByLabel('Tipo').selectOption('income');
  await page.getByLabel('Monto (MXN)').fill('2500');
  await page.getByLabel('Categoría').selectOption({ label: 'Sueldo' });
  await page.getByLabel('Descripción').fill('Nómina');
  await page.getByRole('button', { name: 'Guardar movimiento' }).click();

  await expect(page.getByText('Nómina')).toBeVisible();
  expect(requests.find(request => request.method === 'POST')?.body.type).toBe('income');
});

test('filters the activity list by transaction type', async ({ page }) => {
  await signInWithTransactions(page, [
    { id: 1, type: 'income', amountCents: 10000, category: 'Sueldo', description: 'Ingreso visible', date: '2026-11-01' },
    { id: 2, type: 'expense', amountCents: 2500, category: 'Transporte', description: 'Gasto oculto', date: '2026-11-02' }
  ]);
  const filter = page.locator('.filters select');
  await filter.selectOption('income');
  await expect(page.getByText('Ingreso visible')).toBeVisible();
  await expect(page.getByText('Gasto oculto')).toHaveCount(0);
  await filter.selectOption('expense');
  await expect(page.getByText('Gasto oculto')).toBeVisible();
  await expect(page.getByText('Ingreso visible')).toHaveCount(0);
});

test('deletes a transaction from the activity list', async ({ page }) => {
  const requests = await signInWithTransactions(page, [
    { id: 9, type: 'expense', amountCents: 750, category: 'Otros', description: 'Eliminarme', date: '2026-11-03' }
  ]);
  const row = page.locator('tr').filter({ hasText: 'Eliminarme' });
  await row.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByText('Eliminarme')).toHaveCount(0);
  expect(requests.some(request => request.method === 'DELETE')).toBeTruthy();
});
