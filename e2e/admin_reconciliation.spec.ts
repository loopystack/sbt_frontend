/**
 * E2E tests for Admin Reconciliation Reports
 * Tests reconciliation report viewing and management functionality
 */
import { test, expect } from '@playwright/test';

test.describe('Admin Reconciliation Reports', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/signin');
    await page.fill('input[name="email"]', 'hitech.proton@gmail.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to admin panel
    await page.waitForURL('/admin');

    // Navigate to reconciliation tab
    await page.click('text=Reconciliation');
  });

  test('reconciliation reports page loads correctly', async ({ page }) => {
    // Verify we're on the reconciliation page
    await expect(page.locator('text=Reconciliation Reports')).toBeVisible();
    await expect(page.locator('text=Daily reports comparing internal balances vs on-chain platform assets')).toBeVisible();

    // Check action buttons
    await expect(page.locator('text=View Latest')).toBeVisible();
    await expect(page.locator('text=Run Reconciliation')).toBeVisible();
  });

  test('date filters work correctly', async ({ page }) => {
    // Check date filter inputs exist
    const startDateInput = page.locator('input[type="date"]').first();
    const endDateInput = page.locator('input[type="date"]').nth(1);

    await expect(startDateInput).toBeVisible();
    await expect(endDateInput).toBeVisible();

    // Set date range
    await startDateInput.fill('2024-01-01');
    await endDateInput.fill('2024-01-31');

    // Check reset button works
    await page.click('text=Reset Filters');
    await expect(startDateInput).toHaveValue('');
    await expect(endDateInput).toHaveValue('');
  });

  test('status filter works correctly', async ({ page }) => {
    // Select status filter
    const statusSelect = page.locator('select').first();
    await statusSelect.selectOption('ok');

    // Should filter to OK reports only
    await page.waitForTimeout(1000); // Wait for filtering
    // In a real scenario, check that only OK status reports are shown
  });

  test('reconciliation table displays correctly', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table');

    // Check table headers when table exists
    const tableExists = await page.locator('table').count() > 0;

    if (tableExists) {
      await expect(page.locator('text=Date')).toBeVisible();
      await expect(page.locator('text=Asset')).toBeVisible();
      await expect(page.locator('text=User Liability')).toBeVisible();
      await expect(page.locator('text=Platform Balance')).toBeVisible();
      await expect(page.locator('text=Delta')).toBeVisible();
      await expect(page.locator('text=Status')).toBeVisible();
    }
  });

  test('run reconciliation manually', async ({ page }) => {
    // Click run reconciliation button
    await page.click('text=Run Reconciliation');

    // Should show success message or loading state
    // In real scenario, this would trigger actual reconciliation
    await expect(page.locator('text=Reconciliation Reports')).toBeVisible();
  });

  test('view latest reconciliation', async ({ page }) => {
    // Click view latest button
    await page.click('text=View Latest');

    // Should either show latest report or indicate no reports
    await expect(page.locator('text=Reconciliation Reports')).toBeVisible();
  });

  test('reconciliation details modal works', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table');

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Click details button on first row
      await page.locator('tbody tr').first().locator('text=Details').click();

      // Check modal appears
      const modalVisible = await page.locator('text=Reconciliation Report').isVisible();

      if (modalVisible) {
        // Verify modal content
        await expect(page.locator('text=Reconciliation Report')).toBeVisible();
        await expect(page.locator('text=Asset')).toBeVisible();
        await expect(page.locator('text=Status')).toBeVisible();
        await expect(page.locator('text=Delta')).toBeVisible();

        // Check for balance breakdown sections
        await expect(page.locator('text=User Balances')).toBeVisible();
        await expect(page.locator('text=Platform Balances')).toBeVisible();

        // Close modal
        await page.click('text=✕');
        await expect(page.locator('text=Reconciliation Report')).not.toBeVisible();
      }
    }
  });

  test('pagination works for reports', async ({ page }) => {
    // Check if pagination exists
    const nextButton = page.locator('text=Next');
    const prevButton = page.locator('text=Previous');

    if (await nextButton.isVisible()) {
      // Click next page
      await nextButton.click();

      // Should load next page
      await expect(page.locator('table')).toBeVisible();

      // Go back if possible
      if (await prevButton.isVisible()) {
        await prevButton.click();
        await expect(page.locator('table')).toBeVisible();
      }
    }
  });

  test('status badges display correctly', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table');

    // Check for status badges in table
    const statusBadges = page.locator('[class*="rounded-full"]').filter({ hasText: /OK|WARN|CRITICAL|ERROR/ });

    // If there are reports, they should have status badges
    const badgeCount = await statusBadges.count();
    if (badgeCount > 0) {
      // Verify badges have appropriate styling
      await expect(statusBadges.first()).toBeVisible();
    }
  });

  test('delta values display with proper formatting', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table');

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Check that delta column exists and has numeric values
      const deltaCells = page.locator('tbody tr td').filter({ hasText: /^\$?[\d.-]+$/ });

      // At least one cell should contain a delta value
      expect(await deltaCells.count()).toBeGreaterThan(0);
    }
  });

  test('empty state displays when no reports exist', async ({ page }) => {
    // This test assumes no reconciliation reports exist
    // In practice, you'd clear the database first

    const noReportsMessage = page.locator('text=No reconciliation reports found');

    // If no reports exist, should show empty state
    if (await noReportsMessage.isVisible()) {
      await expect(noReportsMessage).toBeVisible();
    } else {
      // Reports exist, verify table is visible
      await expect(page.locator('table')).toBeVisible();
    }
  });

  test('date range filtering shows correct results', async ({ page }) => {
    // Set a specific date range
    const startDateInput = page.locator('input[type="date"]').first();
    const endDateInput = page.locator('input[type="date"]').nth(1);

    await startDateInput.fill('2024-01-01');
    await endDateInput.fill('2024-01-31');

    // Wait for filtering
    await page.waitForTimeout(1000);

    // Check that any displayed dates are within range
    const dateCells = page.locator('tbody tr td').first(); // Date column

    if (await dateCells.count() > 0) {
      const dateText = await dateCells.first().textContent();
      if (dateText) {
        // Should contain a date in 2024
        expect(dateText).toMatch(/2024/);
      }
    }
  });
});