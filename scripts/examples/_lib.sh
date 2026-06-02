# Shared prelude for example builders.
#
# Each scripts/examples/<id>/build.sh sets HERE then `source`s this file.
# After sourcing:
#   - $BIN is the flowtrace binary (release if built, else debug, else built on the fly)
#   - cwd is $TARGET (~/traces/<id> by default, or $TRACE_TARGET)
#   - $TARGET has been git-init'd but is EMPTY — the builder calls
#       init_empty + author_file / author_step ...  (gradual-growth authoring)
#     so the UI watcher sees the trace assemble across many commits.
#   - cli() is defined, paced by $STEP_DELAY (default 0)
# Callers can then set FIX="$HERE/fixtures" and walk the lifecycle.
#
# Trace id is derived from $(basename "$HERE"); each builder lives at
# scripts/examples/<id>/build.sh so this gives <id>.

: "${HERE:?_lib.sh requires HERE to be set before sourcing}"

REPO_ROOT="$(cd "$HERE/../../../" && pwd)"
# shellcheck disable=SC1091
source "$REPO_ROOT/scripts/_find_flowtrace_bin.sh"

TRACE_ID="$(basename "$HERE")"
TARGET="${TRACE_TARGET:-$HOME/traces/$TRACE_ID}"
if [[ -d "$TARGET" ]]; then
  echo "$TARGET already exists. Remove it or set TRACE_TARGET=/some/other/path." >&2
  exit 1
fi
mkdir -p "$TARGET"
cd "$TARGET"
git init -q

STEP_DELAY="${STEP_DELAY:-0}"
cli()        { "$BIN" "$@"; sleep "$STEP_DELAY"; }

# Non-CLI commits (trace-authoring commits, not lifecycle commits). Uses a
# stable trace-author identity so the commit log reads cleanly regardless of
# the host's git config.
cli_commit() {
  git -c user.name=trace -c user.email=trace@local -c commit.gpgsign=false \
      commit -q -m "$1"
}

# ──────────────────────────────────────────────────────────────────────────
# Gradual-growth init + per-piece authoring helpers. Each helper commits one
# coherent unit so the UI watcher sees the trace assemble itself.
# ──────────────────────────────────────────────────────────────────────────

# init_empty: write a minimal trace.json (id + title + description + version,
# empty steps map, empty deliverable, environment from template) and commit.
init_empty() {
  python3 - "$HERE/template/trace.json" "$PWD/trace.json" <<'PY'
import json, sys
src, dst = sys.argv[1], sys.argv[2]
t = json.load(open(src))
shell = {
    "id":          t["id"],
    "title":       t["title"],
    "description": t["description"],
    "version":     t["version"],
    "steps":       {},
    "deliverable": {"description": "", "assets": []},
    "environment": t.get("environment", {"python": [], "r": []}),
}
json.dump(shell, open(dst, "w"), indent=2)
PY
  git add trace.json
  cli_commit "init: trace shell (no steps yet)"
  sleep "$STEP_DELAY"
}

# scaffold_deliverable: copy the full deliverable spec from template into the
# live trace.json (sets description + asset manifest).
scaffold_deliverable() {
  python3 - "$HERE/template/trace.json" "$PWD/trace.json" <<'PY'
import json, sys
src, dst = sys.argv[1], sys.argv[2]
t = json.load(open(src))
live = json.load(open(dst))
live["deliverable"] = t["deliverable"]
json.dump(live, open(dst, "w"), indent=2)
PY
  git add trace.json
  cli_commit "scaffold deliverable: description + asset manifest"
  sleep "$STEP_DELAY"
}

# author_file <relative-path> [commit-message]:
#   Copy one file from $HERE/template/<relative-path> to <relative-path> in cwd,
#   stage it, and commit. The default commit message is "add <relative-path>".
author_file() {
  local rel=$1
  local msg=${2:-"add $rel"}
  local src="$HERE/template/$rel"
  [[ -f "$src" ]] || { echo "author_file: missing template file $src" >&2; return 1; }
  mkdir -p "$(dirname "$rel")"
  cp "$src" "$rel"
  git add "$rel"
  cli_commit "$msg"
  sleep "$STEP_DELAY"
}

# author_dir <relative-dir> [commit-message]:
#   Recursive variant — copy a directory from template/ into cwd. Useful for
#   things like data/ or references/.
author_dir() {
  local rel=$1
  local msg=${2:-"add $rel"}
  local src="$HERE/template/$rel"
  [[ -d "$src" ]] || { echo "author_dir: missing template dir $src" >&2; return 1; }
  mkdir -p "$(dirname "$rel")"
  cp -r "$src" "$rel"
  git add "$rel"
  cli_commit "$msg"
  sleep "$STEP_DELAY"
}

# author_step <step_id> [commit-message]:
#   Splice the step's spec from template/trace.json into the live trace.json,
#   then copy steps/<id>/STEP.md plus any scripts/ + references/ (NOT memory.md
#   — that's added later in its own commit via author_file to reflect realistic
#   authoring: the gotcha is learned after the step runs, not when it's first
#   written).
author_step() {
  local id=$1
  local msg=${2:-"scaffold step: $id"}
  python3 - "$id" "$HERE/template" "$PWD" <<'PY'
import json, sys
sid, template, target = sys.argv[1], sys.argv[2], sys.argv[3]
tmpl = json.load(open(f"{template}/trace.json"))
live_path = f"{target}/trace.json"
live = json.load(open(live_path))
if sid not in tmpl["steps"]:
    print(f"author_step: unknown step `{sid}` in template trace.json", file=sys.stderr)
    sys.exit(2)
live["steps"][sid] = tmpl["steps"][sid]
json.dump(live, open(live_path, "w"), indent=2)
PY
  local src="$HERE/template/steps/$id"
  [[ -d "$src" ]] || { echo "author_step: missing template step dir $src" >&2; return 1; }
  mkdir -p "steps/$id"
  cp "$src/STEP.md" "steps/$id/STEP.md"
  [[ -d "$src/scripts"    ]] && cp -r "$src/scripts"    "steps/$id/"
  [[ -d "$src/references" ]] && cp -r "$src/references" "steps/$id/"
  git add trace.json "steps/$id"
  cli_commit "$msg"
  sleep "$STEP_DELAY"
}

# edit_trace <commit-msg> — apply an inline Python edit to trace.json then commit.
# The python snippet receives `r` = the parsed dict; mutate it, no return.
# Usage:
#   edit_trace "rewire foo's from_steps" 'r["steps"]["foo"]["from_steps"].append("bar")'
edit_trace() {
  local msg=$1
  local snippet=$2
  python3 - "$PWD/trace.json" "$snippet" <<'PY'
import json, sys
path = sys.argv[1]
snippet = sys.argv[2]
r = json.load(open(path))
exec(snippet, {"r": r})
json.dump(r, open(path, "w"), indent=2)
PY
  git add trace.json
  cli_commit "$msg"
  sleep "$STEP_DELAY"
}
