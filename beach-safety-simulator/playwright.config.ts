import { defineConfig, devices } from '@playwright/test';

/**
 * TIDES Coastal Safety Platform — Playwright Browser Test Configuration
 * 
 * Supports:
 * - Browser Smoke Tests (Simulator port 5173, Command Center port 3000, Backend port 8000)
 * - Visual Regression Tests (WebGL 3D Twin & 2D Tactical/Thermal/Heatmap Canvases)
 * - End-to-End Workflow Tests (SOS trigger -> Incident -> Rescue Coordination -> Downlink)
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  snapshotDir: './tests/browser/snapshots',
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}/{arg}{ext}',
  
  /* Run tests in files in parallel */
  fullyParallel: false,
  workers: 1, // Deterministic sequential execution to prevent state collisions

  /* Maximum time one test can run for (allow headroom for software SwiftShader WebGL on Windows) */
  timeout: 90000,
  expect: {
    timeout: 30000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.08,
      threshold: 0.2,
      animations: 'disabled',
    },
  },

  /* Reporter to use */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  /* Shared settings for all projects */
  use: {
    /* Base URL for simulator */
    baseURL: 'http://localhost:5173',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    
    /* Hardware-acceleration & WebGL flags for headless Chromium */
    launchOptions: {
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--ignore-gpu-blocklist',
        '--enable-webgl',
        '--no-sandbox',
      ],
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
