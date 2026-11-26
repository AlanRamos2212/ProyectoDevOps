import { expect, test } from '@playwright/test';

type SummaryCase = {
  incomeCents: number;
  expenseCents: number;
};

// A data-driven currency/balance matrix: every row appears as an individual
// Playwright case in the HTML report.
const summaryCases: SummaryCase[] = Array.from({ length: 665 }, (_, index) => ({
  incomeCents: index * 1_000_003,
  expenseCents: index === 0 ? 0 : (index * 31_337) % (index * 1_000_003 + 250_000)
}));

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cents / 100);

test.describe('Dashboard balance data matrix', () => {
  for (const summary of summaryCases) {
    const expectedBalanceCents = summary.incomeCents - summary.expenseCents;
    test(
      `shows balance ${formatMoney(expectedBalanceCents)} from income ${formatMoney(summary.incomeCents)} minus expenses ${formatMoney(summary.expenseCents)}`,
      async ({ page }) => {
        const balanceCents = summary.incomeCents - summary.expenseCents;

        // El flujo de login se cubre en dashboard.spec.ts. Esta matriz valida
        // el balance y evita repetir 665 clics de autenticación innecesarios.
        await page.addInitScript(() => localStorage.setItem('token', 'playwright-test-token'));
        await page.route('**/api/v1/transactions**', route => route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] })
        }));
        await page.route('**/api/v1/dashboard/summary', route => route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              incomeCents: summary.incomeCents,
              expenseCents: summary.expenseCents,
              balanceCents,
              byMonth: [],
              expensesByCategory: []
            }
          })
        }));

        await page.goto('/');
        await expect(page.locator('.stat-card.balance strong')).toHaveText(formatMoney(balanceCents));
      }
    );
  }
});
