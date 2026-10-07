# 🏖️ Digital Beach Simulation Engine & Multi-Spectrum Canvas

> **High-Performance 2D Multi-Spectral Coastal Digital Twin & Experiment Lab**

The frontend simulation client for the Coastal Beach Safety Platform. Built with **React 18**, **TypeScript**, **Vite**, and an accelerated **HTML5 Canvas Engine** capable of rendering thousands of autonomous agents, hydrodynamic particle flows, and satellite/thermal imaging at 60 FPS.

---

## 🛰️ 4 Multi-Spectral Visual Modes

Switch visual modes instantly using the floating dock:

```
┌────────────────────────────────────────────────────────────────────────┐
│  [ Tactical ]   [ 🛰️ Satellite ]   [ 🔥 Thermal FLIR ]   [ 🌊 Hydro ]   │
└────────────────────────────────────────────────────────────────────────┘
```

1. **🛰️ Satellite Optical Reconnaissance View:**
   - Procedural bathymetric depth gradient (deep blues to turquoise shallows).
   - Sandbars and submerged rip channel trench contours.
   - Dynamic breaking wave crests and foam trails.
   - GPS Telemetry HUD (`17°42'14.2"N 83°19'48.5"E`), scale bar ($1\text{px} \approx 0.8\text{m}$), and True North reticle.

2. **🔥 Thermal Infrared (FLIR / Search & Rescue) View:**
   - Military Ironbow false-color spectrum ($18^\circ\text{C}$ ocean vs $31^\circ\text{C}$ sand).
   - $37^\circ\text{C}$ white-hot human thermal cores with glowing radiant coronas.
   - Night Search and Rescue mode to locate offshore drifting swimmers.
   - Temperature calibration gradient bar ($16^\circ\text{C} \longleftrightarrow 42^\circ\text{C}$).

3. **🌊 Hydrodynamic Streamlines View:**
   - Real-time particle vectors showing feeder current convergence and seaward rip current jet acceleration.

4. **🗺️ Tactical Vector Map:**
   - Designated swimming zones (`SZ-01`, `SZ-02`), restricted reef zone (`RZ-01`), lifeguard watch cones, CCTV camera field of views, and dynamic safety flags.

---

## ⚡ Low-Latency Simulation Cache (`src/cache/`)

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
            Derived Data (Spatial Neighbors,
             Risk Memoization, Snapshots)
                          │
                          ▼
                Simulation & Physics Engine
```

* **Spatial Grid Indexing:** Accelerates nearest-hazard calculations and spatial neighborhood lookups (`nearby-hazards:${visitor.id}:${spatialVersion}`).
* **Risk Score Memoization:** Avoids redundant calculations when environmental factors or bather counts remain unchanged.
* **Performance Suite:** Live FPS, TPS, tick latency metrics, and 7-tier stress test ($50 \rightarrow 5,000$ agents).

---

## 🎛️ Experiment Control Lab (`src/components/ExperimentControlLab.tsx`)

Adjust underlying physical parameters in real-time:
* **Wave Height:** $0.4\text{m} \longleftrightarrow 3.5\text{m}$
* **Current Speed:** $0.2\text{m/s} \longleftrightarrow 2.0\text{m/s}$
* **Tide Change Rate:** $0.0\text{m/hr} \longleftrightarrow 1.0\text{m/hr}$
* **Wind Speed:** $5\text{ km/h} \longleftrightarrow 70\text{ km/h}$
* **Fog / Visibility:** $0.3\text{ km} \longleftrightarrow 10\text{ km}$
* **Visitor Population:** $20 \longleftrightarrow 5,000$ bathers

---

## 🚀 Running the Simulator

```bash
# Navigate to directory
cd beach-safety-simulator

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your web browser.
