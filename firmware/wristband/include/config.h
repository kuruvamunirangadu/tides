/**
 * config.h
 * 
 * TIDES Safety Band — Physical Hardware Firmware Configuration
 * Track B — Phase 3: Physical Safety Band Prototype
 * Target Hardware: ESP32-S3 + Semtech SX1262 LoRa Transceiver
 */

#pragma once

#include <stdint.h>

// ==============================================================================
// 1. DEVICE IDENTIFICATION & HARDWARE REVISION
// ==============================================================================
#define DEVICE_HARDWARE_MODEL       "TSB-HW-01"
#define DEFAULT_DEVICE_ID           "HW-WB-001"
#define FIRMWARE_VERSION_MAJOR      1
#define FIRMWARE_VERSION_MINOR      0
#define FIRMWARE_VERSION_PATCH      0
#define FIRMWARE_BUILD_STRING       "TSB-1.0.0-IN865"

// ==============================================================================
// 2. PIN ASSIGNMENTS (ESP32-S3)
// ==============================================================================
// Physical SOS & User Input
#define PIN_BUTTON_SOS              4      // Momentary tactile switch (active LOW)

// Visual Indicators (RGB LED / Discrete LEDs)
#define PIN_LED_GREEN               1      // Safe / Ready indicator
#define PIN_LED_AMBER               6      // Caution / Localized Warning indicator
#define PIN_LED_RED                 5      // Active SOS Distress indicator

// Haptic Vibration Motor Driver
#define PIN_HAPTIC_MOTOR            2      // Gate of N-Channel MOSFET driver

// Battery ADC Voltage Monitor
#define PIN_BATTERY_ADC             3      // Resistive divider (1/2 Vbat)

// Semtech SX1262 LoRa SPI Bus & Control Lines
#define PIN_LORA_SCK                12
#define PIN_LORA_MISO               13
#define PIN_LORA_MOSI               11
#define PIN_LORA_NSS                10     // Chip Select
#define PIN_LORA_RST                8      // Hardware Reset
#define PIN_LORA_BUSY               7      // Busy status indicator
#define PIN_LORA_DIO1               9      // Interrupt line for RX/TX completion

// ==============================================================================
// 3. WIRELESS LORA RF PARAMETERS (IN865 Spectrum Compliance)
// ==============================================================================
#define LORA_FREQUENCY_HZ           865200000UL // 865.2 MHz (Channel 1, de-licensed in India)
#define LORA_FALLBACK_FREQ_HZ       865500000UL // 865.5 MHz (Channel 2)
#define LORA_BANDWIDTH_KHZ          125.0f      // 125 kHz
#define LORA_SPREADING_FACTOR       7           // SF7 (Fast time-on-air ~72ms)
#define LORA_CODING_RATE            5           // 4/5
#define LORA_SYNC_WORD              0x12        // Private TIDES network sync word
#define LORA_TX_POWER_DBM           22          // Max allowable +22 dBm for coastal penetration
#define LORA_PREAMBLE_LENGTH        8           // Standard 8 symbols

// ==============================================================================
// 4. TIMING & DEBOUNCE CONSTANTS
// ==============================================================================
#define BUTTON_DEBOUNCE_MS          50          // Noise immunity debounce threshold
#define BUTTON_SOS_HOLD_TIME_MS     1200        // 1.2s sustained press to confirm distress (prevents accidental wave trigger)
#define BUTTON_DOUBLE_TAP_MAX_GAP   500         // Max interval between clicks for Warning Acknowledgment
#define SOS_RETRANSMIT_INTERVAL_MS  10000       // Retransmit SOS packet every 10s while active
#define HEARTBEAT_INTERVAL_MS       60000       // Send telemetry heartbeat every 60s during standby
#define DOWNLINK_RX_WINDOW_MS       2500        // Open RX window for 2.5s immediately following uplink

