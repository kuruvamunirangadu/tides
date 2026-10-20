/**
 * haptics_led.h
 * 
 * Hardware visual indicator (RGB LED) and haptic vibration driver.
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

typedef enum {
  LED_PATTERN_OFF = 0,
  LED_PATTERN_PULSING_GREEN,   // Safe standby monitoring
  LED_PATTERN_FLASHING_RED,    // Emergency SOS distress active
  LED_PATTERN_STROBE_AMBER,    // Localized hazard / caution warning
  LED_PATTERN_RAPID_CYAN       // Rescue drone dispatched / en route
} LedPattern_t;

typedef enum {
  HAPTIC_PATTERN_OFF = 0,
  HAPTIC_PATTERN_SHORT_PULSE,      // 200ms pulse (advisory ping / ack confirmation)
  HAPTIC_PATTERN_PERSISTENT_ALARM, // Continuous 500ms on / 500ms off alarm
  HAPTIC_PATTERN_CADENCE_BURST     // Triple burst (evacuate water now)
} HapticPattern_t;

class HapticsLedManager {
public:
  HapticsLedManager();
  void init(uint8_t pinGreen, uint8_t pinAmber, uint8_t pinRed, uint8_t pinHaptic);
  void setLedPattern(LedPattern_t pattern);
  void setHapticPattern(HapticPattern_t pattern);
  void update(uint32_t currentMillis);
  
  LedPattern_t getLedPattern() const { return _ledPattern; }
  HapticPattern_t getHapticPattern() const { return _hapticPattern; }

private:
  uint8_t _pinGreen;
  uint8_t _pinAmber;
  uint8_t _pinRed;
  uint8_t _pinHaptic;

  LedPattern_t _ledPattern;
  HapticPattern_t _hapticPattern;

  uint32_t _lastLedUpdate;
  uint32_t _lastHapticUpdate;
  bool _ledState;
  bool _hapticState;
  uint8_t _burstIndex;
};

