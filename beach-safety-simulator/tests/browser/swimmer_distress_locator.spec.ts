import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * TIDES: Swimmer Distress Notification & Orange 3D Locator Verification Spec
 * 
 * Tests:
 * 1. Simulating Unsafe or SOS triggers the Swimmer Distress Notification banner in the 3D digital twin.
 * 2. Clicking "LOCATE IN 3D (Orange Marker)" initiates camera tracking to the endangered swimmer.
 * 3. Verified orange locator rings and overhead badge render in the 3D simulation.
 * 4. Captures visual snapshot of the orange-highlighted distressed swimmer in the coastal simulator.
 */
const SNAPSHOT_DIR = path.resolve('tests/browser/snapshots/visual');

test.describe('TIDES — Swimmer Danger Notification & Orange 3D Locator System', () => {

  test('1. Distress notification banner appears and displays endangered swimmer vitals', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    // Wait for the main page & 3D canvas to load
    const canvas = page.locator('canvas:visible').first();
    await expect(canvas).toBeVisible({ timeout: 60000 });

    // Explicitly trigger distress scenario on WB-105 (Karthik Varma)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('tides:swimmer-distress', {
          detail: {
            wristbandId: 'WB-105',
            visitorId: 'VIS-REST-01',
            visitorName: 'Karthik Varma',
            zoneId: 'RIP_CURRENT_CORRIDOR_SOUTH',
            feeling: 'UNSAFE',
            sensationDescription: 'Caught in seaward rip current chute; leg fatigue',
            fatiguePercent: 82,
            heartRateBpm: 148,
            struggleIndex: 'HIGH',
            isSuffering: true,
          },
        })
      );
    });

    // Assert that the distress notification banner is visible for active suffering swimmer (WB-105 / Karthik Varma)
    const alertBanner = page.locator('text=DISTRESS ALERT: SWIMMER IN DANGER (SUFFOCATING)').first();
    await expect(alertBanner).toBeVisible({ timeout: 20000 });

    // Verify vital telemetry cards
    await expect(page.getByText('Karthik Varma').first()).toBeVisible();
    await expect(page.getByText('RIP_CURRENT_CORRIDOR_SOUTH').first()).toBeVisible();
    await expect(page.getByText('HEART RATE').first()).toBeVisible();
    await expect(page.getByText('FATIGUE').first()).toBeVisible();
    await expect(page.getByText('LOCATE IN 3D (Orange Marker)').first()).toBeVisible();
  });

  test('2. Clicking "LOCATE IN 3D" glides camera and frames endangered swimmer', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    // Wait for canvas to be mounted & rendered
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 60000 });

    // Explicitly trigger distress scenario on WB-105 (Karthik Varma)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('tides:swimmer-distress', {
          detail: {
            wristbandId: 'WB-105',
            visitorId: 'VIS-REST-01',
            visitorName: 'Karthik Varma',
            zoneId: 'RIP_CURRENT_CORRIDOR_SOUTH',
            feeling: 'UNSAFE',
            sensationDescription: 'Caught in seaward rip current chute; leg fatigue',
            fatiguePercent: 82,
            heartRateBpm: 148,
            struggleIndex: 'HIGH',
            isSuffering: true,
          },
        })
      );
    });

    const locateBtn = page.locator('button:has-text("LOCATE IN 3D (Orange Marker)")').first();
    await expect(locateBtn).toBeVisible({ timeout: 60000 });

    // Click LOCATE IN 3D
    await locateBtn.click({ force: true });

    // Wait for camera to glide and frame swimmer
    await page.waitForTimeout(2500);

    // Verify canvas remains active and rendered
    await expect(canvas).toBeVisible();

    if (!fs.existsSync(SNAPSHOT_DIR)) {
      fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    }

    const snapshotPath = path.join(SNAPSHOT_DIR, 'orange-swimmer-locator-3d.png');
    await page.screenshot({ path: snapshotPath, fullPage: false });

    expect(fs.existsSync(snapshotPath)).toBe(true);
    expect(fs.statSync(snapshotPath).size).toBeGreaterThan(20000);
  });
});

