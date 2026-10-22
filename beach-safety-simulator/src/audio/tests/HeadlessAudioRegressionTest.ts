/**
 * HeadlessAudioRegressionTest.ts
 * 
 * Verifies that BeachSoundEngine handles headless Node.js test environments
 * gracefully: returns false, produces zero uncaught exceptions, and allows
 * rescue alerts to execute safely without fake window globals.
 */

import { soundEngine } from '../BeachSoundEngine';

export async function runHeadlessAudioRegressionTest(): Promise<boolean> {
  console.log('Testing Headless Audio Safety in Node.js environment...');

  // 1. Verify window is undefined in this test environment
  if (typeof window !== 'undefined') {
    console.error('[FAIL] Expected window to be undefined in Node.js');
    return false;
  }

  // 2. initAudio should return false safely without throwing ReferenceError
  try {
    const initialized = await soundEngine.initAudio();
    if (initialized !== false) {
      console.error('[FAIL] Expected initAudio() to return false in headless environment');
      return false;
    }
  } catch (err) {
    console.error('[FAIL] initAudio() threw an uncaught error in headless environment:', err);
    return false;
  }

  // 3. Audio state should report not playing
  const state = soundEngine.getState();
  if (state.isPlaying) {
    console.error('[FAIL] Expected isPlaying to be false in headless environment');
    return false;
  }

  // 4. Calling safety sound effects should execute safely without crashing or throwing
  try {
    soundEngine.playLifeguardWhistle();
    soundEngine.playPACallChime();
    soundEngine.playSeagullCall();
  } catch (err) {
    console.error('[FAIL] Audio SFX calls threw an error in headless environment:', err);
    return false;
  }

  console.log('[PASS] Headless Audio Safety Regression Test passed.');
  return true;
}

if (process.argv[1] && process.argv[1].includes('HeadlessAudioRegressionTest')) {
  runHeadlessAudioRegressionTest().then((passed) => {
    process.exit(passed ? 0 : 1);
  });
}

