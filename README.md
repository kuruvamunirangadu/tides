# TIDES

## Coastal Beach Safety Digital Twin and Early-Warning Platform

TIDES is a simulation-first coastal safety platform for modelling beach conditions,
detecting hazards, estimating visitor exposure, issuing explainable safety decisions,
and coordinating simulated emergency responses. The repository combines:

- a **FastAPI central safety engine** and deterministic beach simulator;
- a **React + Vite digital twin and Impact Lab**;
- a **Next.js command-and-control dashboard**;
- **ESP32-S3/SX1262 wristband firmware** and its binary radio contract;
- repeatable scenarios, calibration workflows, regional coordination services, and
  architecture/release documentation.

> **Important scope statement:** this repository is an engineering prototype and
> evaluation environment. It is not a certified life-safety system. Thresholds,
> geospatial data, sensor calibration, radio security, operational procedures, and
> human approval workflows must be validated by qualified coastal-safety,
> maritime, aviation, radio, and security specialists before field deployment.

## Table of contents

1. [What the system does](#what-the-system-does)
2. [Architecture](#architecture)
3. [Runtime components](#runtime-components)
4. [End-to-end data flow](#end-to-end-data-flow)
5. [Safety model and formulas](#safety-model-and-formulas)
6. [Hazard and risk thresholds](#hazard-and-risk-thresholds)
7. [Scenarios and evaluation](#scenarios-and-evaluation)
8. [API and integration surface](#api-and-integration-surface)
9. [Wristband protocol](#wristband-protocol)
10. [Repository layout](#repository-layout)
11. [Local development](#local-development)
12. [Testing and verification](#testing-and-verification)
13. [Operations and observability](#operations-and-observability)
14. [Risk register and how risks are detected](#risk-register-and-how-risks-are-detected)
15. [Production-readiness gaps](#production-readiness-gaps)
16. [Contributing](#contributing)
17. [License](#license)

---

## What the system does

At every simulation tick, TIDES:

1. advances the environmental model (waves, tide, wind, visibility, rip flow,
   weather, and sensor health);
2. advances visitor movement, immersion, fatigue, and distress state;
3. applies scheduled scenario events and fault injections;
4. detects hazards using explicit rules;
5. computes zone-level hazard, exposure, vulnerability, and total risk;
6. creates explainable decisions (flags, warnings, evacuation, patrol, or rescue);
7. executes simulated responses using lifeguards, drones, PA systems, boards, and
   incidents;
8. records metrics, events, and a bounded history buffer for replay.

The same state can be viewed through:

- the **digital twin**, which emphasises spatial simulation and visual operations;
- the **Impact Lab**, which evaluates prediction, reliability, and coordination;
- the **command dashboard**, which emphasises operational status and telemetry;
- REST and WebSocket interfaces for integration and automated tests.

The default backend seed is `42`, making scenario runs reproducible unless a
different seed is supplied.

## Architecture

```text
                 SIMULATED OR EXTERNAL INPUTS
       ┌─────────────────────────────────────────────┐
       │ Environment │ Scenarios │ Buoys │ CCTV │ Band│
       └─────────────┬───────────────┬───────────────┘
                     │               │
                     ▼               ▼
       ┌──────────────────────┐  ┌───────────────────┐
       │ EnvironmentSimulator │  │ REST ingestion    │
       │ VisitorSimulator     │  │ telemetry/vision │
       │ EventScheduler       │  │ perception/band  │
       └──────────────┬───────┘  └─────────┬─────────┘
                      └──────────────┬─────┘
                                     ▼
                         ┌──────────────────────┐
                         │ Central Safety Core  │
                         │ Hazard → Risk →      │
                         │ Decision → Response  │
                         └──────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
       Simulation state       Operational APIs       Metrics/history
              │                     │                     │
              ▼                     ▼                     ▼
       WebSocket `/ws/`       Next.js dashboard    Impact Lab/reports
       Vite digital twin      lifeguard workflows   replay/evaluation
```

### Architectural boundaries

The backend uses Pydantic models as the contracts between simulation, sensing,
decision, and response layers. This keeps simulated inputs replaceable by
adapters for real systems:

| Prototype input | Intended production adapter |
| --- | --- |
| `EnvironmentSimulator` | validated wave, tide, weather, and current sensors |
| visitor simulator | edge CV detections and tracked identities |
| `POST /api/telemetry/buoy` | buoy/ADCP gateway with authentication and replay protection |
| `POST /api/vision/frame` or `/detections` | edge inference gateway |
| simulated drone/lifeguard resources | dispatch, radio, and mission-control integrations |
| wristband event API | authenticated LoRa gateway service |

The current backend is an in-process service: state, incidents, resource status,
and history live in memory and are lost on restart. There is no database,
message broker, authentication middleware, or durable event store in the
repository.

## Runtime components

| Component | Stack | Default URL | Responsibility |
| --- | --- | --- | --- |
| Central safety engine | Python 3.10+, FastAPI, Uvicorn, Pydantic | `http://localhost:8000` | Simulation, safety pipeline, REST APIs, WebSocket |
| Digital twin and Impact Lab | React 19, TypeScript, Vite, Three.js, Tailwind, Playwright | `http://localhost:5173` | 2D/3D visualisation, visitor and hazard views, evaluation demos |
| Operations dashboard | Next.js 14, React 18, Recharts, Tailwind | `http://localhost:3000` | Command-centre view, live state, operational controls |
| Wristband firmware | ESP32-S3, SX1262 LoRa, C/C++ | hardware | SOS, heartbeat, warning acknowledgement, indicators |

The backend simulation loop advances at **1 Hz** and broadcasts JSON state to
connected clients. The browser simulator can render visual updates at a higher
frame rate; rendering rate must not be confused with backend safety evaluation
rate.

### Central safety pipeline

`backend/app/simulation/simulator.py` orchestrates the following sequence:

```text
Environment + visitors
        ↓
HazardEngine.evaluate()
        ↓
RiskEngine.assess_risk()
        ↓
DecisionEngine.make_decisions()
        ↓
ResponseEngine.execute_decisions()
        ↓
MetricsEngine.update() + state/history snapshot
```

- **Hazard engine**: rule-based wave, rip, tide, weather, and sensor anomaly
  detections with severity, confidence, affected zones, and raw telemetry.
- **Risk engine**: separates physical hazard from people exposed and visitor
  vulnerability before combining them.
- **Decision engine**: produces explainable actions and prioritises active
  swimmer distress.
- **Response engine**: updates flags, boards, PA state, resources, incidents,
  and response logs.
- **Metrics engine**: tracks the safety funnel and operational latency fields.

## End-to-end data flow

### 1. Environmental state

The environment simulator produces a timestamped state containing wave height and
period, wave direction, rip speed and channel, tide level/rate/direction, wind,
visibility, weather, and sensor statuses. Scenario overrides initialise values;
scheduled events then change them over simulated time.

### 2. Visitor state

Visitors are assigned to beach zones and have a swimming status and distress
state. The visitor simulator updates position, water exposure, drift, fatigue,
and state transitions. Edge-CV and wristband APIs provide additional integration
paths for observed people and events.

### 3. Detection and assessment

Every active hazard includes:

- a generated identifier and type;
- severity (`NONE`, `LOW`, `MODERATE`, `HIGH`, `CRITICAL`);
- affected zones;
- confidence;
- a human-readable reason;
- timestamp and raw telemetry.

For each zone, risk includes hazard, exposure, vulnerability, total score, flag
recommendation, counts, and primary factors.

### 4. Decisions and responses

Distressed visitors generate rescue, drone, and PA actions. Zone risk generates
flag and warning-board actions; severe rip flow adds evacuation and PA actions.
Sensor degradation recommends a sensor-failure flag and drone patrol. The
response engine applies cooldowns and resource availability before creating
response records.

### 5. Broadcast and replay

`/ws/simulation` sends an initial snapshot and subsequent snapshots. The backend
retains up to 1,200 snapshots for in-memory replay. Incidents and recent events
are also bounded/in-memory; clients should treat the stream as live state, not
as an audit log.

## Safety model and formulas

### Hazard severity mapping

Each hazard severity is converted to a scalar:

| Severity | Scalar |
| --- | ---: |
| `NONE` | `0.00` |
| `LOW` | `0.25` |
| `MODERATE` | `0.50` |
| `HIGH` | `0.80` |
| `CRITICAL` | `1.00` |

For a zone, each applicable hazard is confidence-weighted:

```text
hazard_value = severity_scalar × sensor_or_rule_confidence
zone_hazard_score = max(applicable hazard_value)
```

If there is no active hazard, the baseline is `0.05`. Restricted zones have a
minimum hazard score of `0.70`; rip-channel zones have a minimum of `0.45`.

### Exposure

For visitors in a zone:

```text
in_water = waders + deep_swimmers
exposure_raw =
    (0.10 × all_visitors
     + 0.40 × waders
     + 1.00 × deep_swimmers) / max(1, zone_swimmer_capacity)
exposure_score = min(1.0, exposure_raw)
```

The model therefore treats deep water exposure as more consequential than
shoreline presence and caps the score at `1.0`.

### Vulnerability

```text
vulnerability_score =
    min(1.0, 0.40 × distressed_visitors + 0.05 × deep_swimmers)
```

Any visitor whose distress state is not `NONE` or `RESCUED` contributes to the
distressed count.

### Operational risk

With the default weights:

```text
total_risk =
    0.55 × hazard_score
  + 0.35 × exposure_score
  + 0.10 × vulnerability_score
total_risk = clamp(total_risk, 0.0, 1.0)
```

Risk categories are:

| Condition | Risk level | Recommended flag |
| --- | --- | --- |
| any active distress | `CRITICAL` | `RED` |
| score `>= 0.80` | `HIGH` | `RED` |
| score `>= 0.60` | `HIGH` | `RED` |
| score `>= 0.30` | `MODERATE` | `YELLOW` |
| otherwise | `LOW` | `GREEN` |

The `0.60` boundary is the configured orange/action threshold but the current
flag implementation maps it to `RED`; do not interpret it as a separate orange
flag without changing the decision contract and its tests.

### Forecast and evaluation metrics

The browser Impact Lab uses timestamped trend extrapolation:

```text
v̂(t + h) =
  clamp(v(t) + h × (v(t) - v(t - Δt)) / Δt, 0.0, 3.2)
```

Mean absolute error is:

```text
MAE = (1 / N) × Σ |forecast_i - observed_i|
```

For incident response, the Golden Window is configured as a target of
`180 seconds`. A lead-time measurement is conceptually:

```text
lead_time = event_time - alert_time
```

These are evaluation metrics, not guarantees of real-world prediction or
response performance.

## Hazard and risk thresholds

The defaults are defined in
[`backend/app/config/thresholds.py`](D:/MUNI%20RANGADU%20KURUVA/tides-main/backend/app/config/thresholds.py).
They are configuration values, not universal coastal standards.

| Signal | Caution | Warning/danger | Critical/closure |
| --- | ---: | ---: | ---: |
| Wave height | `1.2 m` | `2.0 m` | `2.8 m` |
| Rip speed | `0.25 m/s` | `0.40 m/s` warning; `0.60 m/s` danger | `0.90 m/s` |
| Tide level | — | `1.8 m` | — |
| Tide rate | — | `0.6 m/hour` | — |
| Wind | `18 kt` | `28 kt` | weather logic escalates severe conditions |
| Visibility | below `500 m` | — | — |
| Long-period swell | `12 s` with wave height `>= 0.9 m` | — | — |

The hazard engine also checks weather values such as squall and thunderstorm.
Sensor-health anomalies can become hazards and cause degraded-operation
recommendations.

## Scenarios and evaluation

Scenario JSON files live in [`scenarios/`](D:/MUNI%20RANGADU%20KURUVA/tides-main/scenarios/):

| Scenario | Purpose |
| --- | --- |
| `normal.json` | Calm baseline and safe bathing |
| `rip_current.json` | Progressive Zone B rip formation and pre-incident warning |
| `rising_tide.json` | Rising water and sandbar/shoreline pressure |
| `sensor_failure.json` | Missing or degraded environmental telemetry |
| `swimmer_distress.json` | Distress detection, dispatch, and incident lifecycle |

The backend also exposes operations endpoints for scenario execution, readiness,
metrics, and JSON/Markdown reports. The browser Impact Lab contains:

- **Predict**: multi-horizon rip forecasting, trend/persistence comparison,
  coverage, lead-time, missed/false alarm scoring;
- **Remain reliable**: camera/sensor freshness, isolated failure injection,
  degraded downstream output detection, and recovery behaviour;
- **Coordinate**: incident event recording, deduplication, ordered replay,
  response milestones, and Golden Window analysis.

The Impact Lab is an observer/evaluation layer. It should not silently mutate
the central safety model when producing scores.

## API and integration surface

The canonical interactive contract is available at
[`http://localhost:8000/docs`](http://localhost:8000/docs) when the backend is
running. The main route groups are:

| Group | Representative routes | Purpose |
| --- | --- | --- |
| Health | `GET /api/` | Liveness check |
| Simulation | `GET /api/simulation/state`, `POST /api/simulation/control`, `POST /api/simulation/load-scenario` | State and controls |
| Beach | `GET /api/beach/layout`, `/zones`, `/lifeguards`, `/drones` | Layout/resources |
| Incidents | `GET /api/incidents/active`, `/recent` | Incident views |
| Metrics | `GET /api/metrics/evaluation` | Safety/evaluation metrics |
| Telemetry | `POST /api/telemetry/buoy`, `GET /api/telemetry/status` | Buoy ingest/status |
| Vision | `POST /api/vision/frame`, `/detections`, `GET /api/vision/detections/active` | CV inputs |
| Perception | `POST /api/perception/ingest`, `GET /api/perception/state`, `/coverage`, `/candidates` | Tracking/fusion |
| Audio | `POST /api/audio/trigger` | Audio broadcast payloads |
| Calibration | `/api/calibration/*` | Sources, observations, geography, experiments |
| Emergency | `/api/emergency/*` | Zones, exits, routes, incidents, recommendations |
| Regional | `/api/regional/*` | Multi-beach summaries, risk, incidents, resources |
| Operations | `/api/operations/*` | Readiness, modes, scenarios, reports |
| Wristband | `POST /api/wristband/event`, `GET /api/wristband/devices` | Band events/devices |

The WebSocket endpoint is:

```text
ws://localhost:8000/ws/simulation
```

After connecting, the server sends a JSON snapshot immediately. The client may
send JSON control messages such as `{"action":"pause"}`,
`{"action":"resume"}`, or `{"action":"step"}`. REST and WebSocket input handling
should be treated as trusted prototype interfaces until authentication,
authorization, validation, and rate limiting are added.

## Wristband protocol

The firmware target is an ESP32-S3 with a Semtech SX1262 LoRa transceiver. The
implementation and documents are in
[`firmware/wristband/`](D:/MUNI%20RANGADU%20KURUVA/tides-main/firmware/wristband/).

The uplink packet contains:

- `TI` magic bytes and protocol version;
- message type (`SOS_TRIGGER`, `HEARTBEAT`, `SOS_CANCEL`, or `WARNING_ACK`);
- 12-byte device ID and monotonic sequence number;
- device timestamp, battery voltage/percentage, and status flags;
- truncated HMAC-SHA256 tag and CCITT-FALSE CRC16.

The downlink supports warning category, haptic pattern, LED pattern, expiry,
gateway acknowledgement, HMAC, and CRC. The configured radio channels are
865.2 MHz and 865.5 MHz, with a 10-second SOS retransmission interval and
60-second standby heartbeat.

The firmware documentation specifies replay checks, HMAC authentication, channel
fallback, bounded queues, and outage buffering. Those controls must be enforced
by the gateway/backend integration as well; a packet format or firmware comment
alone does not provide end-to-end security.

## Repository layout

```text
tides-main/
├── backend/
│   ├── app/
│   │   ├── api/             REST routers
│   │   ├── calibration/     observations, geo transforms, experiments
│   │   ├── config/          safety thresholds and weights
│   │   ├── emergency/       evacuation and emergency coordination
│   │   ├── models/          Pydantic domain contracts
│   │   ├── operations/      readiness, scenarios, reports
│   │   ├── perception/      tracking, association, fusion, evidence
│   │   ├── regional/        multi-beach registries and aggregation
│   │   ├── safety/          hazard, risk, decision, response engines
│   │   ├── simulation/      environment, visitors, scheduler, metrics
│   │   └── vision/          detection adapter
│   ├── tests/               backend unit/integration-style tests
│   ├── Dockerfile
│   └── requirements.txt
├── beach-safety-simulator/
│   ├── src/
│   │   ├── impact-lab/      forecast, reliability, replay evaluation
│   │   ├── simulation/      browser simulation and risk propagation
│   │   ├── scene3d/         Three.js hazards and world
│   │   ├── visitors/        analysis and crowd behaviour
│   │   ├── drones/          coverage and surveillance
│   │   ├── regional/        coordination
│   │   └── wristbands/      registry, UI, and tests
│   └── tests/                Playwright browser/e2e suites
├── frontend/
│   ├── app/                  Next.js routes and dashboard
│   ├── components/           dashboard visual components
│   └── lib/api.ts            backend REST/WebSocket client
├── firmware/wristband/       embedded source, headers, and safety docs
├── scenarios/                scenario JSON definitions
├── docs/                     architecture, proposal, phase/release documents
├── docker-compose.yml        backend + dashboard containers
└── README.md                 this system manual
```

Generated or local-only directories such as `node_modules`, `.next`, `.venv`,
test reports, caches, and scratch screenshots are not part of the runtime
architecture and should not be committed.

## Local development

### Prerequisites

- Node.js compatible with the installed frontend toolchains;
- Python 3.10 or newer;
- PowerShell on Windows or an equivalent shell;
- optional Docker Desktop for the backend/dashboard compose stack.

### Start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Open [Swagger UI](http://localhost:8000/docs) or
[ReDoc](http://localhost:8000/redoc).

### Start the digital twin

```powershell
cd beach-safety-simulator
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Start the command dashboard

```powershell
cd frontend
npm install
$env:NEXT_PUBLIC_API_BASE = "http://127.0.0.1:8000"
$env:NEXT_PUBLIC_WS_BASE = "ws://127.0.0.1:8000"
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dashboard defaults to
the same loopback backend URLs when these variables are not set.

### Run with Docker Compose

```powershell
docker compose up --build
```

Compose starts the backend on port `8000` and the Next.js dashboard on port
`3000`. The Vite simulator is not included in the compose file and must be
started separately.

## Testing and verification

Run focused checks from the relevant project directory:

```powershell
# Backend
cd backend
pytest -v

# Digital twin type-check/build and lint
cd ..\beach-safety-simulator
npm run lint
npm run build

# Browser smoke/e2e suites
npm run test:smoke
npm run test:e2e

# Impact Lab and domain suites
npm run test:phase8-replay
npm run test:unit

# Dashboard
cd ..\frontend
npm run build
```

Use `npm run` in `beach-safety-simulator` to see the exact available scripts;
the project currently exposes phase-specific scripts for tidal, risk,
coordination, surveillance, swimmer analysis, forensic replay, and wristband
tests. Do not report a test as passed unless the command was run against the
current checkout.

Minimum verification for a change to the central pipeline:

1. run the affected backend test module;
2. run a scenario that exercises the changed hazard/decision;
3. inspect `/api/simulation/state` and `/ws/simulation`;
4. run the frontend build if a contract or displayed field changed.

## Operations and observability

### Startup checks

- confirm `GET /api/` responds;
- confirm `/docs` loads and route schemas match the client;
- confirm the simulation is running and `tick`/`sim_time_seconds` advance;
- confirm a WebSocket client receives an initial snapshot and subsequent ticks;
- confirm the selected scenario and seed are visible in state;
- confirm the dashboard shows a live connection indicator.

### Incident investigation

Use the state snapshot and event fields in this order:

1. `environment` and sensor statuses: was the input fresh and plausible?
2. `hazards`: which rule fired, with what confidence and raw telemetry?
3. `risk_assessments`: which zone had hazard, exposure, or vulnerability?
4. `decisions`: which action was recommended and why?
5. `responses` and `active_incidents`: was an available resource dispatched?
6. `metrics` and `recent_events`: what latency or funnel transition occurred?

If a decision is surprising, reproduce the scenario with the same seed before
changing a threshold. If the result cannot be reproduced, investigate shared
in-memory state, clock/timestamp handling, and concurrent clients first.

## Risk register and how risks are detected

This register describes the risks visible in the current implementation and the
control or evidence needed to identify each one. It is not a safety case or a
substitute for a formal hazard analysis.

| Risk | How TIDES detects or exposes it | Current control | Remaining concern |
| --- | --- | --- | --- |
| High wave energy | wave height/period threshold in `HazardEngine` | severity and zone decision | thresholds are configurable prototype values; no sensor calibration proof |
| Rip-current escalation | rip speed thresholds and affected channel | warning, evacuation, PA, patrol/rescue actions | no validated hydrodynamic forecast or uncertainty model in backend |
| Rapid tide/run-up | tide level and rate thresholds | high-tide hazard and zone flagging | local datum, shoreline geometry, and inundation model require validation |
| Squall, wind, or low visibility | weather, wind, and visibility checks | hazard and degraded operational recommendation | external weather feed, provenance, and stale-data policy are incomplete |
| Sensor dropout/staleness | sensor health, anomaly hazards, perception coverage, Impact Lab fault injection | degraded output and drone/manual-watch recommendation | no durable alerting, escalation owner, or production watchdog |
| Sensor disagreement/spike | fusion/quarantine paths and scenario tests | confidence reduction or quarantine | acceptance rules and calibration evidence must be site-specific |
| Visitor exposure | zone membership, swimming status, water immersion counts | exposure score and flag decisions | CV identity/tracking errors can undercount or double-count people |
| Swimmer distress | visitor distress state, posture/detection inputs, wristband events | priority rescue decisions and incident creation | false negatives are life-critical; human confirmation and redundancy are required |
| Resource unavailable | response engine checks resource status/availability | alternative patrol/drone actions and incident state | no real dispatch acknowledgement, reservation, or failover integration |
| Slow rescue response | incident timestamps and response latency metrics | Golden Window/latency reporting | metrics are simulated and not a guaranteed SLA |
| Duplicate or out-of-order observations | Impact Lab event recorder and perception components | deduplication/reordering tests | backend REST endpoints need explicit idempotency keys |
| Backend restart/data loss | bounded in-memory state is observable at restart | replay/history for current process | no database, durable queue, or audit trail |
| API misuse or unauthorized control | route surface is documented | CORS and schema validation only | wildcard CORS, no auth/RBAC, and control endpoints are unsafe for production |
| WebSocket failure | client connection state and reconnect-capable client code | clients can refresh/reconnect | no guaranteed delivery, sequence acknowledgement, or stream replay |
| RF replay/spoofing | firmware contract specifies sequence, timestamp, HMAC, CRC | embedded-side design and security document | gateway enforcement and key lifecycle are not implemented here |
| RF jamming/outage | firmware channel fallback and queue design | retransmission/fallback specification | availability must be tested at the target beach; queue durability is not backend durability |
| Battery or hardware failure | firmware battery telemetry and LED/haptic states | heartbeat and low-battery status fields | no fleet battery service or maintenance workflow |
| Geofence breach | zones, restricted areas, CV/perception candidates | warning and patrol decisions | coordinate transforms and GPS accuracy need field survey and drift monitoring |
| Model/configuration drift | scenario tests, calibration endpoints, readiness reports | repeatable seeded tests and manifests | no signed configuration, approval workflow, or rollback registry |
| Alert fatigue | PA cooldown and deduplicated replay events | 30-second PA cooldown by default | cooldown must be validated with human factors and incident severity |
| Multilingual warning failure | audio payload generation and explicit language scripts | Telugu/English/Hindi content paths | browser/Web Speech and public-address delivery need real-device testing |
| Unsafe automation | explainable decisions and simulated resources | human-readable reasons and metrics | no formal human-in-the-loop gate for real flags, aircraft, or evacuations |

### Risk triage procedure

When a risk is observed:

1. capture the scenario ID, seed, simulated timestamp, client, and endpoint;
2. save the relevant environment, hazard, risk, decision, response, and event
   records;
3. reproduce with the same seed and no external fault injection;
4. classify the failure as input, detection, assessment, decision, execution,
   transport, or presentation;
5. add a focused regression test before changing production defaults;
6. document whether the mitigation changes a safety threshold, a response policy,
   or only an operator display.

## Production-readiness gaps

Before field use, the following areas require explicit engineering work and
acceptance evidence:

1. **Identity and access**: authentication, role-based authorization, operator
   audit logs, secrets management, and secure CORS/TLS configuration.
2. **Durability**: persistent event/incident store, schema migrations, backups,
   replayable message transport, and idempotent ingestion.
3. **Time and ordering**: synchronized clocks, monotonic event IDs, timestamp
   validation, late-data handling, and exactly-once or safely idempotent actions.
4. **Sensor assurance**: calibration, provenance, health scoring, redundancy,
   site-specific thresholds, and safe behaviour during uncertainty.
5. **CV assurance**: measured precision/recall by lighting and sea state, human
   review paths, privacy controls, retention policy, and identity protection.
6. **Dispatch integration**: real resource availability, acknowledgements,
   geofenced mission constraints, abort/fail-safe controls, and aviation/maritime
   approvals for drones and vessels.
7. **Radio security**: gateway-side HMAC/CRC verification, key provisioning and
   rotation, anti-replay state, jamming detection, secure boot, and firmware
   update signing.
8. **Human factors**: language review, audible/visual accessibility, operator
   training, alert prioritisation, and exercises with emergency services.
9. **Performance and resilience**: load tests, chaos tests, network partitions,
   graceful degradation, resource limits, and recovery-time objectives.
10. **Governance**: safety case, privacy impact assessment, incident reporting,
    change approval, versioned configuration, and rollback procedures.

## Contributing

Keep changes narrow and preserve the contracts between the backend, browser
clients, dashboard, scenarios, and firmware. When changing a Pydantic model,
route, threshold, packet field, or state value:

1. update all consumers and the relevant documentation;
2. add or update a focused test and scenario;
3. state whether the change affects simulated safety behaviour or only display;
4. run the smallest relevant test/build commands;
5. avoid committing generated dependencies, caches, screenshots, credentials, or
   local environment files.

## License

This project is licensed under the [MIT License](LICENSE).
