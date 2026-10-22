import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * TIDES Visual Regression & 3D WebGL Integrity Test Suite
 * 
 * Validates:
 * - 3D WebGL canvas dimensions, non-blank rendering, and scene mount
 * - 2D Operational Tactical canvas rendering
 * - Thermal FLIR false-color infrared visualization
 * - Risk Heatmap overlay rendering
 * - Command & Control Dashboard overview & gauge elements
 * - Connected Wristbands Operations HUD modal overlay
 * 
 * Captures version-controlled visual baselines in tests/browser/snapshots/visual/
 */

const SNAPSHOT_DIR = path.resolve('tests/browser/snapshots/visual');

test.beforeAll(async () => {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
});

test.describe('TIDES — Visual Regression & 3D Integrity Tests', () => {

  test('1. Three.js 3D Coastal Canvas mounts and renders non-empty viewport', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    // Wait for header and 3D switch button to be active
    const btn3D = page.locator('button:has-text("3D Digital Twin")');
    await expect(btn3D).toBeVisible({ timeout: 15000 });

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(600);
    expect(box!.height).toBeGreaterThan(400);

    // Allow Three.js initial geometry and shader compilation to settle
    await page.waitForTimeout(2000);

    // Capture visual baseline of the 3D beach viewport
    const screenshotPath = path.join(SNAPSHOT_DIR, '3d-beach-canvas.png');
    await canvas.screenshot({ path: screenshotPath });
    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(10000); // Verify non-empty image file (>10KB)
  });

  test('2. Mode switcher switches to 2D Tactical Operational Canvas', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    const tacticalBtn = page.locator('button:has-text("Operational")');
    await expect(tacticalBtn).toBeVisible({ timeout: 15000 });
    await tacticalBtn.click({ force: true });

    // Verify button active styling
    await expect(tacticalBtn).toHaveClass(/bg-cyan-500/);

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(1000);

    const screenshotPath = path.join(SNAPSHOT_DIR, 'operational-2d-canvas.png');
    await canvas.screenshot({ path: screenshotPath });
    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(10000);
  });

  test('3. Mode switcher switches to Thermal FLIR False-Color Infrared', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    const thermalBtn = page.locator('button:has-text("Thermal FLIR")');
    await expect(thermalBtn).toBeVisible({ timeout: 15000 });
    await thermalBtn.click({ force: true });

    await expect(thermalBtn).toHaveClass(/bg-rose-500/);

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(1000);

    const screenshotPath = path.join(SNAPSHOT_DIR, 'thermal-flir-canvas.png');
    await canvas.screenshot({ path: screenshotPath });
    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(10000);
  });

  test('4. Mode switcher switches to Risk Heatmap overlay', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    const heatBtn = page.locator('button:has-text("Risk Heatmap")');
    await expect(heatBtn).toBeVisible({ timeout: 15000 });
    await heatBtn.click({ force: true });

    await expect(heatBtn).toHaveClass(/bg-amber-500/);

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(1000);

    const screenshotPath = path.join(SNAPSHOT_DIR, 'risk-heatmap-canvas.png');
    await canvas.screenshot({ path: screenshotPath });
    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(10000);
  });

  test('5. Command & Control Dashboard overview renders with metrics and gauges', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

    // Wait for the main mission control header
    await expect(page.locator('h1')).toContainText('ANDHRA PRADESH COASTAL SAFETY PLATFORM');

    // Wait for dashboard widgets (Environmental Gauges, Risk Matrix, Incident Timeline)
    await page.waitForTimeout(1500);

    const screenshotPath = path.join(SNAPSHOT_DIR, 'command-center-overview.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(20000);
  });

  test('6. Connected Wristband Operations HUD opens modal with fleet KPIs', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    const wristbandToggle = page.locator('button:has-text("Wristbands")').first();
    await expect(wristbandToggle).toBeVisible({ timeout: 15000 });
    await wristbandToggle.click({ force: true });

    // Verify HUD Header and Fleet KPI elements
    const hudHeader = page.locator('text=Track B — Connected Wristband Safety HUD');
    await expect(hudHeader).toBeVisible({ timeout: 5000 });

    await expect(page.locator('text=REGISTERED FLEET')).toBeVisible();
    await expect(page.locator('text=ACTIVE SOS ALERTS')).toBeVisible();

    const hudModal = page.locator('div:has-text("Track B — Connected Wristband Safety HUD")').last();
    await page.waitForTimeout(1000);

    const screenshotPath = path.join(SNAPSHOT_DIR, 'wristband-operations-hud.png');
    await hudModal.screenshot({ path: screenshotPath });
    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(10000);
  });

});
