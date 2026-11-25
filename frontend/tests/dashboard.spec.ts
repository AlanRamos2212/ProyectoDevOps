import { test, expect } from '@playwright/test';
test('demo user can see the personal finance dashboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByText('¡Hola!')).toBeVisible();
  await expect(page.getByText('Balance total')).toBeVisible();
});
