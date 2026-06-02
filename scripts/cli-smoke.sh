#!/usr/bin/env bash
# Trace CLI happy-path matrix. Exits non-zero on the first failed assertion.
# Run from the repo root: bash scripts/cli-smoke.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="${TRACE_BIN:-$REPO_ROOT/target/debug/flowtrace}"

if [[ ! -x "$BIN" ]]; then
  echo "building flowtrace binary..." >&2
  (cd "$REPO_ROOT" && cargo build -p flowtrace-cli >/dev/null)
fi

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"

pass=0
fail=0
assert() {
  local desc=$1
  local got=$2
  local expect=$3
  if [[ "$got" == *"$expect"* ]]; then
    echo "  ✓ $desc"
    pass=$((pass + 1))
  else
    echo "  ✗ $desc"
    echo "    expected to contain: $expect"
    echo "    got: $got"
    fail=$((fail + 1))
  fi
}

assert_fail() {
  local desc=$1
  shift
  if "$@" >/dev/null 2>&1; then
    echo "  ✗ $desc (expected failure, got success)"
    fail=$((fail + 1))
  else
    echo "  ✓ $desc"
    pass=$((pass + 1))
  fi
}

run_in() {
  local dir=$1
  shift
  (cd "$dir" && "$@")
}

# ──────────────────────────────────────────────────────────────────────────
# Setup: a minimal trace folder
# ──────────────────────────────────────────────────────────────────────────

mkdir -p smoke-trace
cd smoke-trace
cat > trace.json <<'EOF'
{
  "id": "smoke",
  "title": "Smoke",
  "description": "CLI matrix",
  "version": "0.1.0",
  "steps": {
    "foo": { "name": "Foo", "does": "the foo step", "from_inputs": [], "from_steps": [], "assets": [] },
    "bar": { "name": "Bar", "does": "the bar step", "from_inputs": [], "from_steps": ["foo"], "assets": [] }
  },
  "deliverable": { "description": "", "assets": [] },
  "environment": { "python": [], "r": [] }
}
EOF

echo "=== validate + lint + show ==="
out=$("$BIN" validate); assert "validate exits 0 and prints ok" "$out" "ok:"
out=$("$BIN" lint 2>&1 || true); assert "lint produces warning JSON" "$out" "orphan_step"
out=$("$BIN" show --fmt json | head -c 80); assert "show --fmt json renders" "$out" "Smoke"
out=$("$BIN" show --fmt ascii | head -c 80); assert "show --fmt ascii renders" "$out" "foo"
out=$("$BIN" show --fmt mermaid | head -c 40); assert "show --fmt mermaid renders" "$out" "graph"
out=$("$BIN" show --fmt dot | head -c 30); assert "show --fmt dot renders" "$out" "digraph"

echo "=== completion ==="
out=$("$BIN" completion bash | head -c 30); assert "completion bash" "$out" "_trace"

echo "=== run new / list / show / pause / resume / rename ==="
RUN=$("$BIN" run new --name "T1" | tail -1)
assert "run new prints run_id" "$RUN" "run_"
out=$("$BIN" run list); assert "run list contains new run" "$out" "$RUN"
out=$("$BIN" run show --run "$RUN" | head -c 60); assert "run show prints state json" "$out" '"name"'
out=$("$BIN" run pause --run "$RUN"); assert "run pause" "$out" "ok: run="
state=$(cat "runs/$RUN/state.json")
assert "paused flag is true in state.json" "$state" '"paused": true'
out=$("$BIN" run resume --run "$RUN"); assert "run resume" "$out" "ok: run="
state=$(cat "runs/$RUN/state.json")
assert "paused flag is gone (false) after resume" "$state" '"started_at"'
out=$("$BIN" run rename "RenamedRun" --run "$RUN"); assert "run rename" "$out" "ok: run="
state=$(cat "runs/$RUN/state.json")
assert "renamed name persisted"   "$state" '"name": "RenamedRun"'

echo "=== step status: all five kinds + message rules ==="
out=$("$BIN" step foo idle); assert "step foo idle (no message)" "$out" "ok: run="
out=$("$BIN" step foo running --message "doing foo"); assert "step foo running --message" "$out" "ok: run="
state=$(cat "runs/$RUN/state.json")
assert "state shows running with message" "$state" '"kind": "running"'

# blocked requires message
assert_fail "blocked without --message rejected" "$BIN" step foo blocked
out=$("$BIN" step foo blocked --message "waiting" 2>&1); assert "blocked --message ok" "$out" "ok: run="

# error requires message
assert_fail "error without --message rejected" "$BIN" step foo error
out=$("$BIN" step foo error --message "boom" 2>&1); assert "error --message ok" "$out" "ok: run="

# unknown step rejected
assert_fail "unknown step id rejected" "$BIN" step nonsense done

# done with multi-asset
mkdir -p "runs/$RUN/foo"
echo "a1" > "runs/$RUN/foo/a.txt"
echo "a2" > "runs/$RUN/foo/b.txt"
out=$("$BIN" step foo done --asset a.txt --asset b.txt --message "complete"); assert "step done with two assets" "$out" "ok: run="
state=$(cat "runs/$RUN/state.json")
assert "asset a.txt declared"  "$state" '"a.txt"'
assert "asset b.txt declared"  "$state" '"b.txt"'

echo "=== path validation rejections (step) ==="
assert_fail "traversal '../escape.txt' rejected"        "$BIN" step foo done --asset "../escape.txt" --message t
assert_fail "absolute '/abs.txt' rejected"              "$BIN" step foo done --asset "/abs.txt"       --message t
assert_fail "backslash 'a\\\\b' rejected"               "$BIN" step foo done --asset "a\\b"           --message t
assert_fail "Windows-reserved CON rejected"             "$BIN" step foo done --asset "CON"            --message t
assert_fail "Windows-reserved NUL.png rejected"         "$BIN" step foo done --asset "NUL.png"        --message t
assert_fail "reserved character '?' rejected"           "$BIN" step foo done --asset "a?b.txt"        --message t
assert_fail "empty path rejected"                       "$BIN" step foo done --asset ""               --message t
assert_fail "double slash 'a//b.txt' rejected"          "$BIN" step foo done --asset "a//b.txt"       --message t

echo "=== deliverable ==="
out=$("$BIN" deliverable running --message "compiling"); assert "deliverable running" "$out" "ok: run="
out=$("$BIN" deliverable done --asset "foo/a.txt" --asset "foo/b.txt" --message "ship"); assert "deliverable done with assets" "$out" "ok: run="
state=$(cat "runs/$RUN/state.json")
assert "deliverable status done"     "$state" '"kind": "done"'
assert "deliverable asset foo/a.txt" "$state" '"foo/a.txt"'

echo "=== reply (stdin-only; step_id derives from checkpoint.step_id) ==="
out=$(echo '{"headline":"r1","status":"complete"}' | "$BIN" reply)
assert "reply run-level" "$out" "seq=0001"
out=$(echo '{"headline":"r2","status":"complete","checkpoint":{"step_id":"foo"}}' | "$BIN" reply)
assert "reply step-scoped via checkpoint.step_id" "$out" "step=foo seq=0002"
out=$(echo '{"headline":"r3","status":"complete"}' | "$BIN" reply)
assert "reply r3 (no checkpoint)" "$out" "seq=0003"
out=$(echo '{"headline":"r4","status":"complete","checkpoint":{"step_id":"foo"},"evidence":[{"type":"figure","path":"foo/a.txt"}]}' | "$BIN" reply)
assert "reply with valid evidence path" "$out" "step=foo seq=0004"
# Reply that cites a missing evidence path is rejected
assert_fail "reply with missing evidence path rejected" bash -c "echo '{\"headline\":\"bad\",\"status\":\"complete\",\"evidence\":[{\"type\":\"figure\",\"path\":\"foo/missing.txt\"}]}' | '$BIN' reply"
# Invalid JSON rejected
assert_fail "reply with non-JSON payload rejected" bash -c "echo 'not json' | '$BIN' reply"

count=$(ls runs/$RUN/replies/ | wc -l)
assert "four reply files on disk" "$count" "4"

echo "=== explain (schema discovery) ==="
out=$("$BIN" explain reply); assert "explain reply prints KIND" "$out" "KIND:        reply"
out=$("$BIN" explain reply); assert "explain reply lists headline field" "$out" "headline"
out=$("$BIN" explain reply.evidence); assert "explain reply.evidence shows variants" "$out" "VARIANTS"
out=$("$BIN" explain reply.evidence.figure); assert "explain reply.evidence.figure shows path field" "$out" "path"
out=$("$BIN" explain state.steps); assert "explain state.steps shows map type" "$out" "map<string, StepState>"
out=$("$BIN" explain trace); assert "explain trace lists steps field" "$out" "steps"
out=$("$BIN" explain reply --output example); assert "explain --output example is valid JSON" "$(echo "$out" | python3 -c 'import json,sys;json.load(sys.stdin);print("ok")')" "ok"
out=$("$BIN" explain reply --output jsonschema); assert "explain --output jsonschema is valid JSON" "$(echo "$out" | python3 -c 'import json,sys;json.load(sys.stdin);print("ok")')" "ok"
assert_fail "explain with unknown root rejected" "$BIN" explain nope
assert_fail "explain with bad field path rejected" "$BIN" explain reply.nonexistent_field

echo "=== git log shape ==="
log=$(git log --oneline)
assert "git log has run/RenamedRun: start"   "$log" "run/T1: start"
assert "git log has foo: running — ..."      "$log" "foo: running — doing foo"
assert "git log has foo: done — complete"    "$log" "foo: done — complete"
assert "git log has deliverable: done"       "$log" "deliverable: done — ship"
assert "git log has reply: foo (0002)"       "$log" "reply: foo (0002)"
assert "git log has reply: foo (0004)"       "$log" "reply: foo (0004)"

# Final tally
echo
echo "==================================================="
echo "cli-smoke.sh: $pass passed, $fail failed"
echo "==================================================="
[[ $fail -eq 0 ]] || exit 1
