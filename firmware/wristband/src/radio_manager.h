/**
 * radio_manager.h
 * 
 * Semtech SX1262 LoRa RF transceiver manager for physical TIDES wristband.
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "../include/packet_types.h"

typedef void (*DownlinkCallback_t)(const TidesDownlinkPacket_t* packet);

class RadioManager {
public:
  RadioManager();
  bool init(const char* deviceId, DownlinkCallback_t downlinkCb);
  
  bool sendSOSTrigger(uint32_t seq, uint64_t timestampMs, uint16_t vbatMv, uint8_t vbatPct);
  bool sendHeartbeat(uint32_t seq, uint64_t timestampMs, uint16_t vbatMv, uint8_t vbatPct);
  bool sendSOSCancel(uint32_t seq, uint64_t timestampMs);
  bool sendWarningAck(const char* warningId, uint32_t seq, uint64_t timestampMs);

  void update(uint32_t currentMillis);

  static uint16_t calculateCRC16(const uint8_t* data, size_t length);
  static void computeHMAC(const uint8_t* payload, size_t len, uint8_t* outHmac8);

private:
  char _deviceId[12];
  DownlinkCallback_t _downlinkCb;
  bool _isInitialized;
  uint32_t _rxWindowEndTime;
  bool _inRxWindow;

  bool transmitRaw(const uint8_t* buffer, size_t len);
  void checkForDownlink();
};

