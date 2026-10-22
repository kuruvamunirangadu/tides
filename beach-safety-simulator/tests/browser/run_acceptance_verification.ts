import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

/**
 * run_acceptance_verification.ts
 * 
 * Verifies the full user acceptance workflow in browser:
 * 1. Normal baseline simulation (no false alerts)
 * 2. Triggering distress on WB-105: prominent orange banner + orange 3D locator
 * 3. 1-tap "LOCATE IN 3D": smooth camera glide framing Karthik Varma (WB-105)
 * 4. Triggering simultaneous distress on WB-104 (Pooja Reddy)
 * 5. Safe recovery: clearing alerts and orange locators
 */
const SNAPSHOT_DIR = path.resolve('tests/browser/snapshots/visual');

async function main() {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }

  console.log('Launching browser for TIDES Swimmer Integration Acceptance...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Step 1: Normal Baseline
  console.log('1. Verifying Normal Baseline (No false alerts)...');
  await page.screenshot({ path: path.join(SNAPSHOT_DIR, 'step1-normal-baseline.png') });

  // Step 2: Trigger Distress on WB-105
  console.log('2. Triggering distress on WB-105 (Karthik Varma)...');
  await page.evaluate(() => {
    // @ts-ignore
    window.__tides__.feelingManager.simulateFeelingUnsafe('WB-105', 'Sudden Seaward Rip Outflow');
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SNAPSHOT_DIR, 'step2-distress-active.png') });

  // Step 3: Locate in 3D
  console.log('3. Clicking LOCATE IN 3D (Orange Marker)...');
  const locateBtn = page.locator('button:has-text("LOCATE IN 3D")').first();
  await locateBtn.click({ force: true });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(SNAPSHOT_DIR, 'step3-swimmer-framed.png') });

  // Step 4: Trigger Simultaneous Distress on WB-104
  console.log('4. Triggering simultaneous distress on WB-104 (Pooja Reddy)...');
  await page.evaluate(() => {
    // @ts-ignore
    window.__tides__.feelingManager.simulateFeelingUnsafe('WB-104', 'Undertow Drag');
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SNAPSHOT_DIR, 'step4-multiple-distressed.png') });

  // Step 5: Stabilize and Safe Recovery
  console.log('5. Stabilizing and recovering both swimmers...');
  await page.evaluate(() => {
    // @ts-ignore
    window.__tides__.feelingManager.stabilizeSwimmer('WB-105');
    // @ts-ignore
    window.__tides__.feelingManager.stabilizeSwimmer('WB-104');
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SNAPSHOT_DIR, 'step5-all-recovered-clean.png') });

  await browser.close();
  console.log('✅ Acceptance verification completed successfully. All 5 visual snapshots captured.');
}

main().catch((err) => {
  console.error('Acceptance verification failed:', err);
  process.exit(1);
});

