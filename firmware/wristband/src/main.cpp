/**
 * main.cpp
 * 
 * TIDES Safety Band — Physical Hardware Firmware Main Application
 * Track B — Phase 3: Physical Safety Band Prototype
 * Target: ESP32-S3 + SX1262 LoRa
 */

#include "../include/config.h"
#include "../include/packet_types.h"
#include "button_manager.h"
#include "haptics_led.h"
#include "battery_monitor.h"
#include "radio_manager.h"

#if defined(ARDUINO) || defined(ESP_PLATFORM)
  #include <Arduino.h>
#else
  #include <stdio.h>
  #include <chrono>
  static uint32_t millis() {
    using namespace std::chrono;
    return (uint32_t)duration_cast<milliseconds>(steady_clock::now().time_since_epoch()).count();
  }
#endif

// System States
typedef enum {
  SYSTEM_STATE_BOOT = 0,
  SYSTEM_STATE_READY,             // Pulsing green, listening/heartbeat
  SYSTEM_STATE_SOS_ACTIVE,        // Flashing red, persistent alarm, periodic TX
  SYSTEM_STATE_WARNING_ALERT,     // Strobe amber, cadence burst or short pulse
} SystemState_t;

// Singletons / Modules
static ButtonManager      gButton;
static HapticsLedManager  gHapticsLed;
static BatteryMonitor     gBattery;
static RadioManager       gRadio;

static SystemState_t      gSystemState = SYSTEM_STATE_BOOT;
static uint32_t           gSequenceCounter = 1;
static uint32_t           gLastSosTxTime = 0;
static uint32_t           gLastHeartbeatTime = 0;
static char               gCurrentWarningId[16] = {0};

// Forward declarations
static void onButtonClicked(ButtonEventType_t event);
static void onDownlinkReceived(const TidesDownlinkPacket_t* packet);

void setup() {
#if defined(ARDUINO) || defined(ESP_PLATFORM)
  Serial.begin(115200);
  delay(100);
#endif

  // 1. Initialize Visual & Haptic Indicators
  gHapticsLed.init(PIN_LED_GREEN, PIN_LED_AMBER, PIN_LED_RED, PIN_HAPTIC_MOTOR);
  
  // Power-on self-test blink (Green -> Amber -> Red -> Green)
  gHapticsLed.setLedPattern(LED_PATTERN_PULSING_GREEN);
  gHapticsLed.setHapticPattern(HAPTIC_PATTERN_SHORT_PULSE);

  // 2. Initialize Battery Voltage Monitor
  gBattery.init(PIN_BATTERY_ADC);

  // 3. Initialize Physical SOS Button
  gButton.init(PIN_BUTTON_SOS, onButtonClicked);

  // 4. Initialize LoRa Radio Transceiver
  gRadio.init(DEFAULT_DEVICE_ID, onDownlinkReceived);

  // 5. Transition to Ready Monitoring
  gSystemState = SYSTEM_STATE_READY;
}

void loop() {
  uint32_t now = millis();

  // Run subsystem updates
  gButton.update(now);
  gHapticsLed.update(now);
  gBattery.update(now);
  gRadio.update(now);

  // State Machine Handling
  switch (gSystemState) {
    case SYSTEM_STATE_READY:
      // Periodic routine heartbeat (every 60s)
      if (now - gLastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
        gLastHeartbeatTime = now;
        gRadio.sendHeartbeat(
          gSequenceCounter++,
          now,
          gBattery.getVoltageMv(),
          gBattery.getPercent()
        );
      }
      break;

    case SYSTEM_STATE_SOS_ACTIVE:
      // Re-transmit SOS packet every 10s while active
      if (now - gLastSosTxTime >= SOS_RETRANSMIT_INTERVAL_MS) {
        gLastSosTxTime = now;
        gRadio.sendSOSTrigger(
          gSequenceCounter++,
          now,
          gBattery.getVoltageMv(),
          gBattery.getPercent()
        );
      }
      break;

    case SYSTEM_STATE_WARNING_ALERT:
      // Warning alert active, awaiting user acknowledgment or expiration
      break;

    default:
      break;
  }
}

static void onButtonClicked(ButtonEventType_t event) {
  uint32_t now = millis();

  switch (event) {
    case BUTTON_EVENT_SOS_TRIGGERED:
      // Physical button held > 1.2s: Confirmed SOS distress
      gSystemState = SYSTEM_STATE_SOS_ACTIVE;
      gLastSosTxTime = now;

      // Visual & Haptic Alarm
      gHapticsLed.setLedPattern(LED_PATTERN_FLASHING_RED);
      gHapticsLed.setHapticPattern(HAPTIC_PATTERN_PERSISTENT_ALARM);

      // Transmit immediate SOS uplink packet
      gRadio.sendSOSTrigger(
        gSequenceCounter++,
        now,
        gBattery.getVoltageMv(),
        gBattery.getPercent()
      );
      break;

    case BUTTON_EVENT_WARNING_ACKNOWLEDGED:
      // Physical double-tap: Swimmer acknowledges localized warning
      if (gSystemState == SYSTEM_STATE_WARNING_ALERT) {
        gSystemState = SYSTEM_STATE_READY;
        gHapticsLed.setHapticPattern(HAPTIC_PATTERN_OFF);
        gHapticsLed.setLedPattern(LED_PATTERN_PULSING_GREEN);

        // Transmit acknowledgment downlink reply
        gRadio.sendWarningAck(gCurrentWarningId, gSequenceCounter++, now);
      }
      break;

    case BUTTON_EVENT_SHORT_PRESS:
      // Single tap: Battery check feedback
      if (gSystemState == SYSTEM_STATE_READY) {
        // Brief pulse
        gHapticsLed.setHapticPattern(HAPTIC_PATTERN_SHORT_PULSE);
      }
      break;

    default:
      break;
  }
}

static void onDownlinkReceived(const TidesDownlinkPacket_t* packet) {
  if (!packet) return;

  uint32_t now = millis();

  if (packet->msgType == MSG_TYPE_GATEWAY_ACK) {
    // Gateway acknowledged our SOS distress
    if (gSystemState == SYSTEM_STATE_SOS_ACTIVE) {
      // Rapid cyan pattern indicates lifeguard/drone has been notified
      gHapticsLed.setLedPattern(LED_PATTERN_RAPID_CYAN);
    }
  } else if (packet->msgType == MSG_TYPE_WARNING_DOWNLINK) {
    // Received localized hazard warning
    if (gSystemState != SYSTEM_STATE_SOS_ACTIVE) {
      // Don't downgrade SOS to caution
      gSystemState = SYSTEM_STATE_WARNING_ALERT;
      strncpy(gCurrentWarningId, packet->warningId, sizeof(gCurrentWarningId) - 1);

      if (packet->category == WARN_CAT_EVACUATE_ZONE || packet->category == WARN_CAT_EMERGENCY) {
        gHapticsLed.setLedPattern(LED_PATTERN_FLASHING_RED);
        gHapticsLed.setHapticPattern(HAPTIC_PATTERN_CADENCE_BURST);
      } else {
        gHapticsLed.setLedPattern(LED_PATTERN_STROBE_AMBER);
        gHapticsLed.setHapticPattern(HAPTIC_PATTERN_SHORT_PULSE);
      }
    }
  }
}

