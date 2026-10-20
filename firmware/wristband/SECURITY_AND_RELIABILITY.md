# TIDES Safety Band — Security Architecture & Reliability Specification
**Track B — Phase 3: Physical Safety Band and Beach Gateway Prototype**

---

## 1. Threat Model & Mitigation Matrix

| Threat Vector | Description / Attack Scenario | Potential Impact | Hardware & Protocol Mitigation |
|---|---|---|---|
| **Replay Attacks** | Adversary captures a valid SOS radio transmission and retransmits it later to trigger false alarms. | False emergency deployments, responder exhaustion, alert fatigue. | **Strict Monotonic Sequence Numbers & 20s Timestamp Windows**: Gateway tracks the last received sequence number for each registered device ID; any packet with a stale timestamp ($> 5\text{ min}$) or non-increasing sequence number is rejected. |
| **RF Packet Spoofing** | Malicious actor crafts arbitrary packets claiming to be a registered wristband in distress. | Unauthorized incident creation, emergency resource diversion. | **HMAC-SHA256 Cryptographic Authentication**: Every packet includes an 8-byte authentication tag calculated over the header, sequence, and payload using a pre-shared device secret key. Packets failing signature verification are silently discarded and logged as security anomalies. |
| **RF Jamming / Noise** | Incidental ISM band interference or deliberate carrier wave jamming on 865.2 MHz. | Loss of SOS transmissions during emergencies. | **Dual-Channel Frequency Agility & LoRa Spread Spectrum Processing Gain**: Semtech SX1262 LoRa modulation operates with $-12\text{ dB}$ SNR under the thermal noise floor. If Channel 1 ($865.2\text{ MHz}$) experiences packet loss, firmware automatically falls back to Channel 2 ($865.5\text{ MHz}$) after 2 unacknowledged attempts. |
| **Backend Outage / Gateway Disconnect** | Coastal fiber or cellular backhaul fails while swimmers are active. | Lost emergency distress alerts. | **Resilient Non-Volatile Gateway Queue**: The gateway maintains an in-memory ring buffer (up to 1,000 events) and appends every accepted packet to an encrypted local NVMe log. When the backend reconnects, buffered events are flushed in chronological order without duplicate incident creation. |
| **Buffer Overflow / Memory Exhaustion** | Flooding attack or runaway device transmission overwhelming gateway memory. | Gateway service crash, denial of service. | **Bounded Ring Buffers & Rate Limiting**: Gateway limits incoming packets per device to a maximum of 1 packet per second, with fixed-size struct queues and zero dynamic heap allocation in time-critical paths. |

---

## 2. Authentication & Integrity Wire Protocol

```
  0               1               2               3
  0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 |      'T'      |      'I'      |    Version    |   Msg Type    |
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 |                  Device ID (12 bytes ASCII)                   |
 |                             ...                               |
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 |                     Sequence Number (32-bit)                  |
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 |               Device Timestamp (64-bit Epoch ms)              |
 |                             ...                               |
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 |        Vbat (mV, 16-bit)      | Bat Pct (8-bit| Status Flags  |
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 |               HMAC-SHA256 Truncated Tag (8 bytes)             |
 |                             ...                               |
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 |           CCITT-FALSE CRC16 Checksum (16-bit)                 |
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### Signature Verification Algorithm
$$\text{HMAC} = \text{Truncate}_{64}\left(\text{HMAC-SHA256}\left(K_{\text{device}}, \text{Magic} \parallel \text{Version} \parallel \text{MsgType} \parallel \text{DeviceID} \parallel \text{Seq} \parallel \text{Timestamp} \parallel \text{Payload}\right)\right)$$
Where $K_{\text{device}}$ is a 128-bit symmetric key provisioned into the ESP32-S3 eFuse blocks during factory bench programming.

