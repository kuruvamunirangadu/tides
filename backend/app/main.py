"""
Main FastAPI Application Entrypoint
Integrates Central Safety Engine, Digital Beach Simulation, REST APIs, and live WebSocket feed.
"""

import asyncio
import json
from contextlib import asynccontextmanager
from typing import Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api import beach, health, incidents, metrics, simulation, telemetry, vision, audio, perception, calibration, emergency, regional, operations, wristband
from app.simulation.simulator import BeachSimulator

# Global Simulator Instance
simulator = BeachSimulator(seed=42)

# Wire singleton simulator into API routers
beach.set_simulator_instance(simulator)
simulation.set_simulator_instance(simulator)
incidents.set_simulator_instance(simulator)
metrics.set_simulator_instance(simulator)

# WebSocket Active Connections
active_websockets: Set[WebSocket] = set()
simulation_task: asyncio.Task = None


async def simulation_loop():
    """
    Continuous background loop that advances the simulation at 1 Hz real-time tick
    and broadcasts state updates to all connected frontend WebSockets.
    """
    while True:
        try:
            if simulator.is_running and not simulator.is_paused:
                # Step the simulation engine
                state = simulator.step(dt=1.0)
                state_json = state.model_dump_json()

                # Broadcast to all connected clients
                if active_websockets:
                    disconnected = set()
                    for ws in active_websockets:
                        try:
                            await ws.send_text(state_json)
                        except Exception:
                            disconnected.add(ws)
                    active_websockets.difference_update(disconnected)

            await asyncio.sleep(1.0)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Error in simulation loop: {e}")
            await asyncio.sleep(1.0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global simulation_task
    simulation_task = asyncio.create_task(simulation_loop())
    yield
    if simulation_task:
        simulation_task.cancel()


app = FastAPI(
    title="Andhra Pradesh Integrated Coastal Beach Safety Simulation Platform",
    description="Digital Beach Simulation & Central Safety Engine for Coastal Hazard Mitigation",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST Routers
app.include_router(health.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")
app.include_router(beach.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(telemetry.router)
app.include_router(vision.router)
app.include_router(audio.router)
app.include_router(perception.router)
app.include_router(calibration.router, prefix="/api")
app.include_router(emergency.router, prefix="/api")
app.include_router(regional.router, prefix="/api")
app.include_router(operations.router, prefix="/api")
app.include_router(wristband.router, prefix="/api")


@app.websocket("/ws/simulation")
async def websocket_simulation_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.add(websocket)
    
    # Send immediate current state upon connection
    initial_state = simulator.get_state_snapshot()
    await websocket.send_text(initial_state.model_dump_json())

    try:
        while True:
            # Listen for client control commands over WebSocket if any
            data = await websocket.receive_text()
            try:
                cmd = json.loads(data)
                action = cmd.get("action")
                if action == "pause":
                    simulator.is_paused = True
                elif action == "resume":
                    simulator.is_paused = False
                elif action == "step":
                    state = simulator.step(dt=1.0)
                    await websocket.send_text(state.model_dump_json())
            except Exception:
                pass
    except WebSocketDisconnect:
        active_websockets.discard(websocket)
    except Exception:
        active_websockets.discard(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
