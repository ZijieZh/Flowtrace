#!/usr/bin/env bash
# Trace CLI concurrency + adversarial torture. Exits non-zero on any failure.
# Run from the repo root: bash scripts/cli-stress.sh
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="${TRACE_BIN:-$REPO_ROOT/target/debug/flowtrace}"

if [[ ! -x "$BIN" ]]; then
  echo "building flowtrace binary..." >&2
  (cd "$REPO_ROOT" && cargo build -p flowtrace-cli >/dev/null)
fi

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0
ok()   { echo "  ✓ $1"; pass=$((pass + 1)); }
nope() { echo "  ✗ $1"; echo "    $2"; fail=$((fail + 1)); }

new_trace() {
  local dir=$1
  mkdir -p "$dir"
  cat > "$dir/trace.json" <<'EOF'
{
  "id": "stress",
  "title": "Stress",
  "description": "Concurrency torture",
  "version": "0.1.0",
  "steps": {
    "foo": { "name": "Foo", "does": "the foo step", "from_inputs": [], "from_steps": [], "assets": [] }
  },
  "deliverable": { "description": "", "assets": [] },
  "environment": { "python": [], "r": [] }
}
EOF
}

# ──────────────────────────────────────────────────────────────────────────
# Test 1: parallel `trace reply` — unique, contiguous seqs
# ──────────────────────────────────────────────────────────────────────────
echo "=== test 1: parallel reply ==="
new_trace "$WORK/t1"
(cd "$WORK/t1" && "$BIN" run new --name p1 >/dev/null)

N=20
pids=()
for i in $(seq 1 $N); do
  (
    cd "$WORK/t1"
    echo "{\"headline\":\"r$i\",\"status\":\"complete\"}" | "$BIN" reply >/dev/null 2>&1
  ) &
  pids+=($!)
done
for p in "${pids[@]}"; do wait "$p"; done

RUN=$(ls "$WORK/t1/runs")
got=$(ls "$WORK/t1/runs/$RUN/replies/" | wc -l)
[[ $got -eq $N ]] && ok "wrote $N replies under contention" || nope "wrote $N replies under contention" "got $got"

# Each filename should be a distinct 4-digit number 0001..N
seqs=$(ls "$WORK/t1/runs/$RUN/replies/" | sed 's/\.json$//' | sort -u | wc -l)
[[ $seqs -eq $N ]] && ok "all reply seqs are distinct" || nope "all reply seqs are distinct" "got $seqs distinct seqs"

first=$(ls "$WORK/t1/runs/$RUN/replies/" | sort | head -1)
last=$(ls "$WORK/t1/runs/$RUN/replies/" | sort | tail -1)
[[ "$first" == "0001.json" ]] && ok "first seq is 0001" || nope "first seq is 0001" "got $first"
expected_last=$(printf "%04d.json" $N)
[[ "$last" == "$expected_last" ]] && ok "last seq is $expected_last" || nope "last seq is $expected_last" "got $last"

# ──────────────────────────────────────────────────────────────────────────
# Test 2: parallel `trace step` writes — final state.json valid
# ──────────────────────────────────────────────────────────────────────────
echo "=== test 2: parallel step writes ==="
new_trace "$WORK/t2"
(cd "$WORK/t2" && "$BIN" run new --name p2 >/dev/null)

N=30
pids=()
for i in $(seq 1 $N); do
  (
    cd "$WORK/t2"
    "$BIN" step foo running --message "iter $i" >/dev/null 2>&1
  ) &
  pids+=($!)
done
for p in "${pids[@]}"; do wait "$p"; done

RUN=$(ls "$WORK/t2/runs")
state="$WORK/t2/runs/$RUN/state.json"
if python3 -c "import json,sys;json.load(open(sys.argv[1]))" "$state" >/dev/null 2>&1; then
  ok "state.json is valid JSON after $N concurrent step writes"
else
  nope "state.json is valid JSON" "parse failed"
fi
kind=$(python3 -c "import json;print(json.load(open('$state'))['steps']['foo']['status']['kind'])")
[[ "$kind" == "running" ]] && ok "final step status is running" || nope "final step status" "got $kind"

# ──────────────────────────────────────────────────────────────────────────
# Test 3: repeated commits with no tree change — git is smart
# ──────────────────────────────────────────────────────────────────────────
echo "=== test 3: repeated no-op commits ==="
new_trace "$WORK/t3"
(cd "$WORK/t3" && "$BIN" run new --name p3 >/dev/null)

# Run the exact same command 30× — state.json content is identical, so most
# commits should be no-ops. We expect at most: 1 (run start) + 1 (first step write).
for _ in $(seq 1 30); do
  (cd "$WORK/t3" && "$BIN" step foo running --message "same" >/dev/null)
done
commits=$(cd "$WORK/t3" && git log --oneline | wc -l)
[[ $commits -le 5 ]] && ok "repeated identical writes produced ≤5 commits (got $commits)" || nope "no-op detection" "got $commits commits"

# ──────────────────────────────────────────────────────────────────────────
# Test 4: large reply payloads
# ──────────────────────────────────────────────────────────────────────────
echo "=== test 4: large reply payloads ==="
new_trace "$WORK/t4"
(cd "$WORK/t4" && "$BIN" run new --name p4 >/dev/null)

# Generate 1MB and 500KB JSON payloads
python3 -c "
import json, sys
big = {'headline':'large','status':'complete','support':['x'*1024 for _ in range(1024)]}  # ~1MB
print(json.dumps(big))" > "$WORK/big.json"

bytes=$(wc -c < "$WORK/big.json")
echo "  payload size: $bytes bytes"
if (cd "$WORK/t4" && "$BIN" reply < "$WORK/big.json" >/dev/null 2>&1); then
  ok "1MB reply accepted"
else
  nope "1MB reply" "rejected"
fi

# 500KB via stdin
python3 -c "
import json
big = {'headline':'stdin','status':'complete','support':['y'*512 for _ in range(1024)]}
print(json.dumps(big))" > "$WORK/medium.json"
if (cd "$WORK/t4" && "$BIN" reply < "$WORK/medium.json" >/dev/null 2>&1); then
  ok "500KB reply via stdin accepted"
else
  nope "500KB stdin reply" "rejected"
fi

# ──────────────────────────────────────────────────────────────────────────
# Test 5: NFC/NFD normalization
# ──────────────────────────────────────────────────────────────────────────
echo "=== test 5: NFC / NFD asset names ==="
new_trace "$WORK/t5"
(cd "$WORK/t5" && "$BIN" run new --name p5 >/dev/null)
RUN=$(ls "$WORK/t5/runs")

# Create file with composed (NFC) name on disk
mkdir -p "$WORK/t5/runs/$RUN/foo"
echo "data" > "$WORK/t5/runs/$RUN/foo/café.png"

# Pass NFD form on the command line: c-a-f-e + combining acute (U+0301)
nfd=$(python3 -c "print('café.png')")
if (cd "$WORK/t5" && "$BIN" step foo done --asset "$nfd" --message "nfd test" >/dev/null 2>&1); then
  # The state.json should store the NFC (composed) form
  stored=$(python3 -c "
import json
s = json.load(open('$WORK/t5/runs/$RUN/state.json'))
print(s['steps']['foo']['assets'][0])
")
  if [[ "$stored" == "café.png" ]]; then
    ok "NFD input stored as NFC"
  else
    # Some bash literal length comparisons can be slippery; show codepoints
    ok_codepoints=$(python3 -c "print(' '.join(f'{ord(c):04x}' for c in '$stored'))")
    nope "NFD input stored as NFC" "stored=$stored (codepoints: $ok_codepoints)"
  fi
else
  nope "NFD asset accepted" "rejected"
fi

# ──────────────────────────────────────────────────────────────────────────
# Test 6: CLI + HTTP race (best-effort — needs port)
# ──────────────────────────────────────────────────────────────────────────
echo "=== test 6: CLI + HTTP race ==="
new_trace "$WORK/t6/r6"
(cd "$WORK/t6/r6" && "$BIN" run new --name p6 >/dev/null)

# Start serve from /t6 parent so the trace folder is discoverable
PORT=14201
"$BIN" serve --scope "$WORK/t6" --port "$PORT" >/tmp/cli-stress-serve.log 2>&1 &
SERVE_PID=$!
sleep 1.5
RUN=$(ls "$WORK/t6/r6/runs")

# fire 5 CLI step writes and 5 HTTP step writes concurrently
pids=()
for i in $(seq 1 5); do
  (cd "$WORK/t6/r6" && "$BIN" step foo running --message "cli-$i" >/dev/null 2>&1) &
  pids+=($!)
  curl -s -X POST "http://127.0.0.1:$PORT/api/runs/$RUN/steps/foo" \
    -H "Content-Type: application/json" \
    -d "{\"status\":\"running\",\"message\":\"http-$i\"}" >/dev/null 2>&1 &
  pids+=($!)
done
for p in "${pids[@]}"; do wait "$p"; done
kill $SERVE_PID 2>/dev/null
wait $SERVE_PID 2>/dev/null

state="$WORK/t6/r6/runs/$RUN/state.json"
if python3 -c "import json;json.load(open('$state'))" >/dev/null 2>&1; then
  ok "state.json valid after CLI+HTTP race"
else
  nope "state.json valid after CLI+HTTP race" "parse failed"
fi

echo
echo "==================================================="
echo "cli-stress.sh: $pass passed, $fail failed"
echo "==================================================="
[[ $fail -eq 0 ]] || exit 1
