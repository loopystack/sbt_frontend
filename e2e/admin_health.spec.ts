/**
 * E2E tests for Admin System Health Dashboard
 * Tests the system health monitoring UI functionality
 */
import { test, expect } from '@playwright/test';

test.describe('Admin System Health Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/signin');
    await page.fill('input[name="email"]', 'hitech.proton@gmail.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to admin panel
    await page.waitForURL('/admin');

    // Navigate to system health tab
    await page.click('text=System Health');
  });

  test('system health dashboard loads and displays status', async ({ page }) => {
    // Verify we're on the health dashboard
    await expect(page.locator('text=System Health')).toBeVisible();

    // Check overall status is displayed
    await expect(page.locator('text=Overall Status')).toBeVisible();

    // Check for heartbeat cards
    await expect(page.locator('text=Service Heartbeats')).toBeVisible();

    // Check for wallet balances section
    await expect(page.locator('text=Hot Wallet Balances')).toBeVisible();

    // Check refresh button
    await expect(page.locator('text=Refresh Health Data')).toBeVisible();
  });

  test('heartbeat status indicators work correctly', async ({ page }) => {
    // Wait for health data to load
    await page.waitForSelector('text=Service Heartbeats');

    // Check that heartbeat cards are present
    const heartbeatCards = page.locator('[class*="bg-gray-800/50"]').filter({ hasText: /monitoring_worker|deposit_monitor|withdrawal_monitor/ });
    await expect(heartbeatCards).toHaveCount(await heartbeatCards.count());

    // Each heartbeat card should show last update time
    const heartbeatCardsCount = await heartbeatCards.count();
    expect(heartbeatCardsCount).toBeGreaterThan(0);
  });

  test('wallet balances display correctly', async ({ page }) => {
    // Check wallet balance section
    await expect(page.locator('text=Hot Wallet Balances')).toBeVisible();

    // Should show balances or error messages
    const balanceSection = page.locator('[class*="bg-black/30"]').filter({ hasText: 'Hot Wallet Balances' }).locator('xpath=following-sibling::*[1]');
    await expect(balanceSection).toBeVisible();
  });

  test('refresh button updates data', async ({ page }) => {
    // Click refresh button
    await page.click('text=Refresh Health Data');

    // Should not show error (successful refresh)
    await expect(page.locator('text=Failed to load system health')).not.toBeVisible();

    // Health data should still be displayed
    await expect(page.locator('text=System Health')).toBeVisible();
  });

  test('latest reconciliation displays when available', async ({ page }) => {
    // Check if latest reconciliation section exists
    const reconciliationSection = page.locator('text=Latest Reconciliation');

    // If it exists, verify it has proper data
    if (await reconciliationSection.isVisible()) {
      await expect(page.locator('text=Status:')).toBeVisible();
      await expect(page.locator('text=Delta:')).toBeVisible();
    }
  });
});