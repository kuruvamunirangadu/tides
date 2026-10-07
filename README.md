# 🌊 Autonomous Coastal Beach Safety & Hydrodynamic Hazard Digital Twin

> **Real-Time Oceanographic Simulation, Multi-Spectral Computer Vision, and Autonomous Incident Decision Platform**

An end-to-end, physics-driven coastal safety management platform designed to monitor ocean conditions, calculate hydrodynamic hazards (rip currents, wave surges, astronomical tides, squalls), model human exposure and distress kinematics, and autonomously coordinate multi-asset emergency response (lifeguard dispatch, autonomous search-and-rescue drones, acoustic sirens, and electronic flag warnings).

---

## 📑 Table of Contents
1. [System Architecture](#-system-architecture)
2. [Project Directory & Module Structure](#-project-directory--module-structure)
3. [Multi-Spectral Visual Modes](#-multi-spectral-visual-modes)
4. [Mathematical & Physical Formulations (How Risks Are Calculated)](#-mathematical--physical-formulations-how-risks-are-calculated)
   - [A. Rip Current Channel Dynamics](#a-rip-current-channel-dynamics)
   - [B. Astronomical Tides & Shoreline Boundary Recession](#b-astronomical-tides--shoreline-boundary-recession)
   - [C. Wind Shear & Wave-Coupling Dynamics](#c-wind-shear--wave-coupling-dynamics)
   - [D. Quantitative Operational Risk Synthesis (Hazard × Exposure × Vulnerability)](#d-quantitative-operational-risk-synthesis)
5. [Sensor Failure Modes & Fail-Safe Architecture (Handling Failures at All Times)](#-sensor-failure-modes--fail-safe-architecture)
   - [Physical Causes of Sensor Faults](#physical-causes-of-sensor-faults)
   - [Confidence-Weighted Sensor Fusion Algorithm](#confidence-weighted-sensor-fusion-algorithm)
   - [Cross-Sensor Anomaly & Conflict Detection](#cross-sensor-anomaly--conflict-detection)
   - [Deterministic Synthetic Fallback Imputation](#deterministic-synthetic-fallback-imputation)
   - [Fail-Safe Conservative Escalation Policy](#fail-safe-conservative-escalation-policy)
   - [Offline Edge Store-and-Forward Buffering](#offline-edge-store-and-forward-buffering)
6. [Low-Latency Simulation Cache Layer](#-low-latency-simulation-cache-layer)
7. [Manual Risk & Scenario Control Lab](#-manual-risk--scenario-control-lab)
8. [Quick Start & Running the Project](#-quick-start--running-the-project)
9. [Verification & Pytest Suite](#-verification--pytest-suite)

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
                                  │  - Conflict Quarantine & Drift Detection               │
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
                                            ┌─────────────────┴─────────────────┐
                                            │                                   │
                                            ▼                                   ▼
                         ┌────────────────────────────────────┐ ┌────────────────────────────────────┐
                         │      MISSION CONTROL DASHBOARD     │ │      IN-MEMORY CACHE LAYER         │
                         │  - Multi-Spectrum Canvas Engine    │ │  - Spatial Grid Neighbor Index     │
                         │  - Satellite / Thermal FLIR Views  │ │  - Memoized Risk Calculations      │
                         │  - Experiment Control Lab          │ │  - High-FPS Render Snapshots       │
                         │  - Real-Time Latency Scorecard     │ │  - Microsecond Telemetry Access    │
                         └────────────────────────────────────┘ └────────────────────────────────────┘
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
│   │   │   ├── 📄 beach.py                      # Zone definitions, geofences, and asset positions
│   │   │   ├── 📄 health.py                     # Service health check & telemetry heartbeat
│   │   │   ├── 📄 incidents.py                  # Active incident & rescue dispatch lifecycle
│   │   │   ├── 📄 metrics.py                    # Real-time safety KPIs, latency, and throughput
│   │   │   └── 📄 simulation.py                 # Live tick ingestion & step execution
│   │   ├── 📂 config/
│   │   │   └── 📄 thresholds.py                 # Oceanographic thresholds, weights, and limits
│   │   ├── 📂 models/                          # Pydantic domain models
│   │   │   ├── 📄 beach.py                      # Beach zones, coordinates, flags
│   │   │   ├── 📄 environment.py                # Hydrodynamic state & sensor health
│   │   │   ├── 📄 incident.py                   # Distress alerts & priority levels
│   │   │   ├── 📄 metrics.py                    # Risk aggregate metrics
│   │   │   ├── 📄 response.py                   # Dispatch action models & hazard outputs
│   │   │   ├── 📄 simulation_state.py          # Unified snapshot state
│   │   │   └── 📄 visitor.py                   # Swimmer kinematics and stamina models
│   │   ├── 📂 safety/                          # Deterministic Safety Intelligence
│   │   │   ├── 📄 decision_engine.py           # Flag escalation, siren triggers & drone sortie policy
│   │   │   ├── 📄 hazard_engine.py             # Physical hazard identification (wave, rip, tide, squall)
│   │   │   ├── 📄 response_engine.py           # Resource allocation & action sequencing
│   │   │   └── 📄 risk_engine.py               # Quantitative Hazard + Exposure + Vulnerability scoring
│   │   └── 📂 simulation/                      # Backend simulation & scenarios
│   │       ├── 📄 beach_layout.py              # Spatial zone setup
│   │       ├── 📄 environment.py               # Oceanographic physics engine
│   │       ├── 📄 event_scheduler.py           # Timed scenario event injectors
│   │       ├── 📄 metrics_engine.py            # Latency scorecard & safety funnel
│   │       ├── 📄 scenarios.py                 # Predefined crisis presets
│   │       ├── 📄 simulator.py                 # Master simulation clock & snapshot loop
│   │       └── 📄 visitors.py                  # Visitor crowd kinetics & drift mechanics
│   └── 📂 tests/                               # Comprehensive Pytest Verification Suite
│       ├── 📄 test_command_center.py           # E2E incident command tests
│       ├── 📄 test_decision_engine.py         # Autonomous dispatch policy tests
│       ├── 📄 test_drone_engine.py            # Autonomous drone sortie tests
│       ├── 📄 test_gis_geofencing.py          # Geofence boundary breach tests
│       ├── 📄 test_hazard_engine.py           # Physical hydrodynamic hazard tests
│       ├── 📄 test_iot_sensor_fusion.py       # Confidence-weighted sensor fusion & fault tests
│       ├── 📄 test_risk_engine.py             # Risk formulation tests
│       └── 📄 test_simulation.py              # Full simulation lifecycle tests
│
└── 📂 beach-safety-simulator/                   # High-Performance React + TypeScript Frontend
    ├── 📂 src/
    │   ├── 📂 cache/                            # Low-Latency Simulation Cache Layer
    │   │   ├── 📄 SimulationCache.ts           # In-memory Map cache with TTL & version invalidation
    │   │   ├── 📄 CacheKeys.ts                 # Strongly-typed cache key generators
    │   │   ├── 📄 CacheStats.ts                # Real-time cache hit/miss/latency telemetry
    │   │   └── 📄 RenderSnapshot.ts            # High-FPS rendering snapshot structures
    │   ├── 📂 components/                       # UI & Visualization Components
    │   │   ├── 📄 BeachCanvas.tsx              # Multi-spectral 60 FPS HTML5 Canvas engine
    │   │   ├── 📄 ExperimentControlLab.tsx     # Physical environment sliders & hazard controls
    │   │   ├── 📄 PerformanceMonitor.tsx       # FPS/TPS, cache hit-rate, & stress test suite
    │   │   ├── 📄 RiskPanel.tsx                # Zone-by-zone risk score breakdowns
    │   │   ├── 📄 IncidentLog.tsx              # Active alerts, SOS events, and dispatches
    │   │   └── 📄 EnvironmentalGauges.tsx      # Wind compass, tide gauges, wave buoys
    │   ├── 📂 simulation/                       # Client-side Kinematics & Physics
    │   │   ├── 📄 SimulationEngine.ts          # Tick orchestrator & spatial grid indexer
    │   │   ├── 📄 EnvironmentEngine.ts         # Astronomical $M_2$ tides, wind, & rip formulas
    │   │   └── 📄 VisitorEngine.ts             # Agent kinematics, drift, compliance, & distress
    │   ├── 📂 models/                          # TypeScript Interfaces & Types
    │   │   ├── 📄 Beach.ts                     # Beach layout & zone data structures
    │   │   ├── 📄 Environment.ts               # Hydrodynamic state interfaces
    │   │   ├── 📄 Hazard.ts                    # Detected hazard types and severities
    │   │   └── 📄 Visitor.ts                   # Swimmer kinematics and health states
    │   ├── 📂 hooks/
    │   │   └── 📄 useSimulation.ts             # React state binding and animation loop hook
    │   ├── 📄 App.tsx                          # Dashboard shell, grid layout, & theme dock
    │   └── 📄 main.tsx                         # Client application mounting
    ├── 📄 package.json
    └── 📄 vite.config.ts
```

---

## 🛰️ Multi-Spectral Visual Modes

The visual engine (`BeachCanvas.tsx`) renders the coastal environment at 60 FPS across **4 distinct spectrums**:

```
┌────────────────────────────────────────────────────────────────────────┐
│  [ Tactical ]   [ 🛰️ Satellite ]   [ 🔥 Thermal FLIR ]   [ 🌊 Hydro ]   │
└────────────────────────────────────────────────────────────────────────┘
```

1. **🛰️ Satellite Reconnaissance View:**
   - **Bathymetric Depth Gradient:** Deep oceanic blues transitioning into nearshore shallows and sandbars.
   - **Rip Channel Trenches:** Submerged bathymetric rip trenches rendered in dark azure to highlight seaward flow corridors.
   - **Foamy Breaking Surf & Shorebreak:** Dynamically calculated white-water foam ridges that scale with wave height and period.
   - **Reconnaissance HUD:** Live GPS telemetry overlay (`17°42'14.2"N 83°19'48.5"E`), True North reticle, optical scale ($1\text{px} \approx 0.8\text{m}$), and multispectral sensor status.

2. **🔥 Thermal Infrared (FLIR / Search & Rescue) View:**
   - **False-Color Ironbow Spectrum:** Water rendered in cool dark violet/indigo ($18^\circ\text{C} - 23^\circ\text{C}$) against warm sand ($29^\circ\text{C} - 33^\circ\text{C}$).
   - **Human Thermal Signatures:** Human bodies emit distinct white-hot $37^\circ\text{C}$ cores with radiant yellow/orange thermal coronas.
   - **Night Search & Rescue:** Distressed swimmers caught in deep offshore channels stand out with maximum contrast against cold sea backgrounds.
   - **Calibration HUD:** Interactive temperature calibration bar ($16^\circ\text{C} \longleftrightarrow 42^\circ\text{C}$).

3. **🌊 Hydrodynamic Streamlines View:**
   - Real-time animated vector flow fields showcasing feeder currents converging into high-velocity rip current exit chutes.

4. **🗺️ Tactical Vector Map:**
   - Standard cartographic mode with designated safe swimming zones, hazard boundaries, lifeguard observation cones, CCTV fields of view, and digital warning flags.

---

## 📐 Mathematical & Physical Formulations (How Risks Are Calculated)

Risk calculation is strictly deterministic and physics-grounded. Environmental factors build up gradually, driving agent exposure and distress states.

### A. Rip Current Channel Dynamics
Rip currents form when incoming breaking waves transport mass over shallow sandbars into the surf zone. Water drains back offshore through deeper bathymetric channels.

1. **Rip Current Velocity ($v_{\text{rip}}$):**
   $$v_{\text{rip}} = v_{\text{base}} + \left(\left|\frac{d\eta}{dt}\right| \cdot k_{\text{tide}}\right) + (H_s \cdot k_{\text{wave}})$$
   * $v_{\text{base}} = 0.20\text{ m/s}$: Minimum feeder channel velocity.
   * $\left|\frac{d\eta}{dt}\right| = |\cos(\omega t)|$: Instantaneous tidal rate of change. Velocity peaks during **ebb (falling) tides** as receding water drains rapidly through channels.
   * $H_s$: Significant wave height ($\text{m}$). Higher breaking surf drives larger mass flux ($Q_{\text{feeder}}$) over sandbars:
     $$v_{\text{rip}} \approx \frac{Q_{\text{feeder}}}{W_{\text{channel}} \cdot h_{\text{depth}}}$$

2. **Severity Thresholds:**
   * $< 0.30\text{ m/s}$: **Low** (Mild drift).
   * $0.30 - 0.60\text{ m/s}$: **Moderate** (Exhausts novice swimmers).
   * $0.60 - 1.00\text{ m/s}$: **High** (Overcomes average adult swimmers).
   * $\ge 1.50\text{ m/s}$: **Critical** (Violent rip jet capable of pulling groups seaward in seconds).

---

### B. Astronomical Tides & Shoreline Boundary Recession
1. **Semi-Diurnal Harmonic Model ($M_2$ Lunar Constituent):**
   $$\eta(t) = h_{\text{MSL}} + A \cdot \sin\left(\frac{2\pi t}{T_{\text{tide}}} + \phi\right)$$
   * $T_{\text{tide}} = 12.42\text{ hours}$ (Semi-diurnal tidal cycle).
   * $h_{\text{MSL}} = 1.30\text{ m}$ (Mean Sea Level), Amplitude $A = 0.75\text{ m}$.

2. **Shoreline Inundation & Geofence Contraction:**
   $$\Delta x_{\text{shore}} = \frac{\Delta \eta}{\tan(\beta)}$$
   * Where $\beta$ is the beach slope angle. As the tide rises, safe dry-beach buffer zones contract, automatically triggering zone boundary adjustments and bather relocation warnings.

---

### C. Wind Shear & Wave-Coupling Dynamics
1. **Diurnal Sea-Breeze Forcing:**
   $$U_{\text{wind}}(t) = U_{\text{base}} + U_{\text{thermal}} \cdot \sin\left(\frac{t - 8}{14}\pi\right) + \text{Turbulence}(t)$$
   * Models thermal gradient development between landmass and ocean, reaching peak onshore winds during mid-afternoon.

2. **Wind-Wave Energy Transfer:**
   $$\tau_w = \rho_{\text{air}} C_d U_{10}^2$$
   * Strong surface winds generate chop, whitecaps, surface drift currents, and degrade optical CCTV visibility.

---

### D. Quantitative Operational Risk Synthesis
The central risk engine evaluates risk through the fundamental triad:

$$\text{Operational Risk} = (W_H \cdot \text{Hazard Score}) + (W_E \cdot \text{Exposure Score}) + (W_V \cdot \text{Vulnerability Score})$$

```
                   ┌─────────────────────────────────────────────────────────┐
                   │                     ENVIRONMENT STATE                   │
                   │  - Wave Height: 2.4m      - Current: 1.2 m/s (Rip)      │
                   │  - Tide Rate: +0.6 m/hr   - Wind: 28 knots              │
                   └────────────────────────────┬────────────────────────────┘
                                                │
                                                ▼
                   ┌─────────────────────────────────────────────────────────┐
                   │               PHYSICAL HAZARD SCORE (0 - 1.0)           │
                   │  Hazard = Max(RipSeverity, WaveSeverity, TideSeverity)  │
                   └────────────────────────────┬────────────────────────────┘
                                                │
                                                ▼
     ┌─────────────────────────────────────────────────────────────────────────────────────┐
     │ Exposure = Swimmer Density / Zone Capacity   │ Vulnerability = Distressed Swimmers  │
     └──────────────────────────────────────────┬──────────────────────────────────────────┘
                                                │
                                                ▼
                   ┌─────────────────────────────────────────────────────────┐
                   │             TOTAL COMBINED OPERATIONAL RISK             │
                   │  - Risk = 0.50·Hazard + 0.30·Exposure + 0.20·Vulnerab.  │
                   │  - Triggers Green / Yellow / Red / Black Flags          │
                   └─────────────────────────────────────────────────────────┘
```

* **Hazard Score ($0.0 - 1.0$):** Physical severity of active environmental conditions in that zone.
* **Exposure Score ($0.0 - 1.0$):** Human density in the hazardous zone ($N_{\text{swimmers}} / \text{ZoneCapacity}$). *A rip current in an empty zone produces Low operational risk; the same rip with 50 swimmers produces Critical operational risk.*
* **Vulnerability Score ($0.0 - 1.0$):** Weight of bathers in active distress ($N_{\text{distressed}} \times 0.40$).

---

## 👤 Direct Person-to-Shore Sensory Feedback & Escape Navigation

When sudden nearshore hazards develop, bathers experience physical tactile and visual cues. Our multi-agent kinematic model incorporates individual sensory perception and autonomous escape navigation:

```
                               ┌────────────────────────────────────────────────────────┐
                               │                 PHYSICAL SENSORY CUES                  │
                               ├──────────────────────────┬─────────────────────────────┤
                               │ Water Receding Abruptly  │ Ocean pulls back rapidly;   │
                               │ (Drawdown)               │ indicates impending surge.  │
                               ├──────────────────────────┼─────────────────────────────┤
                               │ Sand Liquefaction & Pull │ Sand beneath feet pulled    │
                               │ (Undertow Sensation)     │ seaward (v_water > 0.8 m/s).│
                               ├──────────────────────────┼─────────────────────────────┤
                               │ Water Discoloration &    │ Murky plume / foam streaks  │
                               │ Plumes                   │ moving offshore (Rip neck). │
                               ├──────────────────────────┼─────────────────────────────┤
                               │ Tidal Cut-Off Depressions│ Rising water cuts off sand  │
                               │ (Isolation)              │ spit path to dry dune line. │
                               └──────────────────────────┴─────────────────────────────┘
                                                          │
                                                          ▼
                               ┌────────────────────────────────────────────────────────┐
                               │               BATHER AWARENESS TRANSITIONS             │
                               │  UNAWARE  ──▶  SUSPICIOUS (Amber Halo)  ──▶  FLEEING   │
                               │               (Reaction Delay: 0.8-2.0s)    (Red Halo) │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │
                                                          ▼
                               ┌────────────────────────────────────────────────────────┐
                               │             AUTONOMOUS ESCAPE VECTOR ROUTING           │
                               │  - In Deep Rip Channel (y > 280, depth > 1.1m):        │
                               │    Lateral Traverse along X-axis to shallow sandbar    │
                               │  - In Shallow Water / Swash (y <= 280m):               │
                               │    Steepest gradient to dry backshore dune (y = 60m)   │
                               └────────────────────────────────────────────────────────┘
```

### 1. Bather Awareness States
* **`UNAWARE`**: Normal recreation, wading, or swimming.
* **`SUSPICIOUS`**: Detects sudden backwash pull, sand liquefaction under feet, or surging depth. Displays a dashed **Amber Sensory Halo (`#f59e0b`)** with human reaction delay countdown ($0.8\text{--}2.0\text{s}$).
* **`FLEEING`**: Overcomes hesitation; accelerates by $1.4\times$ along their calculated **Escape Vector** towards safety. Rendered with a **Pulsating Red Halo (`#f43f5e`)** and a neon green directional escape arrow pointing along the corridor.
* **`TRAPPED`**: Surrounded by deep water runnels with exhausted stamina. Renders a **Pulsating Purple Halo (`#d946ef`)** with an SOS ping for emergency rescue intervention.

### 2. Autonomous Escape Vector Rules
* **Caught in Offshore Rip Jet:** Bathers **never swim straight against the offshore current**. Instead, the system navigates them **laterally parallel to the shoreline** ($\vec{e} = (\pm 1.0, -0.2)$) into shallow sandbars before heading in.
* **In Shallow Swash / Dunes:** Bathers route directly along the steepest dry gradient toward high dune berms and emergency evacuation points (`EP-01`, `EP-02`, `EP-03`).

### 3. Warning Propagation Layers
1. **Smart Acoustic Siren Arrays:** High-decibel sirens on lifeguard towers emit expanding concentric soundwave rings, instantly triggering the `FLEEING` state for all bathers in acoustic range.
2. **Autonomous Drone Sorties:** UAV drones fly over hazardous zones, drop flotation gear, strobe red LED beacons, and broadcast loudspeaker evacuation commands.
3. **Geofence Push Alerts:** Virtual geofences send edge cellular/BLE alerts to mobile devices on beach sectors.

---

## 🛡️ Sensor Failure Modes & Fail-Safe Architecture

In coastal environments, hardware sensors frequently face harsh conditions. Our system implements an autonomous fail-safe architecture to guarantee continuous operation even during total sensor failure.

```
       [ Acoustic Tide Gauge ]      [ Radar Sensor ]      [ Buoy Telemetry ]
                 │                          │                     │
                 ▼                          ▼                     ▼
          (Confidence c₁)            (Confidence c₂)       (Confidence c₃)
                 └──────────────────────────┼─────────────────────┘
                                            │
                                            ▼
                           ┌─────────────────────────────────┐
                           │   Sensor Fusion & Anomaly Check │
                           └────────────────┬────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    │ Divergence < Threshold?                      │
                    ▼ YES                                           ▼ NO / All Offline
         ┌─────────────────────────┐                   ┌─────────────────────────┐
         │ Weighted Fusion Value   │                   │ Deterministic Fallback  │
         │ x̂ = Σ(xᵢ·cᵢ) / Σcᵢ      │                   │ Physics Imputation      │
         └──────────┬──────────────┘                   └────────────┬────────────┘
                    │                                               │
                    └───────────────────────┬───────────────────────┘
                                            │
                                            ▼
                            ┌───────────────────────────────┐
                            │ Conservative Safety Buffer    │
                            │ (Escalate Flag to Lifeguards) │
                            └───────────────────────────────┘
```

### Physical Causes of Sensor Faults
1. **Biofouling & Marine Encrustation:** Barnacles and algae crusting over submerged acoustic Doppler current profiler (ADCP) heads and ultrasonic transducers.
2. **Salt Spray & Optical Lens Occlusion:** Evaporating salt crust and fog deposits on CCTV & FLIR camera domes, degrading computer vision confidence.
3. **High Surf & Debris Striking:** Extreme surf forces ($>3.5\text{m}$) displacing wave buoys or shearing communication cables.
4. **Thermal Saturation & Sensor Drift:** High solar radiation heating electronics to $55^\circ\text{C}$, drifting baseline calibrations.
5. **RF Packet Dropouts & High Moisture Jitter:** Dense coastal fog and rain attenuating wireless telemetry links.

---

### Handling Failures (Always Fail-Safe)

#### 1. Confidence-Weighted Multi-Sensor Fusion
When multiple sensors monitor the same parameter (e.g. ultrasonic tide gauge + radar level sensor):
$$\hat{x} = \frac{\sum_{i=1}^n x_i \cdot c_i}{\sum_{i=1}^n c_i}, \quad \bar{c} = \frac{\sum c_i}{n}$$
As a sensor degrades or produces noisy spikes, its confidence coefficient $c_i$ is dynamically discounted.

#### 2. Cross-Sensor Conflict & Anomaly Detection
If the divergence between overlapping sensors exceeds a physical tolerance ($|x_1 - x_2| > \Delta_{\text{max}}$), the system:
- Isolates and quarantines the divergent sensor.
- Emits a `SENSOR_TELEMETRY_ANOMALY` hazard alert.
- Adjusts overall zone confidence downwards.

#### 3. Deterministic Synthetic Fallback Imputation
If all physical IoT sensors in a zone go offline (power loss or severed cable):
- The platform automatically activates the **Deterministic Physics Engine** (`EnvironmentEngine.ts`).
- Uses astronomical harmonic ephemeris ($M_2$ tidal formulas) and atmospheric pressure barometrics to impute realistic water levels and rip current estimations.

#### 4. Fail-Safe Conservative Escalation Policy
Whenever telemetry confidence drops below safety thresholds:
- The system expands safety buffers and raises warning flag levels (e.g., escalating from Green to Yellow/Red earlier).
- Ensures that **missing data never causes a false sense of security**.

#### 5. Offline Edge Store-and-Forward Buffering
- On-site edge gateways store raw telemetry in ring buffers during network outages and automatically drain and reconcile ordered telemetry upon reconnection.

---

## ⚡ Low-Latency Simulation Cache Layer

To support thousands of simultaneous visitors and multi-spectral canvas rendering at 60 FPS without lag, derived calculations are cached in an in-memory Map layer (`src/cache/SimulationCache.ts`):

```
       React UI / Multi-Spectrum Renderer (60 FPS)
                           │
                 Low-Frequency UI Updates
                           │
                           ▼
                 ┌───────────────────┐
                 │  Simulation Cache │
                 │ (In-Memory Maps)  │
                 └─────────┬─────────┘
                           │
             Frequently Requested Derived Data
             (Spatial Index, Risk Scores, Snapshots)
                           │
                           ▼
                 Simulation & Physics Engine
```

* **Spatial Lookup Memoization:** Caches nearest-hazard calculations and spatial neighborhood lookups (`nearby-hazards:${visitor.id}:${spatialVersion}`) with short TTLs.
* **Risk Calculation Caching:** Reuses derived zone risk scores until environmental state or visitor counts change.
* **Non-Authoritative Architecture:** The cache is completely disposable. If invalidated or cleared, the simulation continues seamlessly from raw physical state.

---

## 🎛️ Manual Risk & Scenario Control Lab

The **Experiment Control Lab** (`ExperimentControlLab.tsx`) allows operators and researchers to manipulate the underlying environment in real-time:

```
┌────────────────────────────────────────────────────────┐
│               MANUAL ENVIRONMENT CONTROLS              │
├────────────────────────────────────────────────────────┤
│ Wave Height          0.4m ──────────●────── 3.5m       │
│ Current Speed        0.2m/s ────────●────── 2.0 m/s    │
│ Tide Change Rate     0.0m/hr ───────●────── 1.0 m/hr   │
│ Wind Speed           5 km/h ────────●────── 70 km/h    │
│ Visibility           0.3 km ────────●────── 10 km      │
│ Visitor Count        20 ────────────●────── 5000       │
│                                                        │
│ [ Apply Custom State ]     [ Reset to Auto-Physics ]   │
└────────────────────────────────────────────────────────┘
```

> [!NOTE]
> Adjusting a slider changes the **physical ocean conditions**, not an artificial "Risk Score". The increased wave height or current speed naturally propagates through the hydrodynamic equations, expands the rip channel, increases swimmer drift, elevates exposure, and triggers autonomous safety interventions.

---

## 🚀 Quick Start & Running the Project

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher

---

### 1. Start the FastAPI Safety Backend

```bash
# Navigate to backend
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI server on port 8000
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
* **API Documentation (Swagger UI):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **Health Endpoint:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

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

## 🧪 Verification & Pytest Suite

Run the full automated test suite covering hydrodynamic calculations, sensor fusion, geofence breaches, and autonomous dispatch:

```bash
cd backend
python -m pytest -v
```

### Test Coverage Highlights
* `test_iot_sensor_fusion.py`: Verifies confidence-weighted sensor fusion, conflict detection, and offline edge buffers.
* `test_hazard_engine.py`: Verifies wave energy, rip velocity, tidal surge, and squall detection thresholds.
* `test_risk_engine.py`: Verifies the Hazard $\times$ Exposure $\times$ Vulnerability formulation.
* `test_decision_engine.py`: Verifies autonomous flag updates, PA siren triggers, and lifeguard/drone dispatch rules.
* `test_gis_geofencing.py`: Verifies dynamic boundary calculations and restricted zone intrusion alarms.

---

## 📄 License
This project is licensed under the MIT License.
