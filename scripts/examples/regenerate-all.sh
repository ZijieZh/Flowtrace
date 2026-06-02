#!/usr/bin/env bash
# Run every example builder. Each builder constructs a fresh trace folder at
# $HOME/traces/<id>/ (or $TRACE_TARGET_BASE/<id>/ if set), populates it from
# scripts/examples/<id>/template/, then walks the CLI lifecycle. Fails fast on
# the first error.
#
# Each builder requires $TARGET to not pre-exist. If you've already built any
# of the four, pass `--clean` to wipe targets before rebuilding.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
BASE="${TRACE_TARGET_BASE:-$HOME/traces}"

clean=0
if [[ "${1:-}" == "--clean" ]]; then
  clean=1
fi

for d in minimal dream-analysis nested-deps iris-analysis tailored-resume spring-demo; do
  target="$BASE/$d"
  if [[ $clean -eq 1 && -d "$target" ]]; then
    rm -rf "$target"
  fi
  echo
  echo "════════════════════════════════════════════════"
  echo "  building: $d  →  $target"
  echo "════════════════════════════════════════════════"
  TRACE_TARGET="$target" bash "$HERE/$d/build.sh"
done
echo
echo "all examples regenerated under $BASE/"
