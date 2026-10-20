/**
 * button_manager.cpp
 * 
 * Implementation of physical button debouncing and hold-time verification.
 */

#include "button_manager.h"
#include "../include/config.h"

// Note: For native C++ and cross-compilation testing, provide standard types/shims
#if defined(ARDUINO) || defined(ESP_PLATFORM)
  #include <Arduino.h>
#else
  #include <chrono>
  #define IRAM_ATTR
  static uint32_t millis() {
    using namespace std::chrono;
    return (uint32_t)duration_cast<milliseconds>(steady_clock::now().time_since_epoch()).count();
  }
  static int digitalRead(uint8_t pin) { (void)pin; return 1; }
  static void pinMode(uint8_t pin, int mode) { (void)pin; (void)mode; }
  static void attachInterrupt(uint8_t pin, void (*fn)(void), int mode) { (void)pin; (void)fn; (void)mode; }
  #define INPUT_PULLUP 2
  #define FALLING 1
#endif

volatile bool ButtonManager::_interruptTriggered = false;
volatile uint32_t ButtonManager::_lastInterruptTime = 0;

ButtonManager::ButtonManager()
  : _pin(PIN_BUTTON_SOS),
    _callback(nullptr),
    _lastButtonState(true),
    _pressStartTime(0),
    _sosDispatchedForCurrentPress(false),
    _lastReleaseTime(0),
    _tapCount(0) {}

void IRAM_ATTR ButtonManager::handleInterrupt() {
  _interruptTriggered = true;
  _lastInterruptTime = millis();
}

void ButtonManager::init(uint8_t pin, ButtonCallback_t callback) {
  _pin = pin;
  _callback = callback;
  pinMode(_pin, INPUT_PULLUP);
  attachInterrupt(_pin, ButtonManager::handleInterrupt, FALLING);
}

void ButtonManager::update(uint32_t currentMillis) {
  bool currentReading = (digitalRead(_pin) == 0); // Active LOW -> true when pressed

  // 1. Transition: Button just pressed down
  if (currentReading && !_lastButtonState) {
    _pressStartTime = currentMillis;
    _sosDispatchedForCurrentPress = false;
  }
  
  // 2. Button held down continuously: Check sustained SOS threshold (1.2s)
  if (currentReading && _lastButtonState) {
    if (!_sosDispatchedForCurrentPress && (currentMillis - _pressStartTime >= BUTTON_SOS_HOLD_TIME_MS)) {
      _sosDispatchedForCurrentPress = true;
      _tapCount = 0; // Cancel any tap sequence
      if (_callback) {
        _callback(BUTTON_EVENT_SOS_TRIGGERED);
      }
    }
  }

  // 3. Transition: Button released
  if (!currentReading && _lastButtonState) {
    uint32_t pressDuration = currentMillis - _pressStartTime;

    // If released before 1.2s and duration > 50ms (valid click, not glitch)
    if (!_sosDispatchedForCurrentPress && pressDuration >= BUTTON_DEBOUNCE_MS) {
      _tapCount++;
      _lastReleaseTime = currentMillis;

      if (_tapCount == 2) {
        // Double-tap confirmed
        _tapCount = 0;
        if (_callback) {
          _callback(BUTTON_EVENT_WARNING_ACKNOWLEDGED);
        }
      }
    }
  }

  // 4. Tap timeout: if single tap hasn't been followed by second tap within 500ms
  if (_tapCount == 1 && (currentMillis - _lastReleaseTime > BUTTON_DOUBLE_TAP_MAX_GAP)) {
    _tapCount = 0;
    if (_callback) {
      _callback(BUTTON_EVENT_SHORT_PRESS);
    }
  }

  _lastButtonState = currentReading;
}

