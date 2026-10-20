/**
 * battery_monitor.h
 * 
 * ADC battery voltage sampling and capacity estimation for 3.7V Li-Po cells.
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

class BatteryMonitor {
public:
  BatteryMonitor();
  void init(uint8_t pinAdc);
  void update(uint32_t currentMillis);

  uint16_t getVoltageMv() const { return _lastVoltageMv; }
  uint8_t getPercent() const { return _lastPercent; }
  bool isLowBattery() const { return _lastPercent <= 20; }
  bool isCriticalBattery() const { return _lastPercent <= 10; }

private:
  uint8_t _pinAdc;
  uint32_t _lastSampleTime;
  uint16_t _lastVoltageMv;
  uint8_t _lastPercent;
  
  // Moving average ring buffer
  static const uint8_t FILTER_SAMPLES = 8;
  uint16_t _samples[FILTER_SAMPLES];
  uint8_t _sampleIndex;

  uint16_t readRawAdcVoltageMv();
  uint8_t calculatePercentage(uint16_t mv);
};

