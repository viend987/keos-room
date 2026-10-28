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
    const canvas = page.locator('#game-container canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Wait 1 second for Phaser to complete scene setup
    await page.waitForTimeout(1000);

    // 2. Zero-Emoji Audit on full DOM
    const bodyText = await page.innerText('body');
    const emojiRegex = /[\u{1F300}-\u{1F9FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(bodyText)).toBeFalsy();

    // 3. Capture baseline screenshot
    const baselinePath = path.join(reportsDir, 'keos-office-baseline.png');
    await page.screenshot({ path: baselinePath, fullPage: false });
    expect(fs.existsSync(baselinePath)).toBeTruthy();

    // 4. Trigger Concurrent Projects Scenario
    const btnConcurrent = page.locator('#btn-demo-concurrent');
    await btnConcurrent.click();

    // Wait 4 seconds for characters to animate to desks, sit down, type, and speech bubbles to pop up
    await page.waitForTimeout(4000);

    // 5. Capture active multi-agent execution screenshot
    const activePath = path.join(reportsDir, 'keos-office-active-concurrent.png');
    await page.screenshot({ path: activePath, fullPage: false });
    expect(fs.existsSync(activePath)).toBeTruthy();

    // 6. Verify Terminal Feed has received logs
    const terminalLogs = page.locator('#terminal-feed .log-line');
    await expect(terminalLogs.first()).toBeVisible();
  });
});
