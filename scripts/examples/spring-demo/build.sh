#!/usr/bin/env bash
# Spring animation demo — builds a small DAG one step per commit so the UI
# can showcase the production Spring entrance + edge-draw animations on a
# live trace. Each `author_step` is a separate commit; the `trace serve`
# watcher emits a TraceUpdated SSE event on each one, the frontend
# re-fetches, and `useNodeEnterObserver` tags the newly-rendered node so
# the CSS animation fires.
#
# Topology (diamond → fan-out → merge):
#
#                  ┌── step_2 (Clean) ────┐
#   step_1 (Load) ─┤                       ├─ step_4 (Analyze) ─┐
#                  └── step_3 (Validate) ─┘                    │
#                                                              ├── step_5 (Model) ────┐
#                                                              │                       ├─ step_7 (Report)
#                                                              └── step_6 (Visualise) ┘
#
# Usage:
#   bash scripts/examples/spring-demo/build.sh        # 3s pacing (default)
#   STEP_DELAY=2 bash scripts/examples/spring-demo/build.sh
#
# After it finishes: http://localhost:3001/traces/spring-demo
# (Requires `trace serve --scope ~/traces` running, and Vite dev on 3001.)

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# Default STEP_DELAY to 3s for this builder — must be set BEFORE sourcing
# _lib.sh because that file does `STEP_DELAY="${STEP_DELAY:-0}"` which
# becomes a no-op once STEP_DELAY is non-empty. The :=3 here only fires
# when the user didn't pre-set the env var.
: "${STEP_DELAY:=3}"
# shellcheck disable=SC1091
source "$HERE/../_lib.sh"

# Trace shell + deliverable are paced too — the empty graph then deliverable
# scaffolding gives the user a beat to switch to the browser before steps fire.
init_empty
scaffold_deliverable

author_step step_1 "add step_1 (Load Data)"
author_step step_2 "add step_2 (Clean) — depends on step_1"
author_step step_3 "add step_3 (Validate) — depends on step_1"
author_step step_4 "add step_4 (Analyze) — depends on step_2 + step_3"
author_step step_5 "add step_5 (Model) — depends on step_4"
author_step step_6 "add step_6 (Visualise) — depends on step_4"
author_step step_7 "add step_7 (Report) — depends on step_5 + step_6"

echo
echo "  Done. Open: http://localhost:3001/traces/spring-demo"
