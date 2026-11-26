import { test, expect } from '@playwright/test';
test('signing in as the demo user shows the greeting and total balance card', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByText('¡Hola!')).toBeVisible();
  await expect(page.getByText('Balance total')).toBeVisible();
});
