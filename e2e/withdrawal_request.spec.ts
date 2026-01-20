import { test, expect } from '@playwright/test';

const VALID_TRC20_ADDRESS = process.env.E2E_TRC20_ADDRESS || 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';

async function acceptNextDialog(page: any) {
  page.once('dialog', async (dialog: any) => {
    await dialog.accept();
  });
}

async function login(page: any, email: string, password: string) {
  // Skip compliance modal
  await page.addInitScript(() => {
    localStorage.setItem('compliance_agreed', 'true');
  });

  await page.goto('/signin');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#password').press('Enter');
  await page.waitForURL('**/*', { timeout: 15_000 });
}

test.describe('Withdrawal Request System - End-to-End Tests', () => {
  test('User: initiate withdrawal -> history shows pending -> cancel -> history shows cancelled', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (!email || !password) {
      test.skip(true, 'E2E_USER_EMAIL / E2E_USER_PASSWORD not provided');
    }

    await login(page, email!, password!);

    await page.goto('/withdraw');
    await expect(page.getByRole('heading', { name: 'Withdraw Funds' })).toBeVisible();

    // Fill form using stable test ids
    await page.getByTestId('withdraw-amount').fill('20.00');
    await page.getByTestId('withdraw-address').fill(VALID_TRC20_ADDRESS);

    await page.getByTestId('withdraw-submit').click();

    // Should land on history and show at least one pending item
    await expect(page.getByRole('heading', { name: 'Withdrawal History' })).toBeVisible();
    await expect(page.getByText('pending', { exact: false })).toBeVisible();

    // Open details for first row (should show tx hash only after execution, but details should open)
    const detailsBtn = page.getByTestId(/withdrawal-details-/).first();
    await detailsBtn.click();
    await expect(page.getByText('Withdrawal Details', { exact: false })).toBeVisible();
    // Close modal
    await page.getByRole('button', { name: 'Close' }).click();

    // Cancel first pending withdrawal
    await acceptNextDialog(page);
    const cancelBtn = page.getByTestId(/withdrawal-cancel-/).first();
    await cancelBtn.click();

    // After cancel, should show cancelled status somewhere
    await expect(page.getByText('cancelled', { exact: false })).toBeVisible();
  });

  test('Admin: approve pending + reject pending', async ({ page }) => {
    const adminEmail = process.env.E2E_ADMIN_EMAIL;
    const adminPassword = process.env.E2E_ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      test.skip(true, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not provided');
    }

    await login(page, adminEmail!, adminPassword!);
    await page.goto('/admin');

    // Open Withdrawals tab
    await page.getByRole('button', { name: /Withdrawals/i }).click();
    await expect(page.getByText('Withdrawal Management')).toBeVisible();

    // Approve first pending if exists
    const approveBtn = page.getByTestId(/admin-withdrawal-approve-/).first();
    if (await approveBtn.count()) {
      await approveBtn.click();
      await expect(page.getByText(/approved/i)).toBeVisible();
    }

    // Reject next pending if exists
    const rejectBtn = page.getByTestId(/admin-withdrawal-reject-/).first();
    if (await rejectBtn.count()) {
      await rejectBtn.click();
      await page.getByTestId('admin-reject-reason').fill('Rejected by E2E test');
      await page.getByTestId('admin-reject-confirm').click();
      await expect(page.getByText(/rejected/i)).toBeVisible();
    }
  });
});

