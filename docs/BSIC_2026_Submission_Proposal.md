# Beach Safety Innovation Challenge 2026

## TIDES
### Integrated Coastal Beach Safety, Early Warning and Rapid Response Platform

**Applicant:** Proposal of Beach  
**Applicant category:** Startup  
**Proposed pilot location:** To be finalised with the Government of Andhra Pradesh  
**Submission status:** Prototype and simulation-validated platform; proposed field pilot  
**Date:** October 2026

---

## 1. Executive summary

Andhra Pradesh has approximately 975 kilometres of coastline and beaches that
serve tourists, residents, students, pilgrims, and local communities. Rip
currents, rapidly changing waves, tidal variation, underwater drop-offs,
adverse weather, and crowd exposure can turn a normal visit into a life-safety
incident. Existing measures such as flags, static boards, and manual patrols
are essential, but they are difficult to scale across large and changing
coastal environments.

**TIDES** is an integrated coastal safety platform that moves beach operations
from predominantly reactive rescue toward proactive risk identification,
real-time awareness, early warning, and coordinated response. It combines:

- deterministic environmental hazard and risk intelligence;
- buoy and shoreline sensor ingestion with health monitoring;
- edge computer-vision detection interfaces for swimmer and zone events;
- geospatial beach zones and geofencing;
- multilingual warnings through public address, digital boards, and wearable
  haptics;
- lifeguard, drone, and emergency resource coordination;
- a digital twin for training, scenario testing, and operational rehearsal;
- an Impact Lab for measuring prediction, reliability, and response performance.

The current repository contains a working prototype with a FastAPI safety core,
React/Vite digital twin, Next.js command dashboard, scenario library, backend
tests, browser tests, and ESP32-S3/SX1262 wristband firmware design. The
proposed next step is a controlled pilot at a selected Andhra Pradesh beach,
with qualified authorities, lifeguards, sensor providers, and emergency
responders participating in validation.

TIDES is intentionally designed as an explainable and human-supervised
decision-support system. It does not claim to replace lifeguards, emergency
services, or statutory approvals.

---

## 2. Challenge alignment

The proposal directly addresses the challenge objective:

> Develop an innovative, technology-enabled Integrated Beach Safety Solution
> for Andhra Pradesh that proactively identifies, monitors, and mitigates risks,
> supports real-time situational awareness, enables early warning, and
> facilitates faster emergency response.

| Challenge requirement | TIDES response |
| --- | --- |
| Risk identification | Wave, rip-current, tide, wind, visibility, sensor anomaly, exposure, geofence, and distress assessment |
| Real-time monitoring | Live simulation state, REST ingestion, WebSocket stream, command dashboard, and operational metrics |
| Early warning | Risk-based flags, digital warning boards, PA messages, multilingual audio, and wristband haptic/LED warnings |
| Emergency response | Explainable dispatch decisions for lifeguards, drones, patrols, incidents, and evacuation actions |
| Large-scale monitoring | Reusable beach profiles, regional services, zone-based architecture, edge ingestion, and multi-beach design |

---

## 3. Problem and opportunity

### 3.1 Current operational challenge

Beach safety teams must make decisions while conditions, visitor locations, and
available resources change continuously. Current approaches can be limited by:

1. incomplete visibility across wide beaches;
2. delayed recognition of rip-current development;
3. sensor or camera outages that are not obvious to operators;
4. difficulty identifying a struggling swimmer among normal surf activity;
5. fragmented communication between visitors, lifeguards, police, and
   emergency responders;
6. lack of repeatable training scenarios and objective response metrics.

### 3.2 Opportunity

An integrated platform can provide a common operational picture and support
earlier, more consistent action without removing human judgement. The highest
value is not a single sensor or a single dashboard; it is the connection
between detection, risk, warning, response, and post-incident learning.

---

## 4. Proposed solution

TIDES processes environmental conditions and visitor observations through an
explainable safety pipeline:

```text
Buoys / weather / tide / CCTV / wristbands
                  |
                  v
      Validation, health and sensor fusion
                  |
                  v
          Hazard detection and confidence
                  |
                  v
      Zone hazard + exposure + vulnerability
                  |
                  v
       Explainable decision and prioritisation
                  |
                  v
 Flags | PA | boards | lifeguards | drones | incidents
                  |
                  v
       Metrics, replay, audit and improvement
```

### 4.1 Core operating loop

At each backend simulation or observation cycle, TIDES:

1. updates or receives the environmental state;
2. updates or receives visitor and detection state;
3. detects active hazards and sensor anomalies;
4. calculates zone-level operational risk;
5. creates a decision with reason, confidence, affected zone, and actions;
6. applies warning and dispatch policies;
7. records response and latency metrics.

The prototype backend operates at an approximately 1 Hz safety tick. The visual
digital twin may render faster for user experience; display frame rate is not
presented as the safety decision rate.

### 4.2 Explainability

Every central decision is designed to expose:

- hazard type and severity;
- affected zone;
- confidence;
- reason;
- recommended actions;
- relevant telemetry and visitor counts;
- response status and event history.

This allows a lifeguard or evaluator to understand why a warning or dispatch
was recommended.

---

## 5. Ten innovation areas

| # | Innovation area | TIDES implementation | Current maturity |
| ---: | --- | --- | --- |
| 1 | Artificial intelligence | Explainable hazard rules, risk scoring, decision graphs, and replaceable forecasting interfaces | Working deterministic intelligence; ML extension planned after data collection |
| 2 | Computer vision | Edge detection ingestion, swimmer/posture event contracts, tracking, association, and incident evidence | Prototype integration; field accuracy validation required |
| 3 | IoT | Buoy telemetry API, sensor health, confidence, anomaly handling, and degraded mode | Working interface and simulated inputs; live sensor pilot required |
| 4 | Drones/UAVs | Resource registry, patrol/rescue dispatch logic, coverage concepts, and incident response simulation | Simulated response; aviation and flight validation required |
| 5 | GIS | Beach layouts, zones, coordinates, regional registry, and WGS84/local transformation endpoints | Prototype spatial model; survey-grade beach data required |
| 6 | Geofencing | Restricted zones, seaward boundaries, zone membership, and breach response | Prototype geofencing; GPS and field calibration required |
| 7 | Sensors | Wave, tide, rip, wind, visibility, status, freshness, and anomaly scenarios | Simulated/ingestion-ready; calibration and redundancy required |
| 8 | Mobile technologies | Lifeguard-oriented dashboard, live operational state, visitor/wristband workflows | Web prototype; field-device usability testing required |
| 9 | Predictive analytics | Rip-current trend forecasting, MAE, lead time, scenario comparison, and tide/risk propagation | Working evaluation lab; historical data validation required |
| 10 | Intelligent communication | Flags, digital boards, PA alerts, Telugu/English/Hindi messages, LEDs, and haptics | Prototype content and controls; public-address/device testing required |

---

## 6. Technical architecture

### 6.1 Components

| Component | Technology | Role |
| --- | --- | --- |
| Central safety engine | Python, FastAPI, Uvicorn, Pydantic | Simulation, ingestion contracts, hazard/risk/decision/response pipeline |
| Digital twin and Impact Lab | React, TypeScript, Vite, Three.js, Playwright | Spatial visualisation, training, prediction/reliability/replay evaluation |
| Command dashboard | Next.js, React, Recharts, Tailwind | Operator situational awareness and controls |
| Wristband prototype | ESP32-S3, SX1262 LoRa, C/C++ | SOS, heartbeat, warning acknowledgement, haptic/LED feedback |
| Scenario and test layer | JSON scenarios, Pytest, Playwright, TypeScript suites | Repeatable evaluation, fault injection, regression protection |

### 6.2 Safety engines

- **Hazard Engine:** detects wave, rip, tide, weather, and sensor anomaly
  conditions.
- **Risk Engine:** separates physical hazard, visitor exposure, and vulnerability.
- **Decision Engine:** prioritises active distress and produces explainable
  safety actions.
- **Response Engine:** applies flags, boards, PA, patrol, rescue, drone, and
  incident actions.
- **Metrics Engine:** records detection, decision, warning, dispatch, and
  resolution metrics.

### 6.3 Data and security boundaries

The current prototype keeps state in memory and is intended for simulation and
evaluation. A production pilot will add:

- authenticated APIs and role-based access;
- durable event and incident storage;
- encrypted transport and secrets management;
- gateway-side wristband HMAC and replay enforcement;
- audit logs and operator approvals;
- privacy-preserving CCTV retention and access controls;
- signed configurations and controlled rollback.

---

## 7. Safety and risk calculation

The current prototype uses configurable, transparent formulas.

### 7.1 Zone hazard score

Hazard severity is mapped to a scalar:

```text
NONE = 0.00, LOW = 0.25, MODERATE = 0.50,
HIGH = 0.80, CRITICAL = 1.00
```

For each applicable hazard:

```text
hazard_value = severity_scalar × confidence
zone_hazard_score = maximum applicable hazard_value
```

Restricted zones and rip-channel zones also have configured baseline risk.

### 7.2 Exposure score

```text
exposure_score =
  min(1.0,
      (0.10 × all_visitors
       + 0.40 × waders
       + 1.00 × deep_swimmers)
      / max(1, zone_swimmer_capacity))
```

### 7.3 Vulnerability score

```text
vulnerability_score =
  min(1.0, 0.40 × distressed_visitors + 0.05 × deep_swimmers)
```

### 7.4 Operational risk

```text
total_risk =
  clamp(0.55 × hazard_score
      + 0.35 × exposure_score
      + 0.10 × vulnerability_score, 0.0, 1.0)
```

The prototype maps risk to green, yellow, or red operating recommendations.
Thresholds will be recalibrated with local observations and approved operating
procedures during a pilot.

---

## 8. Pilot proposal

### 8.1 Proposed approach

TIDES proposes a staged pilot at one selected Andhra Pradesh beach, with the
final location agreed with the department. Rushikonda and Suryalanka are
available as prototype beach profiles, but the pilot site should be selected
using visitor volume, incident history, existing infrastructure, network
availability, authority readiness, and permission requirements.

### 8.2 Pilot phases

#### Phase 1: Site study and baseline

- survey beach geometry, zones, access, towers, exits, and existing assets;
- collect historical incidents and operating procedures;
- identify sensor, CCTV, network, power, and privacy constraints;
- define baseline response and warning metrics.

#### Phase 2: Shadow-mode installation

- connect selected sensors and camera feeds;
- run TIDES without automatically changing public warnings;
- compare detections with lifeguard observations;
- tune thresholds and measure false positives/false negatives.

#### Phase 3: Controlled operational assistance

- expose alerts to trained operators;
- require human acknowledgement before public escalation;
- test warning boards, PA, lifeguard workflows, and optional wristbands;
- conduct planned drills for rip, distress, sensor failure, and network outage.

#### Phase 4: Evaluation and scale decision

- compare performance against the baseline;
- document safety, usability, cost, availability, and maintenance;
- produce a go/no-go report for additional beaches.

### 8.3 Pilot outputs

1. site and data-readiness report;
2. configured beach GIS and hazard zones;
3. connected sensor/CCTV integration report;
4. operator dashboard and training package;
5. drill and incident evaluation report;
6. cost and maintenance model;
7. scale-up recommendation.

---

## 9. Proposed success metrics

Final targets must be approved after the baseline study. The pilot will measure:

| Metric | Measurement approach |
| --- | --- |
| Hazard detection latency | hazard onset or trusted observation to system detection |
| Decision latency | detection to explainable safety decision |
| Warning latency | decision to operator acknowledgement and warning activation |
| Dispatch latency | accepted incident to resource dispatch |
| Distress detection recall | confirmed distress events detected by the system |
| False-alert rate | alerts not confirmed by operator or drill evidence |
| Sensor availability | fresh valid observations divided by expected observations |
| Geofence accuracy | verified position classifications against surveyed boundaries |
| Operator usability | task completion time, acknowledgement errors, and structured feedback |
| System availability | service and integration uptime during pilot hours |
| Safety funnel | exposed, warned, evacuated, assisted, and rescued counts |

TIDES will not claim reduced drownings from simulation alone. Any public-safety
impact claim will be based on approved pilot evidence and a documented
comparison method.

---

## 10. Expected public value

If validated in the pilot, TIDES can help:

- provide earlier recognition of dangerous water conditions;
- give lifeguards a shared view of beach zones and active incidents;
- reduce time between detection, warning, and resource dispatch;
- maintain degraded operation when a sensor or camera feed fails;
- deliver accessible warnings through more than one channel;
- train teams against repeatable scenarios without waiting for a real emergency;
- create evidence for prioritising investment across multiple beaches.

The system is designed to augment, not replace, lifeguards and emergency
services. Human operators remain responsible for real-world intervention.

---

## 11. Risk management and safeguards

| Risk | Proposed safeguard |
| --- | --- |
| Sensor outage or incorrect reading | freshness, confidence, anomaly detection, redundancy, and manual-watch fallback |
| Computer-vision false negative | multiple observation sources, operator review, drills, and measured recall |
| False alarm or alert fatigue | severity prioritisation, deduplication, cooldowns, and human acknowledgement |
| Network/backend outage | local operating procedures, gateway buffering, degraded mode, and recovery testing |
| Unauthorised control | authentication, role-based access, audit logging, and approval gates |
| CCTV privacy risk | purpose limitation, access control, retention policy, and privacy review |
| Wristband spoofing/replay | device identity, sequence numbers, timestamps, HMAC, CRC, and gateway enforcement |
| Drone operational risk | certified operators, geofencing, manual override, weather limits, and statutory approvals |
| Incorrect geofence | field survey, coordinate transformation validation, and periodic calibration |
| Unsafe automation | warnings and dispatch recommendations remain human-supervised during pilot |

---

## 12. Implementation status

### Implemented in the repository

- FastAPI central safety engine;
- deterministic environment and visitor simulation;
- wave, rip, tide, weather, and sensor anomaly hazards;
- zone exposure and vulnerability risk calculation;
- explainable decision and simulated response engines;
- simulation scenarios and fault injection;
- telemetry, vision, perception, calibration, emergency, regional, operations,
  and wristband API groups;
- React/Vite digital twin and Impact Lab;
- Next.js operations dashboard;
- backend and browser/domain test suites;
- ESP32-S3/SX1262 wristband firmware prototype and packet design;
- technical architecture, security, hardware, and release documentation.

### Requires pilot validation or production engineering

- live marine sensor connections and site calibration;
- real CCTV inference accuracy and privacy controls;
- field-tested drone and flotation payload operations;
- durable production storage and audit trail;
- authenticated multi-tenant deployment;
- operator training and emergency-service integration;
- cost validation and maintenance plan;
- statutory, aviation, radio, maritime, and procurement approvals.

---

## 13. Commercial and deployment model

The proposed model is a staged deployment:

1. paid site assessment and pilot configuration;
2. pilot installation and integration;
3. annual software, monitoring, calibration, and support;
4. per-beach expansion using reusable platform components;
5. optional hardware, wristband, sensor, and drone integration packages.

The final commercial proposal will include:

- pilot capital cost;
- annual operating and maintenance cost;
- cost per beach and monitored kilometre;
- hardware replacement assumptions;
- connectivity and hosting assumptions;
- training and support;
- low-cost and full-capability configurations.

Pricing should be finalised after the site survey and department requirements are
known rather than presenting unsupported estimates.

---

## 14. Requested support from the challenge

The applicant requests consideration for:

- selection for a controlled Andhra Pradesh beach pilot;
- access to relevant authorities and operational stakeholders;
- permission to validate the system in a supervised environment;
- access to suitable non-sensitive historical and live operational data;
- technical review with lifeguards, police, emergency responders, and coastal
  experts;
- guidance on procurement, DPIIT documentation, and scale-up requirements.

---

## 15. Applicant information to complete before upload

The following fields must be completed by the applicant before submission:

- legal startup name;
- registered address and state;
- founder/contact name;
- email and phone;
- DPIIT certificate number and copy, if applicable;
- incorporation/registration documents;
- GST/PAN details, if requested;
- team profiles;
- selected pilot beach or pilot-selection rationale;
- requested funding, pilot support, or procurement pathway;
- final cost estimate;
- demo URL/video;
- declaration of prototype and safety limitations.

---

## 16. Supporting project evidence

- [Technical project README](../README.md)
- [Existing technical proposal](./AP_Beach_Safety_Project_Proposal.md)
- [Architecture document](./architecture.md)
- [Backend safety engine](../backend/app/safety/)
- [Backend tests](../backend/tests/)
- [Digital twin and Impact Lab](../beach-safety-simulator/src/)
- [Scenario definitions](../scenarios/)
- [Wristband hardware specification](../firmware/wristband/HARDWARE_SPECIFICATION.md)
- [Wristband security and reliability](../firmware/wristband/SECURITY_AND_RELIABILITY.md)

---

## 17. Declaration

TIDES is submitted as an explainable prototype and proposed pilot platform for
coastal beach safety. Simulation results, prototype interfaces, and design
specifications will not be represented as certified field performance. Any live
deployment will be conducted only with appropriate authority, safety review,
human supervision, data protection, and statutory approvals.

