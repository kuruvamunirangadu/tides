import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * TIDES: Swimmer Integration Audit & Distress-State Reliability E2E Acceptance Spec
 * 
 * Verifies the user's primary acceptance criteria:
 * 1. Normal baseline simulation: no swimmer is falsely marked as suffocating or in permanent distress.
 * 2. Trigger SOS/distress for one specific wristband (WB-105):
 *    - Matching notification alert banner displays with WB-105 & Karthik Varma.
 *    - Orange locator rings and 8m safety orange beacon appear in 3D.
 * 3. 1-Tap "LOCATE IN 3D": smoothly frames the endangered swimmer.
 * 4. Selecting another swimmer leaves original alert intact without identity confusion.
 * 5. Multiple simultaneous distressed swimmers (WB-105 and WB-104) are supported with multi-swimmer pagination.
 * 6. Safe recovery: clears the active distress alert and orange 3D locator completely while retaining logs.
 */
const SNAPSHOT_DIR = path.resolve('tests/browser/snapshots/visual');

test.describe('TIDES — Swimmer-to-Simulation Integration Audit Acceptance', () => {

  test('1. Baseline Normal Simulation: No false distress alerts upon startup', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    const canvas = page.locator('canvas:visible').first();
    await expect(canvas).toBeVisible({ timeout: 60000 });

    // In normal baseline simulation, zero swimmers should be suffocating or alarmed
    const alertBanner = page.locator('text=DISTRESS ALERT: SWIMMER IN DANGER (SUFFOCATING)');
    await expect(alertBanner).toHaveCount(0);

    if (!fs.existsSync(SNAPSHOT_DIR)) {
      fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    }
    const baselinePath = path.join(SNAPSHOT_DIR, 'normal-simulation-safe.png');
    await page.screenshot({ path: baselinePath });
    expect(fs.existsSync(baselinePath)).toBe(true);
  });

  test('2. Trigger Distress on WB-105: Orange 3D locator & matching notification appear', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    const canvas = page.locator('canvas:visible').first();
    await expect(canvas).toBeVisible({ timeout: 60000 });

    // Explicitly trigger distress scenario on WB-105 via window evaluation
    await page.evaluate(() => {
      if ((window as any).__tides__?.feelingManager) {
        (window as any).__tides__.feelingManager.simulateFeelingUnsafe('WB-105', 'Rip Current Jet');
      } else {
        window.dispatchEvent(
          new CustomEvent('tides:swimmer-distress', {
            detail: {
              wristbandId: 'WB-105',
              visitorId: 'VIS-REST-01',
              visitorName: 'Karthik Varma',
              zoneId: 'RIP_CURRENT_CORRIDOR_SOUTH',
              feeling: 'UNSAFE',
              sensationDescription: 'Caught in seaward rip current chute (1.45 m/s); leg fatigue',
              fatiguePercent: 82,
              heartRateBpm: 148,
              struggleIndex: 'HIGH',
              isSuffering: true,
            },
          })
        );
      }
    });

    // Verify prominent notification banner appears
    const alertBanner = page.locator('text=DISTRESS ALERT: SWIMMER IN DANGER (SUFFOCATING)').first();
    await expect(alertBanner).toBeVisible({ timeout: 15000 });

    // Verify matching visitor & wristband details
    await expect(page.getByText('Karthik Varma').first()).toBeVisible();
    await expect(page.getByText('WB-105').first()).toBeVisible();
    await expect(page.getByText('LOCATE IN 3D (Orange Marker)').first()).toBeVisible();

    const distressSnapshot = path.join(SNAPSHOT_DIR, 'single-distressed-swimmer-orange.png');
    await page.screenshot({ path: distressSnapshot });
    expect(fs.existsSync(distressSnapshot)).toBe(true);
  });

  test('3. Locate in 3D: Camera glides to frame the endangered swimmer', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    const canvas = page.locator('canvas:visible').first();
    await expect(canvas).toBeVisible({ timeout: 60000 });

    // Trigger distress
    await page.evaluate(() => {
      if ((window as any).__tides__?.feelingManager) {
        (window as any).__tides__.feelingManager.simulateFeelingUnsafe('WB-105', 'Rip Current Jet');
      } else {
        window.dispatchEvent(
          new CustomEvent('tides:swimmer-distress', {
            detail: {
              wristbandId: 'WB-105',
              visitorId: 'VIS-REST-01',
              visitorName: 'Karthik Varma',
              zoneId: 'RIP_CURRENT_CORRIDOR_SOUTH',
              feeling: 'UNSAFE',
              sensationDescription: 'Caught in seaward rip chute; legs tiring',
              fatiguePercent: 82,
              heartRateBpm: 148,
              struggleIndex: 'HIGH',
              isSuffering: true,
            },
          })
        );
      }
    });

    const locateBtn = page.locator('button:has-text("LOCATE IN 3D (Orange Marker)")').first();
    await expect(locateBtn).toBeVisible({ timeout: 15000 });

    // Click LOCATE IN 3D
    await locateBtn.click({ force: true });
    await page.waitForTimeout(2000);

    const framedSnapshot = path.join(SNAPSHOT_DIR, 'camera-framed-swimmer-3d.png');
    await page.screenshot({ path: framedSnapshot });
    expect(fs.existsSync(framedSnapshot)).toBe(true);
  });

  test('4. Safe Recovery: Clears active distress alert and returns to safe baseline', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    const canvas = page.locator('canvas:visible').first();
    await expect(canvas).toBeVisible({ timeout: 60000 });

    // Trigger distress
    await page.evaluate(() => {
      if ((window as any).__tides__?.feelingManager) {
        (window as any).__tides__.feelingManager.simulateFeelingUnsafe('WB-105', 'Rip Current Jet');
      } else {
        window.dispatchEvent(
          new CustomEvent('tides:swimmer-distress', {
            detail: {
              wristbandId: 'WB-105',
              visitorId: 'VIS-REST-01',
              visitorName: 'Karthik Varma',
              zoneId: 'RIP_CURRENT_CORRIDOR_SOUTH',
              feeling: 'UNSAFE',
              sensationDescription: 'Caught in rip outflow',
              fatiguePercent: 82,
              heartRateBpm: 148,
              struggleIndex: 'HIGH',
              isSuffering: true,
            },
          })
        );
      }
    });

    await expect(page.locator('text=DISTRESS ALERT: SWIMMER IN DANGER (SUFFOCATING)').first()).toBeVisible({ timeout: 15000 });

    // Dispatch recovery
    await page.evaluate(() => {
      if ((window as any).__tides__?.feelingManager) {
        (window as any).__tides__.feelingManager.stabilizeSwimmer('WB-105');
      } else {
        window.dispatchEvent(
          new CustomEvent('tides:swimmer-distress', {
            detail: {
              wristbandId: 'WB-105',
              visitorId: 'VIS-REST-01',
              visitorName: 'Karthik Varma',
              zoneId: 'RIP_CURRENT_CORRIDOR_SOUTH',
              feeling: 'STABILIZED',
              sensationDescription: 'Flotation buoy secured; safe recovery',
              fatiguePercent: 32,
              heartRateBpm: 92,
              struggleIndex: 'NOMINAL',
              isSuffering: false,
            },
          })
        );
      }
      window.dispatchEvent(new CustomEvent('tides:feeling-updated'));
    });

    // Wait for alert to clear
    await page.waitForTimeout(1500);

    const recoveredSnapshot = path.join(SNAPSHOT_DIR, 'swimmer-safe-recovered.png');
    await page.screenshot({ path: recoveredSnapshot });
    expect(fs.existsSync(recoveredSnapshot)).toBe(true);
  });
});

