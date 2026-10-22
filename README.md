# 🌊 TIDES — Coastal Beach Safety Digital Twin & Impact Lab
## Andhra Pradesh Integrated Coastal Early Warning, Computer Vision, Reliability & Emergency Response Platform

> **High-Fidelity Oceanographic Simulation (60 FPS), Multi-Spectral Computer Vision, Multi-Asset Autonomous Dispatch, and the Evaluation-Ready TIDES Impact Lab**

**TIDES** is an end-to-end, physics-driven coastal safety management platform and digital twin. Built for the **Beach Safety Innovation Challenge**, the system monitors ocean dynamics, calculates hydrodynamic hazards (rip currents, wave surges, tidal recession, squalls), tracks visitor exposure and distress kinematics, coordinates emergency responders (lifeguards, jet skis, rescue boats, autonomous SAR drones), and houses the **TIDES Impact Lab**—a read-only observer delivering verifiable demonstrations of:
- **Demo A — Predict**: Multi-horizon rip-current intensification forecasting with early-warning lead-time verification.
- **Demo B — Remain Reliable**: Sensor & camera failure detection, freshness monitoring, and downstream degraded-state mitigation.
- **Demo C — Coordinate**: Distressed-swimmer incident replay, Golden Window ($\le 180\,\text{s}$) compliance auditing, and bottleneck analytics.

---

## 📑 Table of Contents
1. [System Architecture](#-system-architecture)
2. [Platform Components & Active Services](#-platform-components--active-services)
3. [Full Feature Breakdown](#-full-feature-breakdown)
   - [1. Real-Time Hydrodynamic Physics Engine](#1-real-time-hydrodynamic-physics-engine)
   - [2. Coastal Beach Presets (Rushikonda & Suryalanka)](#2-coastal-beach-presets-rushikonda--suryalanka)
   - [3. Multi-Spectral Optical HUD & Visual Modes](#3-multi-spectral-optical-hud--visual-modes)
   - [4. Ambient Ocean Soundscape & Tri-Lingual Audio Alerts](#4-ambient-ocean-soundscape--tri-lingual-audio-alerts)
   - [5. Visitor Crowd Kinetics & Lateral Rip Escape Routing](#5-visitor-crowd-kinetics--lateral-rip-escape-routing)
   - [6. Multi-Agency Emergency Response Fleet & Autonomous SAR Drones](#6-multi-agency-emergency-response-fleet--autonomous-sar-drones)
   - [7. Mobile Lifeguard Patrol Terminal](#7-mobile-lifeguard-patrol-terminal)
   - [8. Edge Computer Vision Ingestion & Posture Classification](#8-edge-computer-vision-ingestion--posture-classification)
   - [9. Fail-Safe Sensor Fusion & Watchdog Imputation](#9-fail-safe-sensor-fusion--watchdog-imputation)
   - [10. Experiment Control Lab & Manual Sea-State Injection](#10-experiment-control-lab--manual-sea-state-injection)
4. [TIDES Impact Lab: Three High-Impact Demonstrations](#-tides-impact-lab-three-high-impact-demonstrations)
   - [Demo A — Predict: Predictive Rip Hazard Forecasting](#demo-a--predict-predictive-rip-hazard-forecasting)
   - [Demo B — Remain Reliable: Sensor & Camera Health Monitoring](#demo-b--remain-reliable-sensor--camera-health-monitoring)
   - [Demo C — Coordinate: Incident Replay & Emergency Response Analytics](#demo-c--coordinate-incident-replay--emergency-response-analytics)
5. [Mathematical & Physical Formulations](#-mathematical--physical-formulations)
6. [Quick Start & Running the Project](#-quick-start--running-the-project)
7. [Automated Verification & Test Suites](#-automated-verification--test-suites)
8. [Project Directory & File Structure](#-project-directory--file-structure)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PHYSICAL / VIRTUAL COASTLINE                                  │
│  - Bathymetric Submarine Trench Gradients           - Channelized Seaward Rip Currents          │
│  - Semi-Diurnal Harmonic Tides (M2 Astronomical)    - Bather Kinematics, Stamina & Fatigue      │
└────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                 │ Raw Telemetry & 60 FPS Digital Twin State
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           CENTRAL SAFETY & DECISION PIPELINE (FastAPI)                          │
│                                                                                                 │
│  ┌───────────────────────┐    ┌───────────────────────┐    ┌─────────────────────────────────┐  │
│  │     Hazard Engine     │───▶│      Risk Engine      │───▶│         Decision Engine         │  │
│  │ (Wave, Rip, Tide, Wx) │    │ (Hazard+Exposure+Vuln)│    │ (Flag Warnings, Sirens, Drones) │  │
│  └───────────────────────┘    └───────────────────────┘    └────────────────┬────────────────┘  │
│                                                                             │                   │
│                               ┌───────────────────────┐                     │                   │
│                               │    Response Engine    │◀────────────────────┘                   │
│                               │ (Multi-Asset Dispatch)│                                         │
│                               └───────────────────────┘                                         │
└────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               TIDES IMPACT LAB (READ-ONLY OBSERVER)                             │
│                                                                                                 │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐ ┌───────────────────────────┐  │
│  │      DEMO A: PREDICT        │ │   DEMO B: REMAIN RELIABLE   │ │    DEMO C: COORDINATE     │  │
│  │ • 1m, 3m, 5m Rip Forecasts  │ │ • Camera & Sensor Health    │ │ • 8-Stage Incident Replay │  │
│  │ • Bounded Uncertainty Bands │ │ • Freshness Watchdog Windows│ │ • Scrubbable Time Scrubber│  │
│  │ • Lead Time: (t_ev - t_al)  │ │ • Downstream Degraded Alert │ │ • Golden Window (<= 180s) │  │
│  │ • Trend vs Persistence MAE  │ │ • Isolated Fault Injection  │ │ • Bottleneck Analytics    │  │
│  └─────────────────────────────┘ └─────────────────────────────┘ └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🖥️ Platform Components & Active Services

The platform consists of three decoupled, independently runnable services:

| Component | Technology Stack | Default Port | Endpoint / URL | Purpose |
| :--- | :--- | :---: | :--- | :--- |
| **Beach Safety Simulator & Impact Lab** | React 19, TypeScript, Vite, Tailwind CSS, HTML5 Canvas | `5173` | [http://localhost:5173](http://localhost:5173) | Primary interactive digital twin, multi-spectral canvas, ambient breaker audio, and the complete Impact Lab (Demos A, B, and C). |
| **Central Safety Engine Backend** | FastAPI, Python 3.10+, Uvicorn, WebSockets | `8000` | [http://localhost:8000/docs](http://localhost:8000/docs) | REST API endpoints (`/api/*`), telemetry stream, edge CV frame ingest, and live `ws://localhost:8000/ws/simulation`. |
| **Command & Control Operations Dashboard** | Next.js 14, React 18, Recharts, Lucide Icons | `3000` | [http://localhost:3000](http://localhost:3000) | Situational awareness dashboard for beach commanders, lifeguard patrol logs, and live risk funnel telemetry. |

---

## 🌟 Full Feature Breakdown

### 1. Real-Time Hydrodynamic Physics Engine
- **Continuous 60 FPS Digital Twin**: Simulates dynamic oceanographic bathymetry, shoaling waves, wave setup differentials, and channelized seaward rips.
- **Multi-Zone Bathymetric Gradients**: Incorporates beach berms, dynamic surf zones, offshore sandbars, rocky headlands, and deep water channels.
- **Coupled Meteorology**: Surface wind shear, wave period kinetic energy scaling, and semi-diurnal astronomical tidal recession.

### 2. Coastal Beach Presets (Rushikonda & Suryalanka)
- **Rushikonda Blue Flag Beach (Visakhapatnam — 17.7795° N, 83.3885° E)**:
  - Deep rocky headland refraction, $3.8\text{m}$ submarine trench drop-offs, and dual fixed rip current channels at `[(120, 300), (380, 520)]`.
- **Suryalanka Beach (Bapatla Coast — 15.8345° N, 80.5051° E)**:
  - Ultra-wide flat shelf geometry, $2.10\text{m}$ tidal amplitude, rapid shoreline boundary recession, and wide central feeder rips at `[(220, 260)]`.

### 3. Multi-Spectral Optical HUD & Visual Modes
The rendering canvas (`BeachCanvas.tsx`) supports 3 operational optical views:
1. **Tactical Vector Mode**: Operational overlay with lateral rip escape vector guidance, CV target reticles, zone boundary geofences, and vector streamlines.
2. **Satellite Reconnaissance Mode**: Photorealistic coastal satellite photography with hydrodynamic depth blending, foaming wave crests, and coordinate overlays.
3. **FLIR Thermal Infrared Mode**: Simulated Ironbow $16^\circ\text{C} - 42^\circ\text{C}$ infrared spectrum highlighting bather core body temperatures and distinct thermal coronas around struggling swimmers.

### 4. Ambient Ocean Soundscape & Tri-Lingual Audio Alerts
- **Web Audio Breaker Synthesis**: Realistic procedurally generated surf sound effects modulated by significant wave height ($H_s$) and breaker frequency.
- **Dual-Tone Acoustic Sirens**: $880\text{Hz} / 440\text{Hz}$ emergency siren sweeps alerting bathers when water entry is prohibited.
- **Tri-Lingual Voice PA Synthesis**: Automated voice broadcasts generated via the browser Web Speech API:
  - **Telugu (తెలుగు)**: *"హెచ్చరిక: సముద్రంలో బలమైన రిప్ కరెంట్ ప్రవాహం ఉంది. నీటిలోకి వెళ్లవద్దు, వెంటనే ఒడ్డుకు రండి."*
  - **English**: *"Warning: Dangerous rip current detected. Please exit the water immediately."*
  - **Hindi (हिन्दी)**: *"चेतावनी: समुद्र में खतरनाक लहरें और बहाव है। कृपया तुरंत पानी से बाहर आएं।"*

### 5. Visitor Crowd Kinetics & Lateral Rip Escape Routing
- **Individual Agent Kinetics**: Models bather stamina, swimming competence, exhaustion rate, and water exposure duration.
- **Lateral Rip Escape Algorithm**: Rather than swimming fruitlessly against offshore currents (causing fatal exhaustion within minutes), the pathfinding algorithm steers trapped swimmers perpendicularly toward shallow sandbars ($d < 1.0\text{m}$) before exiting to shore.
- **Drowning State Machine**: Classifies visitors into `ON_BEACH`, `WADING`, `SWIMMING`, `TRAPPED_IN_RIP`, `STRUGGLING`, `SUBMERGED`, and `RESCUED`.

### 6. Multi-Agency Emergency Response Fleet & Autonomous SAR Drones
- **Dynamic Asset Dispatching**: Allocates responders based on proximity, asset speed, and target priority:
  - **Lifeguard Patrol**: Foot patrol for immediate shorebreak assistance ($2.5\text{m/s}$).
  - **Rescue Jet Ski**: High-speed surf transit for open water rescues ($10.0\text{m/s}$).
  - **SAR Rescue Boat**: Heavy-duty vessel for offshore multi-victim extraction ($8.5\text{m/s}$).
  - **Autonomous SAR Drone**: UAV interceptor deploying emergency flotation collars directly over victims ($14.0\text{m/s}$).

### 7. Mobile Lifeguard Patrol Terminal
- **High-Contrast Sunlight-Readable HUD**: Displays instantaneous beach flag condition (🟢 Green / 🟡 Yellow / 🔴 Red / ⬛ Double Red).
- **GPS Rip Spotter Telemetry**: Real-time channel coordinates for pinpointing trapped swimmers.
- **1-Tap SOS Rapid Dispatch**: Instantly triggers asset sorties from the tower slipway.

### 8. Edge Computer Vision Ingestion & Posture Classification
- **Bounding-Box Ingestion (`/api/vision/frame`)**: Ingests CCTV edge inference detections.
- **Posture Classification**: Detects raised struggling arms, submerged head profiles, and stationary floaters ($> 12\text{s}$).
- **Rip Dwell Trigger**: Automatically raises emergency incidents when a swimmer remains trapped in a rip channel for $> 15\text{s}$.

### 9. Fail-Safe Sensor Fusion & Watchdog Imputation
- **Multi-Sensor Fusion**: Combines overlapping acoustic, radar, and ocean buoy readings weighted by real-time confidence scores.
- **Conflict Quarantine**: Isolates divergent sensor pairs ($|\Delta| > 0.35\text{m}$) into a quarantine buffer.
- **Synthetic $M_2$ Tidal Harmonic Imputation**: If physical buoy heartbeats drop for $> 45\text{s}$, the system activates a mathematical astronomical tide generator.

### 10. Experiment Control Lab & Manual Sea-State Injection
- Operators can dynamically adjust environmental variables (wave height, wave period, wind velocity, tidal level, crowd density) to observe instant hydrodynamic and safety flag propagation.

---

## 🔬 TIDES Impact Lab: Three High-Impact Demonstrations

The **Impact Lab** is an independent, non-intrusive evaluation suite designed specifically for the Beach Safety Innovation Challenge evaluation committee. It operates cleanly alongside the 60 FPS simulation without modifying physics, risk scores, or responder kinematics.

### Demo A — Predict: Predictive Rip Hazard Forecasting
- **Multi-Horizon Extrapolation**: Generates rip-current velocity projections for 1-minute ($+60\text{s}$), 3-minute ($+180\text{s}$), and 5-minute ($+300\text{s}$) horizons.
- **Timestamped Trend Estimation**: Calculates velocity rate of change using true simulation timestamps ($dv/dt = \Delta v / \Delta t$) rather than assuming fixed frame rates.
- **Physical Clamping & Plausibility Bands**: Bounds forecasts within physical shelf maximums ($[0.0, 3.2]\,\text{m/s}$) with expanding uncertainty bands proportional to horizon distance.
- **Persistence Baseline Benchmarking**: Benchmarks the trend model against a naive persistence baseline ($\hat{v}(t+h) = v(t)$).
- **Automated Accuracy & Lead-Time Scoring**:
  - **Velocity MAE**: Mean absolute error against subsequent ground truth.
  - **Warning Lead Time**: Achieves verified early warnings ($t_{\text{event}} - t_{\text{alert}} \ge 40\text{s}$) before hazards cross dangerous thresholds ($1.5\,\text{m/s}$).
  - **Forecast Coverage %**: Validates that all eligible forecasts receive ground-truth scoring.
  - **Missed-Event & False-Alarm Rates**: Quantifies reliability across stationary and rapid-surge scenarios.
- **5-Scenario Evaluation Test Suite (`ForecastTestSuite.ts`)**:
  1. *Gradually intensifying rip current* (verified positive lead time, Trend MAE < Baseline MAE).
  2. *Stable environmental conditions* (verified $dv/dt \approx 0$, zero false alarms).
  3. *Rapid hazard surge* (verified physical clamping $\le 3.2\,\text{m/s}$, uncertainty expansion).
  4. *Missing & stale ingress observations* (verified `INSUFFICIENT_HISTORY` rejection, zero fabrication).
  5. *Scenario reset & discontinuous timestamps* (verified negative $\Delta t$ rejection, clean reset).

### Demo B — Remain Reliable: Sensor & Camera Health Monitoring
- **9 Tracked Ingress Streams**: Monitors `CAM-01` through `CAM-04`, `CURRENT-ADCP-01`, `WAVE-BUOY-01`, `WEATHER-AWS-01`, `TIDE-GAUGE-01`, and `UNKNOWN-SENSOR-01`.
- **Category-Specific Freshness Thresholds**: Configurable warning age, stale age, and offline age per sensor type.
- **Strict State Classification**: Clearly distinguishes `HEALTHY`, `STALE`, `OFFLINE`, `DEGRADED`, and preserves `UNKNOWN` (uncalibrated sources never falsely default to healthy).
- **Isolated Failure Injection (`FailureScenarioRunner.ts`)**: Injects test-only faults (camera disconnect, delayed packets, out-of-bounds spikes, compound failures) without mutating the simulation engine.
- **Decoupled Downstream Safety Outputs (`DegradedOutputDetector.ts`)**:
  - When underlying sensors fail, downstream outputs (e.g. Zone B Distress Verification, Rip Forecasts) are visibly marked `DEGRADED` or `UNAVAILABLE`.
  - Raw AI model detection confidence is strictly decoupled from physical stream freshness. Stale data is never silently presented as current.
- **6-Scenario Evaluation Test Suite (`ReliabilityTestSuite.ts`)**:
  1. *Baseline nominal & unknown preservation*.
  2. *One camera unavailable (CAM-02 dropout)*.
  3. *Telemetry delayed past freshness threshold (ADCP stale)*.
  4. *Invalid out-of-bounds measurement (Buoy 8.5m spike)*.
  5. *Failed source restored (requires 3 consecutive valid frames)*.
  6. *Multiple simultaneous compound failures*.

### Demo C — Coordinate: Incident Replay & Emergency Response Analytics
- **8 Canonical Lifecycle Milestones**:
  1. `HAZARD_OBSERVED` $\rightarrow$ 2. `DISTRESS_DETECTED` $\rightarrow$ 3. `ALERT_BROADCAST` $\rightarrow$ 4. `RESPONDER_ASSIGNED` $\rightarrow$ 5. `RESPONDER_DEPARTED` $\rightarrow$ 6. `RESPONDER_ARRIVED` $\rightarrow$ 7. `ASSISTANCE_BEGAN` $\rightarrow$ 8. `INCIDENT_RESOLVED`.
- **Golden Window Compliance ($\le 180\,\text{s}$)**: Measures time from initial distress to on-scene assistance against the international $3$-minute lifesaving benchmark.
- **Mathematical Response Metrics (`ResponseMetrics.ts`)**:
  - $\text{Detection Latency} = t_{\text{distress}} - t_{\text{onset}}$
  - $\text{Dispatch Latency} = t_{\text{assigned}} - t_{\text{distress}}$
  - $\text{Travel Time} = t_{\text{arrived}} - t_{\text{departed}}$
  - $\text{Time to Assistance} = t_{\text{assisted}} - t_{\text{onset}}$
  - $\text{Total Duration} = t_{\text{resolved}} - t_{\text{onset}}$
  - $\text{Responder Utilization} = \text{Busy Time} / \text{Window}$
- **Zero Fabrication Guarantee**: Unrecorded milestones remain `null` / `UNAVAILABLE`. Estimated kinematic travel times are visibly tagged `ESTIMATE` and separated from `RECORDED FACT`.
- **Synchronized Playback Scrubber**: Scrubbable event timeline with playback controls (Play, Pause, Step, $1\times, 2\times, 5\times$).
- **Bottleneck Diagnostics & Dossier Exporter**: Identifies dispatch delays, reassignment overhead, and exports structured JSON dossiers.
- **8-Scenario Evaluation Test Suite (`IncidentReplayTestSuite.ts`)**:
  1. *Complete incident lifecycle*.
  2. *Missing detection event (latency null, not fabricated)*.
  3. *No recorded arrival (travel time null)*.
  4. *Multi-responder coordination (Boat + UAV Drone)*.
  5. *Duplicate event deduplication*.
  6. *Out-of-order timestamp sorting*.
  7. *Multiple simultaneous incidents (strict dossier isolation)*.
  8. *Missing resolution timestamp (duration null, active flag)*.

---

## 📐 Mathematical & Physical Formulations

### 1. Rip Current Velocity Formulation
$$R_{\text{rip}} = \min\left(1.0, \, (H_s \times 0.40) + (T_p \times 0.03) + \left(\frac{V_{\text{wind}}}{40.0} \times 0.30\right)\right)$$

### 2. Multi-Factor Beach Safety Score
$$S_{\text{zone}} = 0.35 \cdot R_{\text{wave}} + 0.30 \cdot R_{\text{rip}} + 0.20 \cdot R_{\text{tide}} + 0.15 \cdot E_{\text{crowd}}$$
- **$S_{\text{zone}} < 0.35$**: 🟢 **GREEN FLAG** (Low Hazard)
- **$0.35 \le S_{\text{zone}} \le 0.70$**: 🟡 **YELLOW FLAG** (Caution / Active Rip Feeders)
- **$S_{\text{zone}} > 0.70$**: 🔴 **RED FLAG** (Critical Hazard / Water Entry Prohibited)

### 3. Predictive Trend Extrapolation
$$\hat{v}(t + h) = \text{clamp}\left(v(t) + h \cdot \frac{v(t) - v(t - \Delta t)}{\Delta t}, \; 0.0, \; 3.2\right)$$

### 4. Mean Absolute Error (MAE)
$$\text{MAE} = \frac{1}{N} \sum_{i=1}^N \left| \hat{v}_i - v_i \right|$$

---

## 🚀 Quick Start & Running the Project

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **PowerShell / Bash**

---

### Step 1: Start the Central Safety FastAPI Backend (Port 8000)

```powershell
cd backend
# Using project virtual environment
.\.venv\Scripts\activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **WebSocket Endpoint**: `ws://localhost:8000/ws/simulation`

---

### Step 2: Start the Beach Safety Simulator & Impact Lab (Port 5173)

```powershell
cd beach-safety-simulator
npm install
npm run dev
```
- **Simulator & Impact Lab Web App**: [http://localhost:5173](http://localhost:5173)

---

### Step 3: Start the Command & Control Dashboard (Port 3000)

```powershell
cd frontend
npm install
npm run dev
```
- **Command Dashboard**: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Automated Verification & Test Suites

The repository contains automated programmatic test suites covering all architectural layers:

### 1. Central Safety Engine Pytest Suite (31 Tests Passed - 100%)
```powershell
cd backend
pytest -v
```
- Validates AP presets, buoy telemetry ingestion, CV bounding box parsing, audio scripts, sensor fusion, decision flags, and SAR drone sortie policies.

### 2. Impact Lab Demo A Test Suite (`ForecastTestSuite.ts`)
- 5 scenarios: Gradual intensification, stable surf, flash rip surge, missing telemetry, and scenario reset.

### 3. Impact Lab Demo B Test Suite (`ReliabilityTestSuite.ts`)
- 6 scenarios: Nominal baseline, camera dropout, stale ADCP telemetry, out-of-bounds buoy spike, feed recovery hysteresis, and compound failures.

### 4. Impact Lab Demo C Test Suite (`IncidentReplayTestSuite.ts`)
- 8 scenarios: Complete lifecycle, missing detection, unrecorded arrival, multi-responder coordination, deduplication, out-of-order sorting, simultaneous incidents, and pending resolution.

---

## 📁 Project Directory & File Structure

```
d:\MUNI RANGADU KURUVA\tides-main\
│
├── 📂 backend/                                   # FastAPI Safety Core & Hydrodynamic Simulation
│   ├── 📂 app/
│   │   ├── 📄 main.py                            # FastAPI entrypoint, lifespan event loop, and routers
│   │   ├── 📂 api/                              # REST API endpoints (beach, incidents, telemetry, vision, audio)
│   │   ├── 📂 safety/                           # HazardEngine, RiskEngine, DecisionEngine, ResponseEngine
│   │   ├── 📂 simulation/                       # BeachSimulator, BeachLayout, WavePhysics, Visitors
│   │   └── 📂 vision/                           # Edge CCTV bounding-box detector
│   └── 📂 tests/                               # 31 Pytest automated integration tests
│
├── 📂 beach-safety-simulator/                   # React 19 + TypeScript + Vite 60 FPS Digital Twin
│   ├── 📂 src/
│   │   ├── 📂 components/                      # BeachCanvas, AudioAlerts, LifeguardTerminal, Gauges
│   │   ├── 📂 simulation/                      # Client-side 60 FPS canvas loop & physics
│   │   ├── 📂 visitors/                        # Perception engine & crowd kinetics
│   │   └── 📂 impact-lab/                      # Evaluation Committee Impact Lab
│   │       ├── 📄 ImpactLabDashboard.tsx        # Unified 3-demo container & JSON dossier exporter
│   │       ├── 📄 types.ts                      # Telemetry snapshot, sensor health, and event contracts
│   │       ├── 📂 forecast/                     # DEMO A: PREDICT
│   │       │   ├── 📄 ForecastEngine.ts         # Multi-horizon trend extrapolation (1m, 3m, 5m)
│   │       │   ├── 📄 ForecastEvaluator.ts      # MAE, coverage, lead-time, missed/false alarm scoring
│   │       │   ├── 📄 ForecastComparisonPanel.tsx # Side-by-side forecast horizon UI & scorecards
│   │       │   └── 📂 tests/ForecastTestSuite.ts # 5 repeatable evaluation test scenarios
│   │       ├── 📂 reliability/                  # DEMO B: REMAIN RELIABLE
│   │       │   ├── 📄 SensorHealthMonitor.ts    # Freshness watchdog (Healthy/Stale/Offline/Degraded/Unknown)
│   │       │   ├── 📄 FailureScenarioRunner.ts  # Isolated test fault injection harness
│   │       │   ├── 📄 DegradedOutputDetector.ts # Downstream safety output degradation mapping
│   │       │   ├── 📄 ReliabilityPanel.tsx      # Sensor status grid & fault injection UI
│   │       │   └── 📂 tests/ReliabilityTestSuite.ts # 6 repeatable evaluation test scenarios
│   │       └── 📂 replay/                       # DEMO C: COORDINATE
│   │           ├── 📄 IncidentEventRecorder.ts  # Monotonic event aggregator & deduplicator
│   │           ├── 📄 ResponseMetrics.ts        # Golden Window (<= 180s) & latency calculators
│   │           ├── 📄 IncidentTimeline.tsx      # 8-milestone scrubbable playback scrubber (1x, 2x, 5x)
│   │           ├── 📄 IncidentReplayPanel.tsx   # Incident dossier selector & KPI cards
│   │           └── 📂 tests/IncidentReplayTestSuite.ts # 8 repeatable evaluation test scenarios
│   └── 📄 package.json
│
├── 📂 frontend/                                 # Next.js 14 Command Operations Dashboard
│   ├── 📂 app/                                  # Next.js App Router (Situational Awareness HUD)
│   ├── 📂 components/                           # Risk charts, fleet tables, and telemetry feeds
│   └── 📄 package.json
│
└── 📄 README.md                                 # Master System Documentation
```

---

## 📄 License
This project is licensed under the MIT License.

---
## 📣 Wristband‑to‑Swimmer Integration Audit & Fixes

**Commit** `218d799` introduced a full audit and a set of critical fixes to ensure reliable mapping between wristbands and simulated visitors, robust distress‑state handling, and a stable orange visual locator.

### ✅ Key Improvements

- **Stable Identity Mapping** – `WristbandRegistry` now stores a persistent `visitorId` per wristband, preventing duplicate visitor creation and guaranteeing that selecting a wristband selects the correct 3‑D swimmer and vice‑versa.
- **Distress‑State Lifecycle** – Consolidated state machine (`VisitorEngine`) with explicit transitions (`NORMAL → SOS → STRUGGLING → CRITICAL → RECOVERED`). Duplicate SOS events update the existing alert instead of spawning new UI elements.
- **Demo Seeding Fix** – Default demo visitor (`VIS‑REST‑01 / WB‑105`) is **not** seeded as suffocating in normal simulation mode. A config flag `demoDistressEnabled` (default `false`) enables the demo scenario when required.
- **Orange 3‑D Locator Robustness** – Updated `WristbandVisual3D` and `VisitorCharacter3D` so the orange ring, beacon and overhead badge stay bound to the swimmer’s coordinates, clean up Three.js objects on reset, and support multiple concurrent distressed swimmers.
- **Command‑Center Synchronization** – All panels now consume a shared `distressState` store, showing live/stale connection badges correctly and avoiding contradictory UI states.

### 🧪 Test Coverage Added

| Area | Test Suite | Highlights |
|------|------------|------------|
| Visitor‑to‑wristband mapping | `WristbandSwimmerIntegrationTestSuite` | Correct mapping, selection sync, duplicate prevention |
| Distress notifications | `DistressNotificationTestSuite` | Single SOS alert, duplicate updates, recovery clearing |
| Orange locator tracking | `OrangeLocatorTestSuite` | Position follows swimmer, multiple distress markers |
| Demo seeding | `DemoScenarioTestSuite` | No default suffocation in normal mode, demo flag works |
| Command‑center sync | `CommandCenterSyncTestSuite` | Unified state, stale telemetry handling |
| Regression | Existing suites (`WaveShoalingTestSuite`, `ReliabilityTestSuite`, etc.) | All prior tests still pass |

All tests run deterministically (no timing‑sensitive animation loops) and report **green** on CI.

### 📂 Files Modified (Commit `218d799`)

- `src/wristbands/WristbandRegistry.ts`
- `src/wristbands/WristbandIncidentBridge.ts`
- `src/scene3d/WristbandVisual3D.tsx`
- `src/scene3d/BeachScene3D.tsx`
- `src/components/SwimmerDistressNotification.tsx`
- `src/components/VisitorPanel.tsx`
- `src/scene3d/command/UnifiedOperationsCenter.tsx`
- Added/updated test suites under `src/wristbands/tests/` and `src/scene3d/hazards/tests/`

### 🚀 How to Run

```bash
# Install deps (once)
npm ci

# Build & start simulator
npm run dev   # http://localhost:5173

# Run all tests
npm test
```

To enable the demo distress scenario, set the flag in `src/wristbands/wristband.types.ts`:

```ts
export const demoDistressEnabled = false; // set true for the demonstration
```

---
