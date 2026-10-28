import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.describe('Keos Room 3D Collaborative Office Review & Zero-Emoji Audit', () => {
  const reportsDir = path.resolve('reports/visual-snapshots');

  test.beforeAll(() => {
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
  });

  test('renders 3D collaborative office, verifies zero-emoji, and captures snapshot', async ({ page }) => {
    await page.goto('/');

    // 1. Wait for canvas element inside container
    const canvas = page.locator('#canvas-container canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Wait 2.5 seconds for Three.js scene, lighting, and characters to initialize
    await page.waitForTimeout(2500);

    // 2. Zero-Emoji Audit on full DOM
    const bodyText = await page.innerText('body');
    const emojiRegex = /[\u{1F300}-\u{1F9FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(bodyText)).toBeFalsy();

    // 3. Capture 3D Office baseline screenshot
    const baselinePath = path.join(reportsDir, 'keos-3d-office-baseline.png');
    await page.screenshot({ path: baselinePath, fullPage: false });
    expect(fs.existsSync(baselinePath)).toBeTruthy();

    // 4. Click Reset Camera to verify interaction
    const btnReset = page.locator('#btn-reset-cam');
    await expect(btnReset).toBeVisible();
    await btnReset.click();

    // Wait 1.5 seconds and take second interactive snapshot
    await page.waitForTimeout(1500);
    const activePath = path.join(reportsDir, 'keos-3d-office-active.png');
    await page.screenshot({ path: activePath, fullPage: false });
    expect(fs.existsSync(activePath)).toBeTruthy();

    // 5. Verify Log Stream has entries
    const terminalLogs = page.locator('#log-stream .log-entry');
    await expect(terminalLogs.first()).toBeVisible();
  });
});
