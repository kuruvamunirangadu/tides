/**
 * packet_types.h
 * 
 * TIDES Safety Band — Physical Binary RF Wire Protocol Specification
 * Compact, robust, endian-safe binary payloads for Sub-GHz LoRa transmission.
 */

#pragma once

#include <stdint.h>

#pragma pack(push, 1)

#define TIDES_PACKET_MAGIC_0        0x54  // 'T'
#define TIDES_PACKET_MAGIC_1        0x49  // 'I'
#define TIDES_PROTOCOL_VERSION      0x01

// Message Types
typedef enum {
  MSG_TYPE_SOS_TRIGGER      = 0x01, // Swimmer initiated emergency SOS distress
  MSG_TYPE_HEARTBEAT        = 0x02, // Periodic routine telemetry & battery health
  MSG_TYPE_SOS_CANCEL       = 0x03, // Swimmer reset / operator cleared distress
  MSG_TYPE_WARNING_ACK      = 0x04, // Swimmer pressed acknowledge button for warning
  
  // Downlink Messages (Gateway -> Wristband)
  MSG_TYPE_WARNING_DOWNLINK = 0x81, // Localized hazard warning dispatch
  MSG_TYPE_GATEWAY_ACK      = 0x82, // Gateway receipt acknowledgement of SOS
} TidesMessageType_t;

// Warning Categories for Downlinks
typedef enum {
  WARN_CAT_ADVISORY         = 0x01, // Informational (e.g. high tide approaching)
  WARN_CAT_CAUTION          = 0x02, // Proximity warning (rip current nearby)
  WARN_CAT_EVACUATE_ZONE    = 0x03, // Immediate water exit directive
  WARN_CAT_EMERGENCY        = 0x04, // Critical life-safety incident in vicinity
} TidesWarningCategory_t;

// Uplink Packet: Transmitted from Physical Wristband to Coastal Gateway
typedef struct {
  uint8_t   magic[2];             // 0x54, 0x49 ('TI')
  uint8_t   version;              // Protocol version (0x01)
  uint8_t   msgType;              // TidesMessageType_t
  char      deviceId[12];         // Null-terminated device identifier (e.g. "HW-WB-001\0")
  uint32_t  sequenceNumber;       // Monotonically increasing counter (replay protection)
  uint64_t  deviceTimestampMs;    // Internal RTC / uptime timestamp in milliseconds
  uint16_t  batteryMillivolts;    // Measured cell voltage (e.g. 3920 mV)
  uint8_t   batteryPercent;       // Computed battery percentage (0 - 100%)
  uint8_t   statusFlags;          // Bit 0: isSosActive | Bit 1: isLowBattery | Bit 2: isWaterImmersed
  uint8_t   hmacSignature[8];     // Truncated HMAC-SHA256 authentication tag
  uint16_t  crc16;                // CCITT-FALSE CRC16 checksum
} TidesUplinkPacket_t;

// Downlink Packet: Transmitted from Coastal Gateway to Physical Wristband
typedef struct {
  uint8_t   magic[2];             // 0x54, 0x49 ('TI')
  uint8_t   version;              // Protocol version (0x01)
  uint8_t   msgType;              // MSG_TYPE_WARNING_DOWNLINK or MSG_TYPE_GATEWAY_ACK
  char      targetDeviceId[12];   // Destination device ID
  char      warningId[16];        // Unique identifier of warning or incident
  uint8_t   category;             // TidesWarningCategory_t
  uint8_t   hapticPattern;        // 1: SHORT_PULSE, 2: PERSISTENT_ALARM, 3: CADENCE_BURST
  uint8_t   ledPattern;           // 1: PULSING_GREEN, 2: FLASHING_RED, 3: STROBE_AMBER, 4: RAPID_CYAN
  uint32_t  expiresAtSec;         // Warning expiration timestamp
  uint8_t   hmacSignature[8];     // Gateway HMAC-SHA256 signature
  uint16_t  crc16;                // CCITT-FALSE CRC16 checksum
} TidesDownlinkPacket_t;

#pragma pack(pop)

