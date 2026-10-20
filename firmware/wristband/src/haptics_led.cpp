/**
 * haptics_led.cpp
 * 
 * Hardware visual indicator and haptic driver implementation.
 */

#include "haptics_led.h"
#include "../include/config.h"

#if defined(ARDUINO) || defined(ESP_PLATFORM)
  #include <Arduino.h>
#else
  static void pinMode(uint8_t pin, int mode) { (void)pin; (void)mode; }
  static void digitalWrite(uint8_t pin, uint8_t val) { (void)pin; (void)val; }
  #define OUTPUT 1
  #define HIGH 1
  #define LOW 0
#endif

HapticsLedManager::HapticsLedManager()
  : _pinGreen(PIN_LED_GREEN),
    _pinAmber(PIN_LED_AMBER),
    _pinRed(PIN_LED_RED),
    _pinHaptic(PIN_HAPTIC_MOTOR),
    _ledPattern(LED_PATTERN_OFF),
    _hapticPattern(HAPTIC_PATTERN_OFF),
    _lastLedUpdate(0),
    _lastHapticUpdate(0),
    _ledState(false),
    _hapticState(false),
    _burstIndex(0) {}

void HapticsLedManager::init(uint8_t pinGreen, uint8_t pinAmber, uint8_t pinRed, uint8_t pinHaptic) {
  _pinGreen = pinGreen;
  _pinAmber = pinAmber;
  _pinRed = pinRed;
  _pinHaptic = pinHaptic;

  pinMode(_pinGreen, OUTPUT);
  pinMode(_pinAmber, OUTPUT);
  pinMode(_pinRed, OUTPUT);
  pinMode(_pinHaptic, OUTPUT);

  digitalWrite(_pinGreen, LOW);
  digitalWrite(_pinAmber, LOW);
  digitalWrite(_pinRed, LOW);
  digitalWrite(_pinHaptic, LOW);
}

void HapticsLedManager::setLedPattern(LedPattern_t pattern) {
  _ledPattern = pattern;
  _ledState = false;
  _lastLedUpdate = 0;
  // Turn all off initially
  digitalWrite(_pinGreen, LOW);
  digitalWrite(_pinAmber, LOW);
  digitalWrite(_pinRed, LOW);
}

void HapticsLedManager::setHapticPattern(HapticPattern_t pattern) {
  _hapticPattern = pattern;
  _hapticState = false;
  _lastHapticUpdate = 0;
  _burstIndex = 0;
  digitalWrite(_pinHaptic, LOW);
}

void HapticsLedManager::update(uint32_t currentMillis) {
  // =========================================================================
  // 1. LED PATTERN GENERATOR
  // =========================================================================
  switch (_ledPattern) {
    case LED_PATTERN_PULSING_GREEN:
      // Gentle pulse: 100ms on, 2900ms off (3s cycle)
      if (_ledState && (currentMillis - _lastLedUpdate >= 100)) {
        _ledState = false;
        _lastLedUpdate = currentMillis;
        digitalWrite(_pinGreen, LOW);
      } else if (!_ledState && (currentMillis - _lastLedUpdate >= 2900)) {
        _ledState = true;
        _lastLedUpdate = currentMillis;
        digitalWrite(_pinGreen, HIGH);
      }
      break;

    case LED_PATTERN_FLASHING_RED:
      // Rapid emergency flash: 150ms on, 150ms off
      if (currentMillis - _lastLedUpdate >= 150) {
        _ledState = !_ledState;
        _lastLedUpdate = currentMillis;
        digitalWrite(_pinRed, _ledState ? HIGH : LOW);
        digitalWrite(_pinGreen, LOW);
        digitalWrite(_pinAmber, LOW);
      }
      break;

    case LED_PATTERN_STROBE_AMBER:
      // Caution strobe: 250ms on, 250ms off
      if (currentMillis - _lastLedUpdate >= 250) {
        _ledState = !_ledState;
        _lastLedUpdate = currentMillis;
        digitalWrite(_pinAmber, _ledState ? HIGH : LOW);
        digitalWrite(_pinGreen, LOW);
        digitalWrite(_pinRed, LOW);
      }
      break;

    case LED_PATTERN_RAPID_CYAN:
      // Rescue assistance dispatched: Green + Amber alternate rapid blink
      if (currentMillis - _lastLedUpdate >= 100) {
        _ledState = !_ledState;
        _lastLedUpdate = currentMillis;
        digitalWrite(_pinGreen, _ledState ? HIGH : LOW);
        digitalWrite(_pinAmber, _ledState ? LOW : HIGH);
        digitalWrite(_pinRed, LOW);
      }
      break;

    case LED_PATTERN_OFF:
    default:
      digitalWrite(_pinGreen, LOW);
      digitalWrite(_pinAmber, LOW);
      digitalWrite(_pinRed, LOW);
      break;
  }

  // =========================================================================
  // 2. HAPTIC VIBRATION MOTOR GENERATOR
  // =========================================================================
  switch (_hapticPattern) {
    case HAPTIC_PATTERN_SHORT_PULSE:
      // Single short pulse for 250ms then shuts off
      if (!_hapticState && _lastHapticUpdate == 0) {
        _hapticState = true;
        _lastHapticUpdate = currentMillis;
        digitalWrite(_pinHaptic, HIGH);
      } else if (_hapticState && (currentMillis - _lastHapticUpdate >= 250)) {
        _hapticState = false;
        _hapticPattern = HAPTIC_PATTERN_OFF;
        digitalWrite(_pinHaptic, LOW);
      }
      break;

    case HAPTIC_PATTERN_PERSISTENT_ALARM:
      // 500ms on, 500ms off repeating
      if (currentMillis - _lastHapticUpdate >= 500) {
        _hapticState = !_hapticState;
        _lastHapticUpdate = currentMillis;
        digitalWrite(_pinHaptic, _hapticState ? HIGH : LOW);
      }
      break;

    case HAPTIC_PATTERN_CADENCE_BURST:
      // Triple burst (150ms on, 100ms off x 3), then 1000ms pause
      if (_burstIndex < 6) {
        uint32_t stepDuration = (_burstIndex % 2 == 0) ? 150 : 100;
        if (currentMillis - _lastHapticUpdate >= stepDuration) {
          _burstIndex++;
          _lastHapticUpdate = currentMillis;
          digitalWrite(_pinHaptic, (_burstIndex % 2 == 1) ? HIGH : LOW);
        }
      } else {
        digitalWrite(_pinHaptic, LOW);
        if (currentMillis - _lastHapticUpdate >= 1000) {
          _burstIndex = 0;
          _lastHapticUpdate = currentMillis;
        }
      }
      break;

    case HAPTIC_PATTERN_OFF:
    default:
      digitalWrite(_pinHaptic, LOW);
      break;
  }
}

