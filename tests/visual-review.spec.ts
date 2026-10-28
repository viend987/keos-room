import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.describe('Keos Room Visual Review & Zero-Emoji Audit', () => {
  const reportsDir = path.resolve('reports/visual-snapshots');

  test.beforeAll(() => {
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
  });

  test('renders full office floor and verifies zero-emoji compliance', async ({ page }) => {
    await page.goto('/');

    // 1. Wait for canvas element to be ready
    const canvas = page.locator('#office-canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Wait 1.5 seconds for OfficeEngine to load layout, assets and complete first frames
    await page.waitForTimeout(1500);

    // 2. Zero-Emoji Audit on full DOM
    const bodyText = await page.innerText('body');
    const emojiRegex = /[\u{1F300}-\u{1F9FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(bodyText)).toBeFalsy();

    // 3. Capture baseline screenshot
    const baselinePath = path.join(reportsDir, 'keos-office-baseline.png');
    await page.screenshot({ path: baselinePath, fullPage: false });
    expect(fs.existsSync(baselinePath)).toBeTruthy();

    // 4. Trigger Sprint / Concurrent Work Scenario
    const btnSprint = page.locator('button[data-demo="SPRINT"]');
    await expect(btnSprint).toBeVisible();
    await btnSprint.click();

    // Wait 3.5 seconds for characters to animate to desks, type, and speech bubbles to pop up
    await page.waitForTimeout(3500);

    // 5. Capture active multi-agent execution screenshot
    const activePath = path.join(reportsDir, 'keos-office-active-concurrent.png');
    await page.screenshot({ path: activePath, fullPage: false });
    expect(fs.existsSync(activePath)).toBeTruthy();

    // 6. Verify Log Stream has received logs
    const terminalLogs = page.locator('#log-stream .log-entry');
    await expect(terminalLogs.first()).toBeVisible();
  });
});
