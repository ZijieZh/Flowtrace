---
name: launch_plan
description: Launch checklist + the analytics instrumentation needed to read the test cleanly.
reads:
  - variant_gen/variants.md
writes:
  - launch_plan.md
---

# Launch Plan

Source skill: **ads** (Universal Pre-Launch Checklist + Budget Allocation / ramp) composed with
**analytics** (Tracking Plan Framework, Event Naming object_action, UTM Parameter Strategy,
Validation Checklist — "track for decisions, not data").

Turn the variants into a ship-ready plan with the instrumentation to measure it. Two parts:

1. **Launch checklist** (from the ads pre-launch list): conversion tracking tested with a real
   conversion, landing fast + mobile-friendly, UTMs working, budget + allocation set, targeting
   matches intent. Schedule the launch to respect any dayparting the timing diagnosis surfaced.
2. **Tracking instrumentation** (from analytics): the exact events (object_action names) and
   properties the primary/secondary/guardrail metrics need, the UTM scheme (source/medium/
   campaign/content) that distinguishes control vs. treatment, the conversions to mark, and the
   validation steps (DebugView, no double-fires, no PII). Without this the test isn't readable —
   that is the point of folding analytics into launch.

Write `launch_plan.md`: the checklist, the tracking plan (event table + UTM scheme + conversions
+ validation), and the go/no-go gate.
