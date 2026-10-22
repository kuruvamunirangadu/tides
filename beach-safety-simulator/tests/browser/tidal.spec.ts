import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * TIDES Phase 1 & Phase 2: Coastal Hydrodynamics & Rip Mapping Browser Test Suite
 * 
 * Verifies:
 * 1. 3D Viewport renders Tidal Flow toggle in the tactical header
 * 2. Opening Tidal Flow HUD displays live telemetry (Tide level, Flow velocity, Direction, Rip Corridor alert)
 * 3. Toggling all 5 hydrodynamic subsystems (Vectors, Dye Tracer, Feeder Channels, Rip Corridor, Offshore Plume)
 * 4. Captures visible high-resolution screenshots of Phase 2 Rip Current & Feeder mapping in 3D scene
 */
const SNAPSHOT_DIR = path.resolve('tests/browser/snapshots/visual');

test.describe('TIDES Phase 2 — Longshore Feeder Channels & Rip-Current Mapping', () => {

  test('1. Tactical header displays Tidal Flow button and opens telemetry HUD', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    // Verify Tidal Flow button exists in tactical bar
    const tidalBtn = page.locator('button:has-text("Tidal Flow")').first();
    await expect(tidalBtn).toBeVisible({ timeout: 25000 });
    expect(await tidalBtn.innerText()).toContain('Tidal Flow');

    // Click to open Tidal Flow HUD
    await tidalBtn.click({ force: true });

    // Assert Phase 2 HUD title and metrics cards appear
    await expect(page.getByText('Tidal Flow & Rip-Current Mapping')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('TIDE ELEVATION')).toBeVisible();
    await expect(page.getByText('FLOW VELOCITY')).toBeVisible();
    await expect(page.getByText('Rip Corridor (X=12m)')).toBeVisible();
    await expect(page.getByText('Current Intensity Scale')).toBeVisible();
    await expect(page.getByText('AP Coastal Hydrodynamics Model')).toBeVisible();
  });

  test('2. Tidal Flow HUD toggles vectors, dye tracer, feeder channels, and rip corridor', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    const tidalBtn = page.locator('button:has-text("Tidal Flow")').first();
    await expect(tidalBtn).toBeVisible({ timeout: 25000 });
    await tidalBtn.click({ force: true });

    // Verify HUD is open
    await expect(page.getByText('Tidal Flow & Rip-Current Mapping')).toBeVisible({ timeout: 15000 });

    // Toggle 1: Feeder Channels
    const feederToggle = page.locator('button:has-text("Longshore Feeder Channels")');
    await expect(feederToggle).toBeVisible();
    await feederToggle.click({ force: true });

    // Toggle 2: Rip Neck Corridor
    const ripToggle = page.locator('button:has-text("Rip Neck Corridor Jet")');
    await expect(ripToggle).toBeVisible();
    await ripToggle.click({ force: true });

    // Toggle 3: Offshore Plume
    const plumeToggle = page.locator('button:has-text("Offshore Dispersal Plume")');
    await expect(plumeToggle).toBeVisible();
    await plumeToggle.click({ force: true });

    // Toggle 4: Dye Tracer
    const dyeToggle = page.locator('button:has-text("Fluorescent Dye Tracer")');
    await expect(dyeToggle).toBeVisible();
    await dyeToggle.click({ force: true });

    // Toggle 5: Flow Vectors
    const vectorToggle = page.locator('button:has-text("Directional Flow Vectors")');
    await expect(vectorToggle).toBeVisible();
    await vectorToggle.click({ force: true });
    await vectorToggle.click({ force: true }); // Re-enable

    // Verify canvas remains active
    const canvas = page.locator('canvas:visible').first();
    await expect(canvas).toBeVisible();
  });

  test('3. Capture 3D coastal viewport with active Longshore Feeder Channels & Rip Mapping', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    // Wait for the tactical header to be ready
    const tidalBtn = page.locator('button:has-text("Tidal Flow")').first();
    await expect(tidalBtn).toBeVisible({ timeout: 35000 });
    await tidalBtn.click({ force: true });

    // Wait for the canvas to be attached and rendered
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 45000 });
    await page.waitForTimeout(3000);

    if (!fs.existsSync(SNAPSHOT_DIR)) {
      fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    }

    const screenshotPath = path.join(SNAPSHOT_DIR, 'phase2-rip-mapping.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // Also update baseline tidal-flow-3d-scene.png
    const tidalSnapshot = path.join(SNAPSHOT_DIR, 'tidal-flow-3d-scene.png');
    await page.screenshot({ path: tidalSnapshot, fullPage: false });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(20000);
  });
});
