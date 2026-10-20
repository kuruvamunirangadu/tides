/**
 * battery_monitor.cpp
 * 
 * Battery voltage sampling implementation with moving-average filtering.
 */

#include "battery_monitor.h"
#include "../include/config.h"

#if defined(ARDUINO) || defined(ESP_PLATFORM)
  #include <Arduino.h>
#else
  static int analogRead(uint8_t pin) { (void)pin; return 2400; } // Mock ~3.9V
  static void pinMode(uint8_t pin, int mode) { (void)pin; (void)mode; }
  #define INPUT 0
#endif

BatteryMonitor::BatteryMonitor()
  : _pinAdc(PIN_BATTERY_ADC),
    _lastSampleTime(0),
    _lastVoltageMv(3900),
    _lastPercent(80),
    _sampleIndex(0) {
  for (uint8_t i = 0; i < FILTER_SAMPLES; i++) {
    _samples[i] = 3900;
  }
}

void BatteryMonitor::init(uint8_t pinAdc) {
  _pinAdc = pinAdc;
  pinMode(_pinAdc, INPUT);
  // Prime moving average
  for (uint8_t i = 0; i < FILTER_SAMPLES; i++) {
    _samples[i] = readRawAdcVoltageMv();
  }
  _lastVoltageMv = _samples[0];
  _lastPercent = calculatePercentage(_lastVoltageMv);
}

void BatteryMonitor::update(uint32_t currentMillis) {
  // Sample every 5 seconds to minimize ADC current drain
  if (currentMillis - _lastSampleTime >= 5000 || _lastSampleTime == 0) {
    _lastSampleTime = currentMillis;

    _samples[_sampleIndex] = readRawAdcVoltageMv();
    _sampleIndex = (_sampleIndex + 1) % FILTER_SAMPLES;

    uint32_t sum = 0;
    for (uint8_t i = 0; i < FILTER_SAMPLES; i++) {
      sum += _samples[i];
    }
    _lastVoltageMv = (uint16_t)(sum / FILTER_SAMPLES);
    _lastPercent = calculatePercentage(_lastVoltageMv);
  }
}

uint16_t BatteryMonitor::readRawAdcVoltageMv() {
  // ESP32 ADC: 12-bit (0 - 4095) with 11dB attenuation -> ~3.3V full scale
  // Hardware divider: 100k / 100k -> 2:1 division ratio
  uint32_t raw = analogRead(_pinAdc);
  // mV = (raw / 4095.0) * 3300 * 2.0
  uint32_t mv = (raw * 6600) / 4095;
  return (uint16_t)mv;
}

uint8_t BatteryMonitor::calculatePercentage(uint16_t mv) {
  // Standard Li-Po discharge curve
  if (mv >= 4200) return 100;
  if (mv >= 4050) return 90 + ((mv - 4050) * 10) / 150;
  if (mv >= 3950) return 80 + ((mv - 3950) * 10) / 100;
  if (mv >= 3850) return 60 + ((mv - 3850) * 20) / 100;
  if (mv >= 3750) return 40 + ((mv - 3750) * 20) / 100;
  if (mv >= 3650) return 20 + ((mv - 3650) * 20) / 100;
  if (mv >= 3500) return 5 + ((mv - 3500) * 15) / 150;
  if (mv >= 3300) return 1 + ((mv - 3300) * 4) / 200;
  return 0;
}

