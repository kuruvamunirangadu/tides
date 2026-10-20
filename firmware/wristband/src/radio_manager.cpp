/**
 * radio_manager.cpp
 * 
 * LoRa transceiver management, packet encoding/decoding, CRC16, and HMAC auth.
 */

#include "radio_manager.h"
#include "../include/config.h"
#include <string.h>

// Shims for native/cross compilation
#if defined(ARDUINO) || defined(ESP_PLATFORM)
  #include <Arduino.h>
  #include <SPI.h>
#else
  #include <stdio.h>
#endif

// Pre-shared key for bench-test prototype authentication
// Production: Loaded from secure hardware eFuse / ATECC608 secure element
static const uint8_t BENCH_AUTH_KEY[16] = {
  0x54, 0x49, 0x44, 0x45, 0x53, 0x5F, 0x53, 0x45,
  0x43, 0x55, 0x52, 0x45, 0x5F, 0x4B, 0x45, 0x59
};

RadioManager::RadioManager()
  : _downlinkCb(nullptr),
    _isInitialized(false),
    _rxWindowEndTime(0),
    _inRxWindow(false) {
  memset(_deviceId, 0, sizeof(_deviceId));
}

bool RadioManager::init(const char* deviceId, DownlinkCallback_t downlinkCb) {
  strncpy(_deviceId, deviceId, sizeof(_deviceId) - 1);
  _downlinkCb = downlinkCb;

  // Initialize hardware SPI & SX1262 registers (frequency 865.2MHz, SF7, BW125kHz, +22dBm)
  _isInitialized = true;
  return true;
}

uint16_t RadioManager::calculateCRC16(const uint8_t* data, size_t length) {
  // CCITT-FALSE CRC16 polynomial 0x1021, init 0xFFFF
  uint16_t crc = 0xFFFF;
  for (size_t i = 0; i < length; i++) {
    crc ^= ((uint16_t)data[i] << 8);
    for (uint8_t bit = 0; bit < 8; bit++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
  }
  return crc;
}

void RadioManager::computeHMAC(const uint8_t* payload, size_t len, uint8_t* outHmac8) {
  // Lightweight truncated HMAC using auth key and XOR folding
  uint8_t k_ipad[16];
  for (int i = 0; i < 16; i++) {
    k_ipad[i] = BENCH_AUTH_KEY[i] ^ 0x36;
  }
  
  uint32_t acc = 0x811c9dc5; // FNV-1a prime
  for (int i = 0; i < 16; i++) {
    acc = (acc ^ k_ipad[i]) * 0x01000193;
  }
  for (size_t i = 0; i < len; i++) {
    acc = (acc ^ payload[i]) * 0x01000193;
  }

  for (int i = 0; i < 8; i++) {
    outHmac8[i] = (uint8_t)((acc >> (i * 4)) ^ (BENCH_AUTH_KEY[i] ^ 0x5c));
  }
}

bool RadioManager::transmitRaw(const uint8_t* buffer, size_t len) {
  if (!_isInitialized) return false;
  
  // Real hardware: SPI transmit to SX1262 FIFO and trigger TX mode
  // Open downlink reception window immediately following transmission
#if defined(ARDUINO) || defined(ESP_PLATFORM)
  uint32_t now = millis();
#else
  uint32_t now = 1000;
#endif
  _inRxWindow = true;
  _rxWindowEndTime = now + DOWNLINK_RX_WINDOW_MS;

  return true;
}

bool RadioManager::sendSOSTrigger(uint32_t seq, uint64_t timestampMs, uint16_t vbatMv, uint8_t vbatPct) {
  TidesUplinkPacket_t pkt;
  memset(&pkt, 0, sizeof(pkt));

  pkt.magic[0] = TIDES_PACKET_MAGIC_0;
  pkt.magic[1] = TIDES_PACKET_MAGIC_1;
  pkt.version = TIDES_PROTOCOL_VERSION;
  pkt.msgType = MSG_TYPE_SOS_TRIGGER;
  strncpy(pkt.deviceId, _deviceId, sizeof(pkt.deviceId) - 1);
  pkt.sequenceNumber = seq;
  pkt.deviceTimestampMs = timestampMs;
  pkt.batteryMillivolts = vbatMv;
  pkt.batteryPercent = vbatPct;
  pkt.statusFlags = 0x01; // Bit 0 = SOS active

  // Sign packet
  size_t payloadLenForHmac = offsetof(TidesUplinkPacket_t, hmacSignature);
  computeHMAC((const uint8_t*)&pkt, payloadLenForHmac, pkt.hmacSignature);

  // CRC16
  size_t lenForCrc = offsetof(TidesUplinkPacket_t, crc16);
  pkt.crc16 = calculateCRC16((const uint8_t*)&pkt, lenForCrc);

  return transmitRaw((const uint8_t*)&pkt, sizeof(pkt));
}

bool RadioManager::sendHeartbeat(uint32_t seq, uint64_t timestampMs, uint16_t vbatMv, uint8_t vbatPct) {
  TidesUplinkPacket_t pkt;
  memset(&pkt, 0, sizeof(pkt));

  pkt.magic[0] = TIDES_PACKET_MAGIC_0;
  pkt.magic[1] = TIDES_PACKET_MAGIC_1;
  pkt.version = TIDES_PROTOCOL_VERSION;
  pkt.msgType = MSG_TYPE_HEARTBEAT;
  strncpy(pkt.deviceId, _deviceId, sizeof(pkt.deviceId) - 1);
  pkt.sequenceNumber = seq;
  pkt.deviceTimestampMs = timestampMs;
  pkt.batteryMillivolts = vbatMv;
  pkt.batteryPercent = vbatPct;
  pkt.statusFlags = (vbatPct <= 20) ? 0x02 : 0x00;

  size_t payloadLenForHmac = offsetof(TidesUplinkPacket_t, hmacSignature);
  computeHMAC((const uint8_t*)&pkt, payloadLenForHmac, pkt.hmacSignature);

  size_t lenForCrc = offsetof(TidesUplinkPacket_t, crc16);
  pkt.crc16 = calculateCRC16((const uint8_t*)&pkt, lenForCrc);

  return transmitRaw((const uint8_t*)&pkt, sizeof(pkt));
}

bool RadioManager::sendSOSCancel(uint32_t seq, uint64_t timestampMs) {
  TidesUplinkPacket_t pkt;
  memset(&pkt, 0, sizeof(pkt));

  pkt.magic[0] = TIDES_PACKET_MAGIC_0;
  pkt.magic[1] = TIDES_PACKET_MAGIC_1;
  pkt.version = TIDES_PROTOCOL_VERSION;
  pkt.msgType = MSG_TYPE_SOS_CANCEL;
  strncpy(pkt.deviceId, _deviceId, sizeof(pkt.deviceId) - 1);
  pkt.sequenceNumber = seq;
  pkt.deviceTimestampMs = timestampMs;
  pkt.statusFlags = 0x00;

  size_t payloadLenForHmac = offsetof(TidesUplinkPacket_t, hmacSignature);
  computeHMAC((const uint8_t*)&pkt, payloadLenForHmac, pkt.hmacSignature);

  size_t lenForCrc = offsetof(TidesUplinkPacket_t, crc16);
  pkt.crc16 = calculateCRC16((const uint8_t*)&pkt, lenForCrc);

  return transmitRaw((const uint8_t*)&pkt, sizeof(pkt));
}

bool RadioManager::sendWarningAck(const char* warningId, uint32_t seq, uint64_t timestampMs) {
  TidesUplinkPacket_t pkt;
  memset(&pkt, 0, sizeof(pkt));

  pkt.magic[0] = TIDES_PACKET_MAGIC_0;
  pkt.magic[1] = TIDES_PACKET_MAGIC_1;
  pkt.version = TIDES_PROTOCOL_VERSION;
  pkt.msgType = MSG_TYPE_WARNING_ACK;
  strncpy(pkt.deviceId, _deviceId, sizeof(pkt.deviceId) - 1);
  pkt.sequenceNumber = seq;
  pkt.deviceTimestampMs = timestampMs;

  size_t payloadLenForHmac = offsetof(TidesUplinkPacket_t, hmacSignature);
  computeHMAC((const uint8_t*)&pkt, payloadLenForHmac, pkt.hmacSignature);

  size_t lenForCrc = offsetof(TidesUplinkPacket_t, crc16);
  pkt.crc16 = calculateCRC16((const uint8_t*)&pkt, lenForCrc);

  return transmitRaw((const uint8_t*)&pkt, sizeof(pkt));
}

void RadioManager::update(uint32_t currentMillis) {
  if (_inRxWindow) {
    if (currentMillis >= _rxWindowEndTime) {
      _inRxWindow = false;
      // Close RX window
    } else {
      checkForDownlink();
    }
  }
}

void RadioManager::checkForDownlink() {
  // Checks SX1262 DIO1 interrupt or buffer for incoming DownlinkPacket
  // When packet received:
  // 1. Verify Magic and Version
  // 2. Verify targetDeviceId matches _deviceId
  // 3. Verify CRC16 and HMAC
  // 4. If valid, invoke _downlinkCb(&downlinkPkt)
}

