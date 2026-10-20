# TIDES Safety Band — Physical Hardware Architecture & Technical Specification
**Track B — Phase 3: Physical Safety Band and Beach Gateway Prototype**
*Site: Rushikonda Beach Coastal Digital Twin Deployment*

---

## 1. Executive Summary & Operational Context

The **TIDES Safety Band (Model: TSB-HW-01)** is a dedicated physical swimmer distress and localized coastal warning prototype.
- **Primary Mission**: Provide beach visitors with an immediate, physical, non-verbal 1-Tap emergency SOS trigger capable of alerting lifeguards and automated rescue drones within seconds, while receiving localized audible/visual/haptic hazard warnings (rip currents, high swell, water evacuations).
- **Critical Operational Reality**: Seawater is an electrolyte with high electrical conductivity ($\sigma \approx 4\text{ to }5\text{ S/m}$) and relative permittivity ($\epsilon_r \approx 80$). RF radiation at 2.4 GHz (Wi-Fi, Bluetooth) experiences catastrophic attenuation exceeding $40\text{ dB/cm}$ under direct immersion. Therefore, the device relies on **Sub-GHz LoRa (865–867 MHz IN865 band in India)** optimized for coastal surface transmission, paired with internal debouncing, battery management, and strict IP68 mechanical sealing.

> [!CAUTION]
> **Bench-Test Prototype Only — Zero Swimmer Deployment Authorization**:
> This prototype is designed strictly for laboratory and controlled coastal bench testing. It does NOT authorize live swimmer deployment until comprehensive hydrostatic immersion testing, marine corrosion certification, and independent lifeguard validation are completed.

---

## 2. Wireless Radio Communication Protocol Evaluation

| Protocol | Frequency | Open Beach Range | Seawater / Spray Penetration | Active Current (TX) | Sleep Current | Latency | Beach Gateway Infrastructure | Suitability Verdict |
|---|---|---|---|---|---|---|---|---|
| **Sub-GHz LoRa (SX1262)** | **865–867 MHz (IN865)** | **1.5 km – 3.0 km** | **High** (Sub-GHz penetrates spray; resilient to Fresnel blockage) | **45–110 mA** (+14 to +22 dBm) | **< 1.5 µA** | **120–280 ms** | 1 Central Gateway covers full 1 km beach | **SELECTED** (Optimal range, low power, open-access spectrum) |
| **Bluetooth Low Energy (BLE 5.2)** | 2.4 GHz ISM | 15 m – 35 m | **Extremely Poor** ($>40\text{ dB/cm}$ loss in water; high human body absorption) | 12–18 mA | < 2 µA | 40–80 ms | Requires dense mesh of towers every 30m | **REJECTED** (Insufficient coastal range & high water absorption) |
| **Wi-Fi (802.11 b/g/n)** | 2.4 GHz | 40 m – 80 m | **Extremely Poor** (severe multipath over wet sand and waves) | 80–180 mA | ~15 µA | 100–300 ms | Multiple high-power APs required | **REJECTED** (High battery drain, short range, connection handshake delay) |
| **Cellular NB-IoT / LTE-M** | 850/900/1800 MHz | Carrier dependent (1–5 km) | **Moderate** (Good outdoor coverage) | 180–350 mA peak | ~3 µA (eDRX/PSM) | 2.5–8.0 s | Relies on commercial telecom towers | **REJECTED** (High latency, recurring SIM subscriptions, antenna complexity) |

### Concrete Selection: Semtech SX1262 LoRa Transceiver (IN865 Band)
- **Carrier Frequency**: $865.200\text{ MHz}$ (Channel 1) / $865.500\text{ MHz}$ (Channel 2).
- **Modulation**: LoRa Spread Spectrum, Spreading Factor $\text{SF} = 7$, Bandwidth $\text{BW} = 125\text{ kHz}$, Coding Rate $\text{CR} = 4/5$.
- **Preamble**: 8 symbols.
- **Link Budget**: $+22\text{ dBm}$ TX power, $-137\text{ dBm}$ sensitivity $\rightarrow 159\text{ dB}$ link budget, ensuring reliable coverage across Rushikonda's 1.2 km curved shoreline.

---

## 3. Component Specification & Bill of Materials (BOM)

| Subsystem | Component | Specifications / Part Number | Pin Assignment (ESP32-S3) | Operating Voltage / Current | Purpose / Justification |
|---|---|---|---|---|---|
| **MCU** | Espressif ESP32-S3-WROOM-1 | Xtensa Dual-Core 32-bit LX7, 240MHz, 8MB Flash, 512KB SRAM, Ultra-Low Power Coprocessor | — | 3.3V / 15µA (Deep Sleep), 35mA (Active CPU) | High computational throughput, hardware AES/SHA engine, low sleep power |
| **LoRa Radio** | Semtech SX1262 Module | Sub-GHz LoRa RF Transceiver, SPI bus, TCXO oscillator for frequency stability ($\pm 0.5\text{ ppm}$) | `SCK: GPIO12`, `MISO: GPIO13`, `MOSI: GPIO11`, `NSS: GPIO10`, `RESET: GPIO8`, `BUSY: GPIO7`, `DIO1: GPIO9` | 3.3V / 110mA (TX @ +22dBm), 4.6mA (RX) | Long-range coastal RF link with low power consumption |
| **SOS Pushbutton** | IP68 Momentary Tactile Switch | Apem / Omron B3SL Sealed Pushbutton with silicone actuator boot, 500k cycle rated | `BUTTON_PIN: GPIO4` (with internal pull-up + 10k external pull-up and 100nF filter) | 3.3V / < 0.3mA during press | Immediate, tactile emergency trigger with hardware debouncing |
| **Status LED** | Common-Anode RGB Diffuse LED (3mm) | Red (625nm), Amber/Orange (590nm), Emerald Green (525nm), high luminous intensity (1200 mcd) | `LED_RED: GPIO5`, `LED_AMBER: GPIO6`, `LED_GREEN: GPIO1` | 3.3V via 330Ω ballast resistors / 15mA per channel | Unambiguous sunlight-visible status indication for the swimmer |
| **Haptic Motor** | Encapsulated 1027 Coin ERM Motor | 10mm diameter, 2.7mm thickness, waterproof sealed enclosure, 12,000 RPM @ 3V | `HAPTIC_PIN: GPIO2` (driven by 2N7002 N-MOSFET with 1N4148 flyback diode) | 3.0V / 75mA active, 0mA idle | High-vibration sensory feedback alerting swimmer even when face is in water |
| **Battery Cell** | Rechargeable Li-Po Pouch Cell | 3.7V nominal, 500mAh capacity, integrated NTC thermistor | `BAT_POS`, `BAT_NEG` | 3.0V – 4.2V / 500mAh (provides ~140 hrs standby, >8 hrs active SOS) | Compact form factor fitting comfortably on wrist |
| **Battery Protection** | DW01A + FS8205A Dual MOSFET | Overcharge cutoff (4.30V), Overdischarge cutoff (2.40V), Overcurrent cutoff (3.2A) | Onboard battery protection circuit | 3.0V – 4.2V / 3µA quiescent current | Essential safety against thermal runaway, short circuit, or deep discharge |
| **LDO Regulator** | TI TPS73633 / Torex XC6206 | 3.3V Ultra-Low Dropout Linear Regulator, 400mA output, 16µA quiescent current | `VOUT: 3.3V rail` | Input: 3.4V – 4.2V, Output: 3.3V $\pm 1\%$ | Clean, ripple-free power supply for ESP32 and SX1262 |
| **Charging Circuit** | Microchip MCP73831 | Linear Li-Po charge management controller configured for 250mA (0.5C charge rate) | Connected to magnetic dock connector | 5.0V USB input / 250mA charge current | Safe, constant-current/constant-voltage battery charging |
| **Charging Interface** | 4-Pin Magnetic Pogo Connector | Gold-plated brass pins, IP68 hermetically sealed with internal Neodymium magnets | `VBUS`, `GND`, `UART_TX`, `UART_RX` | 5.0V / 1A rated, 50mΩ contact resistance | Zero-piercing exterior charge dock eliminating vulnerable USB ports |
| **Enclosure** | SLA/CNC Polycarbonate Case | Custom CAD shell with recessed silicone O-ring gasket, 4x M2.5 marine 316 screws | — | Operating temp: $-10^\circ\text{C}$ to $+60^\circ\text{C}$ | Sealed IP68 housing resisting 1.5m saltwater immersion |

---

## 4. Electrical Pinout & Schematic Interconnect

```
                         ESP32-S3-WROOM-1
                     +----------------------+
                     |                      |
    [3.3V LDO Rail] -| 3V3              GND |- [GND Rail]
                     |                      |
      [10k Pull-up] -| GPIO4 (BUTTON)       |
                     |                      |
 [330R -> Green LED]-| GPIO1 (LED_G)        |
 [330R -> Amber LED]-| GPIO6 (LED_A)        |
   [330R -> Red LED]-| GPIO5 (LED_R)        |
                     |                      |
[2N7002 Gate Driver]-| GPIO2 (HAPTIC)       |
                     |                      |
 [ADC Bat Divider]  -| GPIO3 (BAT_SENSE)    |
                     |                      |
     [SX1262 SCK]   -| GPIO12 (SPI_SCK)     |
     [SX1262 MISO]  -| GPIO13 (SPI_MISO)    |
     [SX1262 MOSI]  -| GPIO11 (SPI_MOSI)    |
     [SX1262 NSS]   -| GPIO10 (SPI_CS)      |
     [SX1262 RST]   -| GPIO8  (RF_RST)      |
     [SX1262 BUSY]  -| GPIO7  (RF_BUSY)     |
     [SX1262 DIO1]  -| GPIO9  (RF_DIO1)     |
                     +----------------------+
```

---

## 5. Current Consumption & Battery Longevity Model

- **Nominal Battery Capacity**: $C = 500\text{ mAh}$ at $3.7\text{ V} \rightarrow 1.85\text{ Wh}$.
- **Operating Modes**:
  1. **Ultra-Low Power Standby (Normal Monitoring)**:
     - ESP32 in deep sleep / ULP timer: $15\text{ µA}$
     - SX1262 in sleep mode: $1.2\text{ µA}$
     - Periodic Heartbeat Uplink (every 60s for 150ms at $+14\text{ dBm}$): $45\text{ mA} \times \frac{0.15\text{ s}}{60\text{ s}} \approx 0.11\text{ mA}$
     - Green LED gentle pulse ($50\text{ ms}$ on every $5\text{ s}$ @ $5\text{ mA}$): $\approx 0.05\text{ mA}$
     - **Average Standby Current**: $I_{\text{standby}} \approx 0.18\text{ mA}$
     - **Standby Duration**: $\frac{500\text{ mAh} \times 0.85\text{ efficiency}}{0.18\text{ mA}} \approx 2,360\text{ hours} \approx \mathbf{98\text{ days}}$.
  2. **Active Emergency SOS Distress State**:
     - Microcontroller active: $30\text{ mA}$
     - Continuous LoRa TX retransmissions (every 10s for 250ms at $+22\text{ dBm}$): $110\text{ mA} \times 0.025 \approx 2.75\text{ mA}$
     - Flashing Red LED (50% duty cycle @ 15mA): $7.5\text{ mA}$
     - Pulsed Haptic Alarm (cadence 0.5s on / 0.5s off @ 75mA): $37.5\text{ mA}$
     - **Average Active SOS Current**: $I_{\text{sos}} \approx 77.75\text{ mA}$
     - **Continuous Active Distress Duration**: $\frac{500\text{ mAh} \times 0.85}{77.75\text{ mA}} \approx \mathbf{5.46\text{ hours}}$ (ample time for coastal lifeguard extraction).

---

## 6. Beach Gateway Hardware Architecture

The **TIDES Beach Gateway (Model: TBG-GW-01)** is an outdoor-rated industrial LoRa gateway deployed at the central Rushikonda Watchtower:
- **Core Processing Unit**: Raspberry Pi 4 Model B (4GB RAM) running hardened Debian Linux with systemd watchdog.
- **LoRa Concentrator**: Waveshare / Seeed Studio SX1302 8-channel full-duplex LoRaWAN / Direct-LoRa Gateway HAT.
- **Antenna**: $5.8\text{ dBi}$ omnidirectional fiberglass collinear antenna (Height: 80cm, N-Type connector, low-loss LMR-400 coaxial cable).
- **Network Backhaul**: Dual redundant uplink — Primary via Gigabit Ethernet (802.3af POE); Secondary failover via Quectel EG25-G 4G LTE cellular modem.
- **Power Subsystem**: Mean Well 12V 5A industrial DIN-rail power supply with 12V 12Ah AGM backup battery providing 18 hours of continuous autonomous operation during coastal mains power failure.

