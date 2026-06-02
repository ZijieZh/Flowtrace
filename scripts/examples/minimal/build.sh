#!/usr/bin/env bash
# Minimal demo — walks an agent through the smallest valid trace while
# exercising a broad slice of the CLI surface (validate / lint / show --fmt
# json|mermaid|dot / run new / run rename / run show / step running/done /
# reply / deliverable). The trajectory is tiny (one step) but covers status
# transitions, an interim partial reply, a re-run, and a comparison reply.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/../_lib.sh"

# ── Authoring: scaffold the trace one piece at a time ───────────────────
init_empty
scaffold_deliverable
author_step say_hello

# ── Orientation: exercise read-side CLI surfaces ──────────────────────────
cli validate >/dev/null
cli lint >/dev/null 2>&1 || true   # lint is advisory; non-zero is fine
cli show --fmt json    >/dev/null
cli show --fmt mermaid >/dev/null
cli show --fmt dot     >/dev/null

# ── Start the run ─────────────────────────────────────────────────────────
RUN=$(cli run new --name "minimal (untitled)" | tail -1)
cli run list >/dev/null
cli run rename "Minimal — one-step lifecycle demo" --run "$RUN" >/dev/null

# Peek state via the CLI before acting on the step.
cli run show --run "$RUN" >/dev/null

# ── say_hello: running → partial reply → done → reply ─────────────────────
step=say_hello
cli step "$step" running --message "drafting greeting" >/dev/null

# Partial reply while the work is still in progress. The structured output
# describes the agent's interim state in the same shape it will use later.
cli reply <<EOF >/dev/null
{
  "headline": "drafting",
  "status": "partial",
  "note": "interim — full greeting to follow",
  "support": ["one step in this trace", "one file expected as output"],
  "findings": [
    { "title": "scope", "detail": "tiny — proves the CLI surface end-to-end without business complexity" }
  ],
  "suggestions": ["the user can stop here and inspect, or let it complete"],
  "checkpoint": { "step_id": "$step" }
}
EOF

# Write the asset, then declare it. Only files passed to --asset are committed.
mkdir -p "runs/$RUN/$step"
echo "hello world" > "runs/$RUN/$step/hello.txt"
cli step "$step" done --asset hello.txt --message "one greeting emitted" >/dev/null

cli reply <<EOF >/dev/null
{
  "headline": "hello!",
  "status": "complete",
  "takeaway": "the smallest possible trace ran",
  "support": [
    "one file written, one git commit per CLI op",
    "scratch files in the step folder stay untracked",
    "this is the same shape every other trace uses — just more of it"
  ],
  "findings": [
    { "title": "scoped staging works",  "detail": "junk in the folder isn't in the commit; only the declared asset is" },
    { "title": "stdin-only reply",      "detail": "checkpoint.step_id binds this output to the step; no flag needed" }
  ],
  "evidence": [
    { "type": "document",  "path": "$step/hello.txt", "title": "greeting" },
    { "type": "check",     "label": "file exists",   "passed": true,  "expected": "1 file",   "actual": "1 file" },
    { "type": "check",     "label": "byte count",    "passed": true,  "expected": "≥1",       "actual": "12" },
    { "type": "citation",  "id": "thompson1968",     "title": "Programming Techniques: Regular expression search algorithm", "authors": "Ken Thompson", "year": 1968 },
    { "type": "appendix",  "title": "why this matters",
      "markdown": "## The smallest valid trace\n\nOne step, one asset, one reply, one deliverable. Everything in the system is the same shape — every other trace is just more of this." }
  ],
  "suggestions": ["read the other 3 examples to see how the same surface scales"],
  "checkpoint": { "step_id": "$step" }
}
EOF

# ── Rerun: same asset path, new bytes (time-travel demo) ──────────────────
cli step "$step" running --message "updating greeting" >/dev/null
echo "hello world (v2 — friendlier)" > "runs/$RUN/$step/hello.txt"
cli step "$step" done --asset hello.txt --message "v2 of the greeting" >/dev/null

cli reply <<EOF >/dev/null
{
  "headline": "v2 emitted",
  "status": "complete",
  "note": "same path, two git versions — open RunHistoryModal to time-travel between them",
  "support": [
    "the path didn't change; the bytes did",
    "git history records both versions; the UI can render either"
  ],
  "evidence": [
    { "type": "comparison", "title": "v1 → v2",
      "left":  { "label": "v1 (older commit)", "path": "$step/hello.txt" },
      "right": { "label": "v2 (HEAD)",         "path": "$step/hello.txt" } },
    { "type": "check", "label": "asset still exists at same path", "passed": true, "expected": "$step/hello.txt", "actual": "$step/hello.txt" },
    { "type": "appendix", "title": "what reruns look like",
      "markdown": "## Re-running a step\n\nReruns are just `step running → write asset → step done` again. The CLI stages the asset, git stores both versions, the UI exposes time-travel via `?at=<sha>`." }
  ],
  "checkpoint": { "step_id": "$step" }
}
EOF

# ── Deliverable ───────────────────────────────────────────────────────────
cli deliverable running --message "wrapping" >/dev/null
cli deliverable done --asset "$step/hello.txt" --message "greeting delivered" >/dev/null

# ── Summary (the AI would normally not print this; useful for the human) ──
echo
echo "=== final state ==="
"$BIN" run show --run "$RUN"
echo
echo "=== commits this demo produced (most recent 20) ==="
git log --oneline -n 20
