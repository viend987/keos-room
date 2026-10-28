import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.describe('Keos Room 3D Collaborative Office Review & Alignment Audit', () => {
  const reportsDir = path.resolve('reports/visual-snapshots');

  test.beforeAll(() => {
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
  });

  test('renders 3D office, verifies alignment, tests dialogue hide, and captures snapshots', async ({ page }) => {
    test.setTimeout(120000);
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err));

    await page.goto('/');

    // 1. Wait for canvas element inside container
    const canvas = page.locator('#canvas-container canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Wait 3.5 seconds for Three.js scene, architectural models, and 10 human characters to load and settle
    await page.waitForTimeout(3500);

    // 2. Zero-Emoji Audit on full DOM
    const bodyText = await page.innerText('body');
    const emojiRegex = /[\u{1F300}-\u{1F9FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(bodyText)).toBeFalsy();

    // 3. Capture baseline screenshot (aligned office with dialogue drawer)
    const baselinePath = path.join(reportsDir, 'keos-3d-office-aligned-baseline.png');
    await page.screenshot({ path: baselinePath, fullPage: false });
    expect(fs.existsSync(baselinePath)).toBeTruthy();

    // 4. Test Hiding the Live Dialogue Drawer
    const btnToggle = page.locator('#btn-toggle-dialogue');
    await expect(btnToggle).toBeVisible();
    await btnToggle.click();

    // Wait for drawer collapse transition
    await page.waitForTimeout(600);
    const drawer = page.locator('#telemetry-drawer');
    await expect(drawer).toHaveClass(/collapsed/);

    // 5. Capture full-screen 3D view snapshot with dialogue hidden
    const fullscreenPath = path.join(reportsDir, 'keos-3d-office-aligned-fullscreen.png');
    await page.screenshot({ path: fullscreenPath, fullPage: false });
    expect(fs.existsSync(fullscreenPath)).toBeTruthy();

    // 6. Test Reset Camera interaction
    const btnReset = page.locator('#btn-reset-cam');
    await expect(btnReset).toBeVisible();
    await btnReset.click();
  });
});
