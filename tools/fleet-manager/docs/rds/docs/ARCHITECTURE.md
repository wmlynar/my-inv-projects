# Architecture Overview

## Current state (what exists now)

- `robokit-proxy` sits between Roboshop and a robot and logs TCP traffic.
- `robokit-sim` is a minimal Robokit TCP simulator (GoTarget + status).
- `task-manager` schedules simple pick/drop tasks and talks to `robokit-sim` over TCP.
- `fleet-manager` is a UI prototype with map, worksites, robots, streams.

## Target state (where we want to go)

- A TCP-compatible Robokit simulator that Roboshop accepts as a robot.
- Fleet manager backend that controls real robots via the discovered protocol.
- UI fully connected to backend state and live robot status.

## Data flow (today)

```
Roboshop -> robokit-proxy -> Robot (real)
                 |
                 +-> logs (traffic.jsonl + c2s.bin/s2c.bin)

task-manager -> robokit-sim (TCP / RBK frames)
fleet-manager -> local static data (graph/workflow)
```

## Data flow (target)

```
fleet-manager UI <-> backend (fleet manager)
backend <-> robokit (TCP API, real robot or simulator)
Roboshop <-> robokit (optional integration)
```

## Key constraints

- TCP protocol is framed (16-byte header + JSON body).
- Logs are chunked by TCP, not by protocol frames.
- Simulator is minimal (not a full Roboshop-compatible robot yet).

## Traffic core layering (robustness)

Shared traffic logic is split into small, testable modules:
- `fleet-traffic-core/src/core/time.js`: single time semantics ([start, end) in ms).
- `fleet-traffic-core/src/core/reservations.js`: generic resource reservations with transactions.
- `fleet-traffic-core/src/core/timing_model.js`: observed travel times (EWMA + p95).
- `fleet-traffic-core/src/core/robustness_profile.js`: config profiles + legacy mapping.
- `fleet-traffic-core/src/core/critical_sections.js`: critical-section tokens + capacity.
- `fleet-traffic-core/src/core/scheduler.js`: slot finding + schedule build/repair.

The simulator (`fleet-sim-core/src/sim.js`) consumes these modules and owns the
runtime loop/executor; scheduling + repair live behind the robustness pipeline.
