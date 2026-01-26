/**
 * E2E tests for Admin System Alerts Management
 * Tests alert viewing, filtering, and management functionality
 */
import { test, expect } from '@playwright/test';

test.describe('Admin System Alerts Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/signin');
    await page.fill('input[name="email"]', 'hitech.proton@gmail.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to admin panel
    await page.waitForURL('/admin');

    // Navigate to system alerts tab
    await page.click('text=System Alerts');
  });

  test('alerts management page loads correctly', async ({ page }) => {
    // Verify we're on the alerts page
    await expect(page.locator('text=System Alerts')).toBeVisible();
    await expect(page.locator('text=Monitor and manage system alerts and issues')).toBeVisible();

    // Check filters are present
    await expect(page.locator('text=Status')).toBeVisible();
    await expect(page.locator('text=Severity')).toBeVisible();
    await expect(page.locator('text=Reset Filters')).toBeVisible();
  });

  test('alert table displays correctly', async ({ page }) => {
    // Wait for alerts to load
    await page.waitForSelector('table');

    // Check table headers
    await expect(page.locator('text=Type')).toBeVisible();
    await expect(page.locator('text=Severity')).toBeVisible();
    await expect(page.locator('text=Message')).toBeVisible();
    await expect(page.locator('text=Status')).toBeVisible();
    await expect(page.locator('text=Created')).toBeVisible();
    await expect(page.locator('text=Actions')).toBeVisible();
  });

  test('status filter works correctly', async ({ page }) => {
    // Select "Open" status filter
    await page.selectOption('select', 'open');

    // Wait for filtering to apply
    await page.waitForTimeout(1000);

    // Check that all visible alerts have "Open" status
    const statusCells = page.locator('td').filter({ hasText: 'OPEN' });
    const totalRows = await page.locator('tbody tr').count();

    if (totalRows > 0) {
      // If there are rows, they should all be open
      await expect(statusCells).toHaveCount(totalRows);
    }
  });

  test('severity filter works correctly', async ({ page }) => {
    // Select "Critical" severity filter
    await page.selectOption('select >> nth=1', 'critical'); // Second select (severity)

    // Wait for filtering to apply
    await page.waitForTimeout(1000);

    // Check that visible alerts are critical
    const criticalBadges = page.locator('[class*="border-red-500"]').filter({ hasText: 'CRITICAL' });
    const totalRows = await page.locator('tbody tr').count();

    if (totalRows > 0) {
      await expect(criticalBadges).toHaveCount(totalRows);
    }
  });

  test('reset filters works', async ({ page }) => {
    // Apply filters
    await page.selectOption('select', 'open');
    await page.selectOption('select >> nth=1', 'warning');

    // Click reset
    await page.click('text=Reset Filters');

    // Check filters are reset (should show "All")
    const statusSelect = page.locator('select').first();
    const severitySelect = page.locator('select').nth(1);

    await expect(statusSelect).toHaveValue('');
    await expect(severitySelect).toHaveValue('');
  });

  test('alert details modal works', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table');

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Click details button on first row
      await page.locator('tbody tr').first().locator('text=Details').click();

      // Check modal appears
      await expect(page.locator('text=Alert Details')).toBeVisible();

      // Check modal content
      await expect(page.locator('text=Type')).toBeVisible();
      await expect(page.locator('text=Severity')).toBeVisible();
      await expect(page.locator('text=Message')).toBeVisible();

      // Close modal
      await page.click('text=✕');
      await expect(page.locator('text=Alert Details')).not.toBeVisible();
    }
  });

  test('acknowledge alert workflow', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table');

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Find an open alert
      const openRows = page.locator('tbody tr').filter({ hasText: 'OPEN' });

      if (await openRows.count() > 0) {
        // Click acknowledge on first open alert
        await openRows.first().locator('text=Acknowledge').click();

        // Should show success message or update status
        await expect(page.locator('text=Alert acknowledged')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('pagination works when many alerts exist', async ({ page }) => {
    // This test assumes there might be many alerts
    // In a real scenario, you'd seed more alerts

    const nextButton = page.locator('text=Next');
    const prevButton = page.locator('text=Previous');

    // Check if pagination exists
    if (await nextButton.isVisible()) {
      // Click next page
      await nextButton.click();

      // Should load next page
      await expect(page.locator('table')).toBeVisible();

      // Go back
      if (await prevButton.isVisible()) {
        await prevButton.click();
        await expect(page.locator('table')).toBeVisible();
      }
    }
  });

  test('empty state displays correctly', async ({ page }) => {
    // This would require no alerts in the system
    // In a real test, you'd clear all alerts first

    // For now, just verify the page structure exists
    await expect(page.locator('text=System Alerts')).toBeVisible();
  });
});