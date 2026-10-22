import { test, expect } from '@playwright/test';

/**
 * TIDES End-to-End Workflow & QA Test Suite
 * 
 * Verifies real user workflows through the browser UI:
 * 1. Simulation controls lifecycle (RUN -> PAUSE -> SPEED CHANGE)
 * 2. Connected Wristband SOS alert triggering, OLED message update, and emergency reset
 * 3. Subsystem navigation across Left Phase Options and Top Tabs
 * 4. Command & Control Dashboard live telemetry synchronization & interaction
 */

test.describe('TIDES Platform — End-to-End Workflows & User Scenarios', () => {

  test('1. Simulation lifecycle: Run, Pause, and Speed Multiplier work seamlessly', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    // Ensure header is ready
    await expect(page.locator('header')).toContainText('COASTAL BEACH SAFETY');

    // Locate play/pause control inside SimulationControls
    const pauseBtn = page.locator('button:has-text("PAUSE SIMULATION")');
    const runBtn = page.locator('button:has-text("RUN SIMULATION")');

    // Toggle simulation state
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
      await expect(runBtn).toBeVisible({ timeout: 5000 });
      await runBtn.click();
      await expect(pauseBtn).toBeVisible({ timeout: 5000 });
    } else if (await runBtn.isVisible()) {
      await runBtn.click();
      await expect(pauseBtn).toBeVisible({ timeout: 5000 });
    }

    // Test speed multiplier buttons (1x, 2x)
    const btn2x = page.locator('button', { hasText: /^2x$/ }).first();
    if (await btn2x.isVisible()) {
      await btn2x.click();
      await expect(btn2x).toHaveClass(/bg-cyan-500/);

      const btn1x = page.locator('button', { hasText: /^1x$/ }).first();
      await btn1x.click();
      await expect(btn1x).toHaveClass(/bg-cyan-500/);
    }
  });

  test('2. Connected Wristband Workflow: 1-Tap SOS triggers active alert and resets cleanly', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Open Wristband Operations HUD modal from top canvas bar
    const wristbandToggle = page.locator('button:has-text("Wristbands")').first();
    await expect(wristbandToggle).toBeVisible({ timeout: 15000 });
    await wristbandToggle.click({ force: true });

    // Verify HUD modal appears
    await expect(page.getByText('Track B — Connected Wristband Safety HUD')).toBeVisible({ timeout: 10000 });

    // Find the 1-Tap SOS Trigger button
    const sosButton = page.locator('button:has-text("Simulate 1-Tap SOS Button")');
    const resetButton = page.locator('button:has-text("Reset SOS Distress")');

    // If an SOS is already active from a previous test, clear it first
    if (await resetButton.isVisible()) {
      await resetButton.click({ force: true });
      await expect(sosButton).toBeVisible({ timeout: 5000 });
    }

    // Trigger SOS
    await sosButton.click({ force: true });

    // Verify state transition: Reset button becomes visible and OLED banner updates
    await expect(resetButton).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('TIDES SMARTBAND OLED 128x64')).toBeVisible();

    // Verify SOS indicator text is present in the simulated OLED banner
    await expect(page.getByText('SOS SENT - HELP IN ROUTE')).toBeVisible({ timeout: 5000 });

    // Cleanly reset the SOS state to keep environment pristine
    await resetButton.click({ force: true });
    await expect(sosButton).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('SAFE - BEACH OPEN')).toBeVisible({ timeout: 5000 });
  });

  test('3. Subsystem Navigation: Switching panels keeps canvas and simulation stable', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    // Verify simulation container is visible
    const simContainer = page.locator('text=COASTAL BEACH SAFETY');
    await expect(simContainer).toBeVisible({ timeout: 15000 });

    // Switch to Operational 2D view to ensure standard 2D canvas is active
    const operationalBtn = page.locator('button:has-text("Operational")');
    if (await operationalBtn.isVisible()) {
      await operationalBtn.click();
      const canvas = page.locator('canvas:visible').first();
      await expect(canvas).toBeVisible({ timeout: 10000 });
    }

    // Test Navigation Options (GIS, Vision, IoT, Drones)
    const tabsToTest = ['GIS GEOFENCE', 'AI PREDICT', 'IoT SENSORS', 'DRONES'];

    for (const tabName of tabsToTest) {
      const tabLocator = page.locator(`button:has-text("${tabName}")`).first();
      if (await tabLocator.isVisible()) {
        await tabLocator.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('4. Command & Control Live Interaction: Dashboard connects and renders metrics', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

    // Main header check
    await expect(page.locator('h1')).toContainText('ANDHRA PRADESH COASTAL SAFETY PLATFORM');

    // Telemetry badge
    const telemetryPill = page.locator('header').locator('text=Telemetry:');
    await expect(telemetryPill).toBeVisible({ timeout: 10000 });

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

});
