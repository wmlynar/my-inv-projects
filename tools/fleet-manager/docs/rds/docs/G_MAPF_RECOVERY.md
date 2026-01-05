# G-MAPF Recovery Mechanisms

This document summarizes the recovery and anti-deadlock controls exposed for G-MAPF in RDS.
Source of truth: `robokit-sim/rds_params.json` (section `RDSDispatcher`).
Behavior is implemented in the RDS core; the "recovery role" notes below are intent-level summaries
based on the parameter names and descriptions.

## Conceptual flow

G-MAPF recovery is typically a layered process:
1) Detect conflicts, blocking, or rotation deadlocks.
2) Try local deconfliction (spacing, detours, priority, cycle handling).
3) If still blocked, trigger recovery actions (release points, strategy switch, reset).
4) Continue with continuity and relaxation settings to avoid oscillation.

## Scope, strategy switching, and fallback

| Param | Default | Description | Recovery role |
| --- | --- | --- | --- |
| `G-MAPF` | `false` (bool) | Global Multi-Agent Path Finding | Enables the recovery layer at all. |
| `G-MAPF-OnlyLocalArea` | `false` (bool) | Activate MAPF Locally | Limit recovery to local conflict regions to avoid global churn. |
| `G-MAPF-AutoStrategy` | `false` (bool) | Allow Algorithm Modify Strategy of MAPF Automatically | Allows the solver to switch strategies when blocked. |
| `G-MAPF-PlanB` | `0` (int32) | Apply Other Strategy when Blocked | Explicit fallback strategy selector for blocked cases. |
| `G-MAPF-Continuity` | `0` (int32) | Continuity of Planning | Controls plan stability to reduce thrash in recovery. |

## Conflict detection and cycle identification

| Param | Default | Description | Recovery role |
| --- | --- | --- | --- |
| `G-MAPF-DetailConflict` | `false` (bool) | Use detail func to search conflict | Increases conflict detection precision. |
| `G-MAPF-PPCPConlict` | `false` (bool) | G-MAPF will always consider pp cp conflict | Adds more conflict classes to trigger recovery earlier. |
| `G-MAPF-CollisionDetection` | `0.05` (double) | Safety threshold for collision detection | Lower thresholds flag conflicts earlier. |
| `G-MAPF-LocationPrecise` | `0.15` (double) | Location Precise for Path Planning | Higher precision reduces false negatives in conflict checks. |
| `G-MAPF-OneStepConlict` | `true` (bool) | G-MAPF will control onestep task which has conflict | Lets the solver intervene even for short tasks. |
| `G-MAPF-CircleCount` | `3` (int32) | Number of AGVs of Circle Conflicts | Detects cycles once enough AGVs are involved. |
| `G-MAPF-CircleScale` | `1` (int32) | Length of Step of Circle Conflicts | Step granularity for cycle detection. |
| `G-MAPF-PseudoCircle` | `0` (int32) | Scale of Pseudo Circle Conflicts | Detects near-cycles to prevent early deadlocks. |

## Cycle and rotation recovery

| Param | Default | Description | Recovery role |
| --- | --- | --- | --- |
| `G-MAPF-CircleLock` | `5` (double) | Make AGVs keep distance at least (meter) | Enforces spacing inside cycles to break deadlocks. |
| `G-MAPF-AutoRotateDt` | `0` (double) | Auto condition for recover in detection of rotation | Trigger threshold for rotation-based recovery. |
| `G-MAPF-RotateDetection` | `0` (double) | Rotate Detection for Auto Highway | Detects rotation conflicts on auto-highways. |
| `G-MAPF-RotateEstimation` | `false` (bool) | Rotate Estimation for Single Point | Estimates rotation cost to avoid tight blocking. |

## Release and unblock actions

| Param | Default | Description | Recovery role |
| --- | --- | --- | --- |
| `G-MAPF-AutoRelease` | `false` (bool) | Allow Algorithm Modify Properties of Points to Release Automatically | Lets the solver relax or release points to unlock jams. |
| `G-MAPF-MutexRelease` | `false` (bool) | All mutex will be set as release point | Converts mutex points into releases to clear blockage. |
| `G-MAPF-Recover` | `false` (bool) | Recovering when AGVs Are Blocked | Enables recovery action when blocked is detected. |
| `G-MAPF-RecoverDelay` | `50` (int32) | Delay for recovering blocked state | Wait time before recovery is triggered. |
| `G-MAPF-RecoveringRandomly` | `false` (bool) | Recovering Based on Random Strategy | Randomized recovery to escape deterministic deadlocks. |
| `G-MAPF-IgnoreAwayPath` | `false` (bool) | AGV will be reset when its flag is awaypath | Hard reset of stuck robots to break deadlocks. |
| `G-MAPF-MovablePark` | `false` (bool) | Movable Park-Point Based on MAPF | Allows relocation of park points to free congestion. |

## Detours, spacing, and priority

| Param | Default | Description | Recovery role |
| --- | --- | --- | --- |
| `G-MAPF-Detour` | `50` (double) | The longest detour dist | Allows detours to bypass blocked areas, bounded by max distance. |
| `G-MAPF-AutoSpacing` | `false` (bool) | Auto Spacing Between Robots | Dynamically increases spacing when congestion appears. |
| `G-MAPF-SafeSpacing` | `0` (double) | Safe Spacing Between Robots | Fixed minimum spacing to reduce blocking. |
| `G-MAPF-MovingFirst` | `false` (bool) | Robots in motion have higher planning priority | Prefers moving robots to reduce stop-and-block chains. |
| `G-MAPF-NearestCount` | `0` (int32) | Auto mutex area will be created based on number of nearest AGVs | Creates local mutex zones to reduce contention. |
| `G-MAPF-Relaxation` | `20` (double) | Relaxation of Solving Conflicts | Loosens constraints so a feasible plan is found sooner. |
| `G-MAPF-RepeatedPathDelay` | `0` (double) | Delay for Repeated Path | Prevents oscillation by delaying repeated routes. |

## Staging and local planning limits

| Param | Default | Description | Recovery role |
| --- | --- | --- | --- |
| `G-MAPF-DispatchingLength` | `8` (int32) | Max Distance of Dispatching Path (m) | Limits how far dispatch paths extend into conflicts. |
| `G-MAPF-TransferLimit` | `20` (double) | Limit of Searching Station (m) | Caps search range to avoid deep deadlock exploration. |
| `G-MAPF-PreDestination` | `5` (int32) | Number of Prepared Target for Unavailable Destination | Stages alternative targets if the main one is blocked. |
| `G-MAPF-PreDistance` | `15` (double) | The Prepared Distance of AGV (m) | Enables early staging to reduce last-minute blocks. |

## E-MAPF heuristics (vendor-specific)

These parameters are labeled as E-MAPF and are used to adjust internal heuristics.
Their exact behavior is not documented in the repo, so the notes below are minimal.

| Param | Default | Description | Recovery role |
| --- | --- | --- | --- |
| `G-MAPF-EF-1` | `true` (bool) | Apply E-MAPF Detection | Enables extra detection heuristics. |
| `G-MAPF-EF-2` | `3` (int32) | Degree of Auto Highway | Adjusts automatic highway behavior to reduce conflicts. |
| `G-MAPF-EF-3` | `false` (bool) | Ranked Strongly | Strengthens ranking heuristics in conflict resolution. |
| `G-MAPF-EF-5` | `false` (bool) | Disperse Edge to Single Point | Consolidates edges to reduce ambiguous conflicts. |
| `G-MAPF-EF-6` | `false` (bool) | Advanced Auto Queue of AGVs | Enables queueing heuristics for congested areas. |
| `G-MAPF-EF-7` | `1` (double) | The Stress of EF-5 | Controls the strength of EF-5 behavior. |
| `G-MAPF-EF-8` | `2` (double) | The Stress of Auto Expand | Controls aggressiveness of auto-expansion heuristics. |
| `G-MAPF-EF-9` | `0` (double) | Proximation for curve to avoid collision | Adds curvature approximation to avoid collisions. |

## Notes

The parameters above are configuration-level controls.
To validate their real behavior, observe RDS logs while toggling them in isolation.
