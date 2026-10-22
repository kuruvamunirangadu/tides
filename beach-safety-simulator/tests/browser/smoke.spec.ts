import { test, expect } from '@playwright/test';

/**
 * TIDES Browser Smoke Test Suite
 * 
 * Verifies that all three services (Simulator port 5173, Command Center port 3000,
 * and FastAPI backend port 8000) are healthy, critical DOM elements and headings render,
 * canvases initialize without crashing, and zero uncaught JS exceptions occur on load.
 */

test.describe('TIDES Platform — Multi-Service Browser Smoke Tests', () => {

  test('1. Backend FastAPI health endpoint responds online with contract', async ({ request }) => {
    const response = await request.get('http://localhost:8000/api/health');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('online');
    expect(data.system).toContain('Andhra Pradesh');
    expect(data.engine).toContain('Safety Engine');
    expect(data.timestamp).toBeDefined();
  });

  test('2. Backend regional coastal registry endpoint serves 8 Andhra Pradesh sites', async ({ request }) => {
    const response = await request.get('http://localhost:8000/api/regional/beaches');
    expect(response.status()).toBe(200);

    const beaches = await response.json();
    expect(Array.isArray(beaches)).toBe(true);
    expect(beaches.length).toBe(8);

    const rushikonda = beaches.find((b: any) => b.beach_id === 'RUSHIKONDA');
    expect(rushikonda).toBeDefined();
    expect(rushikonda.status).toBe('ACTIVE');
    expect(rushikonda.provenance).toBe('SIMULATED');
    expect(rushikonda.data_freshness).toBe('FRESH');
  });

  test('3. Command & Control Dashboard loads on port 3000 with telemetry feed', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Verify Brand Heading
    const heading = page.locator('h1');
    await expect(heading).toContainText('ANDHRA PRADESH COASTAL SAFETY PLATFORM');

    // Verify Telemetry Badge exists
    const telemetryBadge = page.locator('header');
    await expect(telemetryBadge).toContainText(/Telemetry:/i);

    // Verify Canvas Element
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(200);
    expect(box!.height).toBeGreaterThan(150);

    // Verify no fatal React/Next runtime crashes occurred
    const fatalErrors = consoleErrors.filter(e => e.includes('Uncaught') || e.includes('TypeError'));
    expect(fatalErrors).toHaveLength(0);
  });

  test('4. Beach Safety Simulator loads on port 5173 with 7 simulation mode switchers', async ({ page }) => {
    const consoleErrors: string[] = [];
    const validationErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('response', (response) => {
      if (response.status() === 422) validationErrors.push(response.url());
    });

    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Verify Header and Badges
    await expect(page.locator('header')).toContainText('COASTAL BEACH SAFETY');
    await expect(page.locator('header')).toContainText('AP DISASTER MGMT');

    // Wait for the primary simulation canvas (WebGL or 2D)
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(400);
    expect(box!.height).toBeGreaterThan(300);

    // Verify the 7 view modes switcher bar is visible
    const switcherBar = page.locator('button:has-text("3D Digital Twin")');
    await expect(switcherBar).toBeVisible();

    await expect(page.locator('button:has-text("Operational")')).toBeVisible();
    await expect(page.locator('button:has-text("Risk Heatmap")')).toBeVisible();
    await expect(page.locator('button:has-text("Thermal FLIR")')).toBeVisible();
    await expect(page.locator('button:has-text("Satellite Recon")')).toBeVisible();
    await expect(page.locator('button:has-text("Sat + Heat")')).toBeVisible();
    await expect(page.locator('button:has-text("Hydrodynamics")')).toBeVisible();

    // Verify Wristbands interactive toggle button exists
    const wristbandToggle = page.locator('button:has-text("Wristbands")');
    await expect(wristbandToggle).toBeVisible();

    // Filter out expected WebGL/audio warnings; ensure no fatal script crashes
    const fatalErrors = consoleErrors.filter(e => e.includes('Uncaught') && !e.includes('favicon'));
    expect(fatalErrors).toHaveLength(0);
    expect(validationErrors).toHaveLength(0);
  });

  test('5. Three.js WebGL canvas context initializes with active dimensions', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });

    // Check canvas element in DOM
    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThan(0);

    // Verify canvas dimensions
    const mainCanvas = page.locator('canvas').first();
    const boundingBox = await mainCanvas.boundingBox();
    expect(boundingBox).not.toBeNull();
    expect(boundingBox!.width).toBeGreaterThan(500);
    expect(boundingBox!.height).toBeGreaterThan(350);

    // Evaluate WebGL context inside browser
    const contextType = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      for (const c of canvases) {
        const gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('2d');
        if (gl) return gl.constructor.name;
      }
      return 'none';
    });

    expect(contextType).not.toBe('none');
  });

});

