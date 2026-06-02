# Shared helper — locate the `flowtrace` binary, set $BIN.
#
# Sourced by both scripts/examples/_lib.sh (build demos) and
# frontend/scripts/sync-types.sh (TS codegen prebuild). Requires $REPO_ROOT
# to be set by the caller. Prefers release > debug; builds debug on the fly
# if neither exists.

: "${REPO_ROOT:?_find_flowtrace_bin.sh requires REPO_ROOT to be set}"

BIN="${TRACE_BIN:-$REPO_ROOT/target/release/flowtrace}"
[[ -x "$BIN" ]] || BIN="$REPO_ROOT/target/debug/flowtrace"
[[ -x "$BIN" ]] || ( cd "$REPO_ROOT" && cargo build -p flowtrace-cli >/dev/null )
