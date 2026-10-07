# Coastal Beach Safety Simulation Platform Architecture

## 1. System Vision & Philosophy

The **Andhra Pradesh Integrated Coastal Beach Safety Simulation Platform** is built following a **Simulation-First Development Philosophy**.

Rather than starting with physical hardware deployments (CCTV cameras, IoT wave buoys, live drones, external weather APIs), the platform first builds an ultra-modular **Digital Beach Simulation Environment** and a deterministic **Central Safety Engine**.

```
DIGITAL BEACH (Simulator)
    ├── Progressive Hydrodynamics (Tide, Waves, Currents, Weather)
    ├── Spatial Geometry (1000m x 300m RK Beach / Rushikonda Bathymetry)
    ├── Visitors (Kinematics, Water Immersion, Stamina, Distress States)
    └── Resource Management (Lifeguards, Drones, PA Sirens, LED Boards)
             │
             ▼
      CENTRAL SAFETY ENGINE
    ┌────────┴────────┐
    ▼                 ▼
Hazard Engine   Risk Engine (Hazard × Exposure)
    │                 │
    └────────┬────────┘
             ▼
      Decision Engine (Explainable Safety Directives)
             │
             ▼
      Response Engine (Resource Allocation & Dispatch)
             │
             ▼
SIMULATION DASHBOARD (Next.js + WebSocket + Canvas)
```

### Clean Interface Isolation
All telemetry interfaces (`EnvironmentalState`, `Visitor`, `HazardDetection`, `ZoneRiskAssessment`, `Decision`, `SafetyResponse`) are decoupled via strict Pydantic schemas. 

When transitioning to real-world sensors:
- Simulated wave data $\rightarrow$ Real acoustic wave gauge / ADCP data
- Simulated bather detection $\rightarrow$ CCTV Computer Vision bounding boxes
- Simulated drone dispatch $\rightarrow$ Real MAVLink drone mission controller

---

## 2. Core Architectural Components

### A. Digital Beach Simulator (`app/simulation/`)
- **`environment.py`**: Smooth temporal dynamics for progressive rip current formation (e.g. 0.20 m/s $\rightarrow$ 0.65 m/s), tidal cycles, wave shoaling, and sensor fault injections.
- **`visitors.py`**: Crowd dynamics, bather distribution across safe vs caution zones, hydrodynamic advection in rip channels, stamina decay, and distress escalation (`TIRED` $\rightarrow$ `STRUGGLING` $\rightarrow$ `DROWNING_ACTIVE` $\rightarrow$ `RESCUED`).
- **`beach_layout.py`**: 4-zone spatial structure (Zone A: Swimming, Zone B: Rip Channel, Zone C: General Bathing, Zone D: Restricted Cliffs), 3 Lifeguard towers, 2 AeroGuard Drones, 4 Warning Boards, 4 PA Sirens.
- **`scenarios.py` & `event_scheduler.py`**: Scenario catalog supporting standard days, rising tides, progressive rip current formation, swimmer distress, squalls, sensor dropouts, and chaos testing.

### B. Central Safety Engine (`app/safety/`)
- **Hazard Detection Engine (`hazard_engine.py`)**: Pure oceanographic rule evaluation (Wave energy, rip velocity, tidal rate, squall conditions, and sensor anomalies).
- **Risk Assessment Engine (`risk_engine.py`)**: Maintains strict separation between:
  - $\text{Environmental Hazard}$ (Physical threat severity)
  - $\text{Human Exposure}$ (Number and immersion level of people inside hazard zone)
  - $\text{Swimmer Vulnerability}$ (Distress, exhaustion, non-swimmers)
  - $\text{Operational Risk} = w_h \cdot \text{Hazard} + w_e \cdot \text{Exposure} + w_v \cdot \text{Vulnerability}$
- **Decision Engine (`decision_engine.py`)**: Generates explainable directives including `hazard_type`, `severity`, `affected_zone`, `confidence`, `reason`, and `recommended_actions`.
- **Response Engine (`response_engine.py`)**: Allocates nearest lifeguards, launches autonomous drones, activates zone warning flags and PA audio alerts, and tracks latency at each step.

---

## 3. Metrics & Latency Benchmarks (`app/simulation/metrics_engine.py`)

Every simulation run continuously tracks:
- **Detection Latency**: Time elapsed from physical hazard / swimmer distress onset to detection.
- **Decision Latency**: Time elapsed to formulate safety directives.
- **Warning Latency**: Time elapsed to update PA broadcasts and LED warning signage.
- **Dispatch Latency**: Time elapsed to dispatch nearest lifeguard / drone unit.
- **Resolution Time**: Duration from incident start to safe shore retrieval.
- **Safety Funnel**: People exposed $\rightarrow$ Warned $\rightarrow$ Safely Evacuated $\rightarrow$ Rescued.
