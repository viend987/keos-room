import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.describe('Keos Room Holographic Cyber-Studio Review & Zero-Emoji Audit', () => {
  const reportsDir = path.resolve('reports/visual-snapshots');

  test.beforeAll(() => {
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
  });

  test('renders holographic cyber-studio, triggers debate drama, and audits zero-emoji', async ({ page }) => {
    await page.goto('/');

    // 1. Wait for canvas element to be ready
    const canvas = page.locator('#office-canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Wait 2 seconds for initial render loop
    await page.waitForTimeout(2000);

    // 2. Zero-Emoji Audit on full DOM
    const bodyText = await page.innerText('body');
    const emojiRegex = /[\u{1F300}-\u{1F9FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(bodyText)).toBeFalsy();

    // 3. Capture baseline screenshot
    const baselinePath = path.join(reportsDir, 'keos-holographic-studio-baseline.png');
    await page.screenshot({ path: baselinePath, fullPage: false });
    expect(fs.existsSync(baselinePath)).toBeTruthy();

    // 4. Trigger Inter-Jobdesk Debate & Drama Scenario
    const btnDebate = page.locator('#btn-trigger-debate');
    await expect(btnDebate).toBeVisible();
    await btnDebate.click();

    // Wait 2.5 seconds for debate shockwaves, speech bubbles, and character movements to trigger
    await page.waitForTimeout(2500);

    // 5. Capture active drama screenshot
    const dramaPath = path.join(reportsDir, 'keos-holographic-debate-drama.png');
    await page.screenshot({ path: dramaPath, fullPage: false });
    expect(fs.existsSync(dramaPath)).toBeTruthy();

    // 6. Verify Log Stream has entries
    const terminalLogs = page.locator('#log-stream .log-entry');
    await expect(terminalLogs.first()).toBeVisible();
  });
});
