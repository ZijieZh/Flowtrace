#!/usr/bin/env bash
# say_hello — reference implementation. The trace is intentionally trivial,
# so this script just writes the greeting to the per-step output directory.
#
# Honors $TRACE_OUTPUT_DIR (set by build.sh to `runs/<run_id>/say_hello`).
set -euo pipefail
OUT="${TRACE_OUTPUT_DIR:-.}"
mkdir -p "$OUT"
echo "hello world" > "$OUT/hello.txt"
echo "wrote $OUT/hello.txt"
