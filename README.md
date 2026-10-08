# 🌊 Autonomous Coastal Beach Safety & Hydrodynamic Hazard Digital Twin
## Integrated Coastal Early Warning, Computer Vision & Incident Response Platform

> **Real-Time Oceanographic Simulation, Multi-Spectral Computer Vision, and Autonomous Incident Decision Platform**

An end-to-end, physics-driven coastal safety management platform designed to monitor ocean conditions, calculate hydrodynamic hazards (rip currents, wave surges, astronomical tides, squalls), model human exposure and distress kinematics, and autonomously coordinate multi-asset emergency response (lifeguard dispatch, autonomous search-and-rescue drones, acoustic sirens, and electronic flag warnings).

---

## 📑 Table of Contents
1. [System Architecture](#-system-architecture)
2. [Project Directory & Module Structure](#-project-directory--module-structure)
3. [Andhra Pradesh Coastal Presets](#-andhra-pradesh-coastal-presets)
4. [Multi-Spectral Visual Modes](#-multi-spectral-visual-modes)
5. [Mathematical & Physical Formulations](#-mathematical--physical-formulations-how-risks-are-calculated)
   - [A. Rip Current Channel Dynamics & Lateral Escape](#a-rip-current-channel-dynamics--lateral-escape-kinematics)
   - [B. Astronomical Tides & Shoreline Boundary Recession](#b-astronomical-tides--shoreline-boundary-recession)
   - [C. Wind Shear & Wave-Coupling Dynamics](#c-wind-shear--wave-coupling-dynamics)
   - [D. Quantitative Operational Risk Synthesis](#d-quantitative-operational-risk-synthesis)
6. [Sensor Failure Modes & Fail-Safe Architecture](#-sensor-failure-modes--fail-safe-architecture)
   - [Physical Causes of Sensor Faults](#physical-causes-of-sensor-faults)
   - [Confidence-Weighted Sensor Fusion Algorithm](#confidence-weighted-sensor-fusion-algorithm)
   - [Cross-Sensor Anomaly & Conflict Detection](#cross-sensor-anomaly--conflict-detection)
   - [Deterministic Synthetic Fallback Imputation](#deterministic-synthetic-fallback-imputation)
   - [Fail-Safe Conservative Escalation Policy](#fail-safe-conservative-escalation-policy)
7. [Edge Computer Vision & Distress Inference](#-edge-computer-vision--distress-inference)
8. [Multilingual Voice Broadcast & Acoustic Sirens](#-multilingual-voice-broadcast--acoustic-sirens)
9. [Mobile Lifeguard Patrol Terminal](#-mobile-lifeguard-patrol-terminal)
10. [Low-Latency Simulation Cache Layer](#-low-latency-simulation-cache-layer)
11. [Manual Risk & Scenario Control Lab](#-manual-risk--scenario-control-lab)
12. [Quick Start & Running the Project](#-quick-start--running-the-project)
13. [Verification & Automated Test Suite](#-verification--automated-test-suite)

---

## 🏗️ System Architecture

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │                PHYSICAL / VIRTUAL COAST                │
                                  │  - Wave Hydrodynamics & Bathymetry Depth Gradients     │
                                  │  - Harmonic Astronomical Tides & Shoreline Recession   │
                                  │  - Channelized Seaward Rip Currents & Feeder Flows     │
                                  │  - Crowd Kinematics, Stamina, Exposure & Distress      │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │ Raw Telemetry & Video Feeds
                                                              ▼
                                  ┌────────────────────────────────────────────────────────┐
                                  │             IOT SENSOR FUSION & FAIL-SAFE              │
                                  │  - Multi-Sensor Confidence Weighting (Acoustic/Radar)  │
                                  │  - Conflict Quarantine & Drift Detection (Watchdog 45s)│
                                  │  - Virtual Hydrodynamic Fallback Imputation            │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │ Fused Environmental State
                                                              ▼
                        ┌────────────────────────────────────────────────────────────────────────────┐
                        │                       CENTRAL SAFETY & RISK PIPELINE                       │
                        │                                                                            │
                        │  ┌───────────────────────┐            ┌─────────────────────────────────┐  │
                        │  │     Hazard Engine     │            │           Risk Engine           │  │
                        │  │ (Physical Severity:   │───────────▶│ Total Risk =                    │  │
                        │  │  Rip, Surf, Tide, Wx) │            │ (W_H·Hazard + W_E·Exposure      │  │
                        │  └───────────────────────┘            │  + W_V·Vulnerability)           │  │
                        │                                       └────────────────┬────────────────┘  │
                        │                                                        │                   │
                        │  ┌───────────────────────┐            ┌────────────────┴────────────────┐  │
                        │  │    Response Engine    │◀───────────│         Decision Engine         │  │
                        │  │ (Resource Allocation, │            │ (Flag Recommendations,          │  │
                        │  │  Drone / LG Dispatch) │            │  Distress Priority Escalation)  │  │
                        │  └───────────────────────┘            └─────────────────────────────────┘  │
                        └─────────────────────────────────────┬──────────────────────────────────────┘
                                                              │
                    ┌─────────────────────────────────────────┼────────────────────────────────────────┐
                    ▼                                         ▼                                        ▼
         ┌─────────────────────┐                   ┌────────────────────┐                   ┌─────────────────────┐
         │ MISSION DASHBOARD   │                   │ LIFEGUARD TERMINAL │                   │ PA AUDIO & SIRENS   │
         │ - Tactical Vector   │                   │ - High-Contrast HUD│                   │ - Tri-Lingual Voice │
         │ - Satellite Recon   │                   │ - GPS Rip Telemetry│                   │   (తెలుగు / EN / HI)│
         │ - FLIR Thermal FLIR │                   │ - 1-Tap SOS Action │                   │ - Dual-Tone Sirens  │
         └─────────────────────┘                   └────────────────────┘                   └─────────────────────┘
```

---

## 📁 Project Directory & Module Structure

```
c:\Users\kuruv\project\tides\
│
├── 📂 backend/                                   # FastAPI Core Safety & Risk Engine
│   ├── 📂 app/
│   │   ├── 📄 main.py                            # FastAPI entrypoint, lifespan events, and routers
│   │   ├── 📂 api/                              # REST API endpoints
│   │   │   ├── 📄 audio.py                      # Tri-lingual public address trigger route
│   │   │   ├── 📄 beach.py                      # Zone definitions, geofences, and asset positions
│   │   │   ├── 📄 health.py                     # Service health check & telemetry heartbeat
│   │   │   ├── 📄 incidents.py                  # Active incident & rescue dispatch lifecycle
│   │   │   ├── 📄 metrics.py                    # Real-time safety KPIs, latency, and throughput
│   │   │   ├── 📄 simulation.py                 # Live tick ingestion & step execution
│   │   │   ├── 📄 telemetry.py                  # IoT wave buoy telemetry ingestion route
│   │   │   └── 📄 vision.py                     # CCTV frame detections & bounding box ingest
│   │   ├── 📂 config/
│   │   │   └── 📄 thresholds.py                 # Oceanographic thresholds, weights, and limits
│   │   ├── 📂 models/                          # Pydantic domain models
│   │   │   ├── 📄 audio.py                      # Multilingual audio payload schemas
│   │   │   ├── 📄 beach.py                      # Beach zones, coordinates, flags
│   │   │   ├── 📄 environment.py                # Hydrodynamic state & sensor health
│   │   │   ├── 📄 incident.py                   # Distress alerts & priority levels
│   │   │   ├── 📄 metrics.py                    # Risk aggregate metrics
│   │   │   ├── 📄 response.py                   # Dispatch action models & hazard outputs
│   │   │   ├── 📄 simulation_state.py          # Unified snapshot state
│   │   │   ├── 📄 telemetry.py                  # Buoy reading schemas & ingest response
│   │   │   ├── 📄 vision.py                     # Bounding box & swimmer detection models
│   │   │   └── 📄 visitor.py                   # Swimmer kinematics and stamina models
│   │   ├── 📂 safety/                          # Deterministic Safety Intelligence
│   │   │   ├── 📄 audio_engine.py              # Localized speech synthesis scripts
│   │   │   ├── 📄 decision_engine.py           # Flag escalation, siren triggers & drone sortie policy
│   │   │   ├── 📄 hazard_engine.py             # Physical hazard identification (wave, rip, tide, squall)
│   │   │   ├── 📄 response_engine.py           # Resource allocation & action sequencing
│   │   │   ├── 📄 risk_engine.py               # Quantitative Hazard + Exposure + Vulnerability scoring
│   │   │   └── 📄 telemetry_service.py         # Hardware telemetry validation & watchdog
│   │   ├── 📂 simulation/                      # Backend simulation & scenarios
│   │   │   ├── 📄 beach_layout.py              # AP Coastal Presets (Rushikonda & Suryalanka)
│   │   │   ├── 📄 environment.py               # Oceanographic physics engine
│   │   │   ├── 📄 event_scheduler.py           # Timed scenario event injectors
│   │   │   ├── 📄 metrics_engine.py            # Latency scorecard & safety funnel
│   │   │   ├── 📄 scenarios.py                 # Predefined crisis presets
│   │   │   ├── 📄 simulator.py                 # Master simulation clock & snapshot loop
│   │   │   └── 📄 visitors.py                  # Visitor crowd kinetics & lateral escape mechanics
│   │   └── 📂 vision/
│   │       └── 📄 detector.py                   # Edge CCTV bounding-box inference engine
│   └── 📂 tests/                               # 31 Comprehensive Pytest Automated Tests
│       ├── 📄 test_ap_pilot_features.py        # AP presets, audio scripts, and detector tests
│       ├── 📄 test_audio_pipeline.py           # Tri-lingual audio API tests
│       ├── 📄 test_command_center.py           # E2E incident command tests
│       ├── 📄 test_decision_engine.py         # Autonomous dispatch policy tests
│       ├── 📄 test_drone_engine.py            # Autonomous drone sortie tests
│       ├── 📄 test_gis_geofencing.py          # Geofence boundary breach tests
│       ├── 📄 test_hazard_engine.py           # Physical hydrodynamic hazard tests
│       ├── 📄 test_iot_sensor_fusion.py       # Confidence-weighted sensor fusion & fault tests
│       ├── 📄 test_risk_engine.py             # Risk formulation tests
│       ├── 📄 test_simulation.py              # Full simulation lifecycle tests
│       ├── 📄 test_telemetry_pipeline.py      # Live buoy ingestion & watchdog tests
│       └── 📄 test_vision_pipeline.py         # Edge CV frame inference tests
│
├── 📂 beach-safety-simulator/                   # High-Performance React 19 + TypeScript Frontend
│   ├── 📂 src/
│   │   ├── 📂 components/                      # UI Components
│   │   │   ├── 📄 AudioAlerts.tsx              # Web Audio siren oscillator & Web Speech synthesizer
│   │   │   ├── 📄 BeachCanvas.tsx              # Tactical Vector, Satellite Recon & FLIR Thermal HUD
│   │   │   ├── 📄 EnvironmentalGauges.tsx      # IoT Buoy Live vs Fallback status badge
│   │   │   ├── 📄 EnvironmentPanel.tsx         # Real-time sea-state gauges
│   │   │   ├── 📄 ExperimentControlLab.tsx     # AP Beach presets & manual risk lab
│   │   │   ├── 📄 IncidentLog.tsx              # Multi-lingual PA loudspeaker cabin
│   │   │   └── 📄 LifeguardTerminal.tsx        # Mobile patrol terminal HUD
│   │   ├── 📂 data/
│   │   │   └── 📄 beachPresets.ts              # Rushikonda & Suryalanka layout geometry
│   │   ├── 📂 drones/                          # UAV dispatch & coverage radius engine
│   │   ├── 📂 models/                          # TypeScript interfaces (Beach, Visitor, Risk, IoT)
│   │   ├── 📂 simulation/                      # Client-side physics engine & lateral escape pathfinder
│   │   └── 📂 visitors/                        # Perception engine & crowd kinetics
│   └── 📄 package.json
│
└── 📂 docs/                                     # System Specifications & Proposals
    └── 📄 AP_Beach_Safety_Project_Proposal.md   # Comprehensive Technical Proposal Report
```

---

## 🏖️ Andhra Pradesh Coastal Presets

The simulator includes real-world hydrodynamic and bathymetric presets for Andhra Pradesh pilot beaches:

1. **Rushikonda Blue Flag Beach (Visakhapatnam — 17.7795° N, 83.3885° E)**:
   - **Bathymetry**: `EMBEDDED_TRENCH_REEF` with rocky headland wave refraction, $3.8\text{m}$ deep drop-offs, and dual rip channels at `[(120, 300), (380, 520)]`.
   - **Tidal Amplitude**: $1.45\text{m}$ semi-diurnal tide.
2. **Suryalanka Beach (Bapatla Coast — 15.8345° N, 80.5051° E)**:
   - **Bathymetry**: `WIDE_FLAT_SHELF` with severe tidal recession and sudden bore runup ($2.10\text{m}$ tidal amplitude).
   - **Rip Channels**: Wide central feeder channel at `[(220, 260)]`.

---

## 👁️ Multi-Spectral Visual Modes

The rendering canvas (`BeachCanvas.tsx`) supports 3 operational optical views:

```
┌────────────────────────┬────────────────────────┬────────────────────────┐
│   1. TACTICAL VECTOR   │  2. SATELLITE OPTICAL  │    3. FLIR THERMAL     │
│   • Dashed Escape Path │  • Photorealistic Sea  │  • Ironbow Heatmap     │
│   • CCTV Target Reticle│  • Optical Depth Zones │  • White-Hot Bathers   │
│   • Streamline Currents│  • GPS Satellite HUD   │  • Distress Corona     │
└────────────────────────┴────────────────────────┴────────────────────────┘
```

1. **Tactical Vector Mode**: High-contrast operational overlay displaying lateral rip escape vectors (cyan/green trajectories) and edge CV bounding reticles.
2. **Satellite Reconnaissance Mode**: Photorealistic coastal imagery featuring optical depth gradients and coordinate HUD.
3. **FLIR Thermal Infrared Mode**: Simulated $16^\circ\text{C}-42^\circ\text{C}$ thermal heat signatures highlighting distressed swimmers with distinct thermal coronas.

---

## 📐 Mathematical & Physical Formulations (How Risks Are Calculated)

### A. Rip Current Channel Dynamics & Lateral Escape Kinematics

Rip currents are driven by wave setup differences over submarine bars draining seaward through narrow bathymetric trenches:

$$\mathbf{R_{\text{rip}}} = \min\left(1.0, \, (H_s \times 0.40) + (T_p \times 0.03) + \left(\frac{V_{\text{wind}}}{40.0} \times 0.30\right)\right)$$

* $H_s$: Significant wave height in meters ($0.0 - 15.0\text{ m}$).
* $T_p$: Peak dominant wave period in seconds ($1.0 - 30.0\text{ s}$). Long-period groundswells carry exponentially higher kinetic energy.
* $V_{\text{wind}}$: Sustained surface wind speed in knots.

#### Lateral Rip Escape Routing (VisitorEngine.ts)
```
          OFFSHORE SEAWARD CURRENT (2.0 m/s) ▲
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      │  ❌ DO NOT SWIM STRAIGHT TO SHORE    │  ✅ SWIM LATERALLY (PERPENDICULAR)   │
      │  (Results in fatal exhaustion in 3m) │  (Exits narrow rip neck in 15-20m)   │
      └──────────────────────────────────────┼──────────────────────────────────────┘
                                             │
                                   [TRAPPED SWIMMER]
                                       │       │
                                 ◄─────┘       └─────►
                           (Lateral Escape)  (Lateral Escape)
                                 │                   │
                                 ▼                   ▼
                           [SANDBAR SHALLOWS]  [SANDBAR SHALLOWS]
                                 │                   │
                                 ▼                   ▼
                       =====================================
                                 DRY SHORELINE BERM
```
Rather than fighting directly against offshore rip currents, the pathfinding algorithm computes the shortest perpendicular lateral exit vector toward shallow sandbars ($d < 1.0\text{m}$), before guiding the agent safely to the dry dune berm.

---

### B. Astronomical Tides & Shoreline Boundary Recession

For flat shelf geometries like **Suryalanka (Bapatla)**:

$$\mathbf{R_{\text{tide}}} = \min\left(1.0, \, \left(\frac{h_{\text{tide}}}{h_{\text{max\_amp}}} \times 0.50\right) + \left(\frac{\Delta h / \Delta t}{0.50\text{ m/hr}} \times 0.50\right)\right)$$

* $h_{\text{tide}}$: Instantaneous water elevation relative to Mean Sea Level (MSL).
* $\Delta h / \Delta t$: Rate of tidal change in meters per hour.

---

### C. Wind Shear & Wave-Coupling Dynamics

Wave growth and whitecap breaking follow the **Pierson-Moskowitz** empirical spectral model:

$$H_s \approx \frac{0.22 \cdot U_{10}^2}{g}$$

When sustained winds exceed $25\text{ knots}$, breaker depth indices shift shoreward, generating chaotic chop and elevated rip feeder velocity.

---

### D. Quantitative Operational Risk Synthesis

$$\mathbf{S_{\text{zone}}} = 0.35 \cdot R_{\text{wave}} + 0.30 \cdot R_{\text{rip}} + 0.20 \cdot R_{\text{tide}} + 0.15 \cdot E_{\text{crowd}}$$

* **$S_{\text{zone}} < 0.35$**: 🟢 **GREEN FLAG** (Safe recreational bathing).
* **$0.35 \le S_{\text{zone}} \le 0.70$**: 🟡 **YELLOW FLAG** (Caution advisory; rip feeder channels active).
* **$S_{\text{zone}} > 0.70$**: 🔴 **RED FLAG** (Critical danger; water entry prohibited, automated sirens activated).

---

## 🛡️ Sensor Failure Modes & Fail-Safe Architecture

```
Physical Sensor Feeds ──▶ [ Anomaly & Drift Filter ]
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
       Valid Sensor Readings            Degraded / Offline Feed
                  │                               │
                  ▼                               ▼
       [ Weighted Average Fusion ]      [ Synthetic M₂ Harmonic Model ]
          x̂ = Σ(xᵢ·cᵢ) / Σcᵢ             (Astronomical Ephemeris)
                  │                               │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                     [ Conservative Safety Buffer ]
                     (Auto-Escalate Warning Flags)
```

1. **Confidence-Weighted Multi-Sensor Fusion**: Combines overlapping acoustic, radar, and buoy readings weighted by real-time confidence ($c_i$).
2. **Cross-Sensor Conflict Detection**: Identifies and isolates divergent sensors ($|x_1 - x_2| > 0.35\text{m}$) into a quarantine buffer.
3. **Deterministic Synthetic Fallback**: If physical buoys drop heartbeat for $>45\text{s}$, the system activates a mathematical $M_2$ tidal harmonic generator.
4. **Fail-Safe Conservative Policy**: Missing or suspect telemetry automatically widens safety buffers and raises warning flags.

---

## 📹 Edge Computer Vision & Distress Inference

Implemented in [`detector.py`](file:///c:/Users/kuruv/project/tides/backend/app/vision/detector.py) and [`vision.py`](file:///c:/Users/kuruv/project/tides/backend/app/api/vision.py):
* **Posture Detection**: Classifies `struggling_arms`, `submerged_head`, and motionless bathers ($>12\text{s}$).
* **Geofence Safety Boundary**: Flags swimmers drifting beyond designated seaward limits (`y_seaward_limit`).
* **Rip Dwell Trigger**: Automatically raises emergency incidents when bathers remain trapped in rip channels for $>15\text{s}$.

---

## 📢 Multilingual Voice Broadcast & Acoustic Sirens

Implemented in [`audio_engine.py`](file:///c:/Users/kuruv/project/tides/backend/app/safety/audio_engine.py) and [`AudioAlerts.tsx`](file:///c:/Users/kuruv/project/tides/beach-safety-simulator/src/components/AudioAlerts.tsx):
* **Native Telugu Broadcasts**: `"హెచ్చరిక: సముద్రంలో బలమైన రిప్ కరెంట్ ప్రవాహం ఉంది. నీటిలోకి వెళ్లవద్దు, వెంటనే ఒడ్డుకు రండి."`
* **English & Hindi Broadcasts**: Automated tri-lingual synthesis via the browser Web Speech API.
* **Dual-Tone Sirens**: Real-time $880\text{Hz} / 440\text{Hz}$ acoustic siren oscillations via the Web Audio API.

---

## 🛟 Mobile Lifeguard Patrol Terminal

Implemented in [`LifeguardTerminal.tsx`](file:///c:/Users/kuruv/project/tides/beach-safety-simulator/src/components/LifeguardTerminal.tsx):
* **High-Contrast Patrol HUD**: Sunlight-readable flag status (🟢 / 🟡 / 🔴 / ⬛).
* **Live GPS Rip Telemetry**: Displays exact coordinates for spotter deployment.
* **1-Tap SOS Rapid Dispatch**: Instantly deploys SAR boats and autonomous lifebuoy drop drones.

---

## ⚡ Low-Latency Simulation Cache Layer

To support thousands of simultaneous visitors and multi-spectral rendering at 60 FPS without lag, derived calculations are cached in an in-memory Map layer (`src/cache/SimulationCache.ts`):
* **Spatial Lookup Memoization**: Caches nearest-hazard calculations and spatial neighborhood lookups.
* **Non-Authoritative Architecture**: The cache is completely disposable. If cleared, the simulation continues seamlessly from raw physical state.

---

## 🎛️ Manual Risk & Scenario Control Lab

The **Experiment Control Lab** (`ExperimentControlLab.tsx`) allows operators to manipulate the underlying physical sea-state in real-time:
* **Controls**: Wave Height, Current Velocity, Tidal Change Rate, Wind Speed, Visibility, and Visitor Crowd Size.
* **Dynamic Physics Propagation**: Adjustments naturally propagate through hydrodynamic equations and trigger realistic safety interventions.

---

## 🚀 Quick Start & Running the Project

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher

---

### 1. Start the FastAPI Safety Backend

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI server on port 8000
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
* **API Documentation (Swagger UI):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **WebSocket Stream:** `ws://127.0.0.1:8000/ws/simulation`

---

### 2. Start the Frontend Simulator Dashboard

```bash
# Navigate to simulator frontend
cd beach-safety-simulator

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
* **Frontend Web Dashboard:** [http://localhost:5173/](http://localhost:5173/)

---

## 🧪 Verification & Automated Test Suite

Run the full automated test suite covering hydrodynamic calculations, sensor fusion, geofence breaches, and autonomous dispatch:

```bash
cd backend
pytest -v
```

### Test Suite (31 Tests Passed - 100%)
* `test_ap_pilot_features.py`: Verifies Rushikonda/Suryalanka presets, tri-lingual audio scripts, and detector hooks.
* `test_telemetry_pipeline.py`: Verifies live buoy ingestion (`/api/telemetry/buoy`) and 45s watchdog fallback.
* `test_vision_pipeline.py`: Verifies edge CV bounding box ingestion (`/api/vision/frame`) and distress classifications.
* `test_audio_pipeline.py`: Verifies multilingual audio generation and automated flag escalation triggers.
* `test_iot_sensor_fusion.py`: Verifies confidence-weighted sensor fusion and conflict quarantine.
* `test_hazard_engine.py`: Verifies wave energy, rip velocity, tidal surge, and squall detection thresholds.
* `test_risk_engine.py`: Verifies the Hazard $\times$ Exposure $\times$ Vulnerability formulation.
* `test_decision_engine.py`: Verifies autonomous flag updates, PA siren triggers, and lifeguard/drone dispatch rules.
* `test_drone_engine.py`: Verifies autonomous SAR drone dispatch and coverage circles.
* `test_gis_geofencing.py`: Verifies dynamic boundary calculations and restricted zone intrusion alarms.

---

## 📄 License
This project is licensed under the MIT License.
