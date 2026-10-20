/**
 * button_manager.h
 * 
 * Interrupt-driven, debounced physical button handler with:
 * - 50ms noise rejection debounce
 * - 1.2s sustained hold threshold for emergency SOS trigger (eliminates wave slap false alarms)
 * - Rapid double-tap detection (<500ms) for warning acknowledgment
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

typedef enum {
  BUTTON_EVENT_NONE = 0,
  BUTTON_EVENT_SOS_TRIGGERED,     // Sustained press > 1.2s
  BUTTON_EVENT_WARNING_ACKNOWLEDGED, // Double tap < 500ms
  BUTTON_EVENT_SHORT_PRESS        // Single quick tap (status query)
} ButtonEventType_t;

typedef void (*ButtonCallback_t)(ButtonEventType_t event);

class ButtonManager {
public:
  ButtonManager();
  void init(uint8_t pin, ButtonCallback_t callback);
  void update(uint32_t currentMillis);
  static void IRAM_ATTR handleInterrupt();

private:
  uint8_t _pin;
  ButtonCallback_t _callback;
  
  static volatile bool _interruptTriggered;
  static volatile uint32_t _lastInterruptTime;
  
  bool _lastButtonState;
  uint32_t _pressStartTime;
  bool _sosDispatchedForCurrentPress;
  
  uint32_t _lastReleaseTime;
  uint8_t _tapCount;
};

