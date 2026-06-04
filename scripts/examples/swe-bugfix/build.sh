#!/usr/bin/env bash
# swe-bugfix — lift a SKILL library into a trace, then run the bug-fix loop once.
#
# This is a worked example behind the README's "Make your own trace" section.
# The source is a whole skill *library*:
#
#   superpowers (skills/) by Jesse Vincent — https://github.com/obra/superpowers
#   licensed MIT
#
# The fix-a-bug-properly workflow that library encodes becomes a ~17-node chain +
# fan-in DAG. systematic-debugging's Iron Law and Four Phases (root-cause
# investigation -> pattern analysis -> hypothesis & testing -> implementation)
# drive diagnosis; test-driven-development supplies the RED->GREEN->REFACTOR fix,
# run under subagent-driven-development's two-stage (spec then quality) review,
# which fans into a single adjudicated code_review; verification-before-completion
# re-verifies fresh; finishing-a-development-branch ships it. Then the GROW loop:
# writing-skills distills the run's learning into a NEW skill written back to the
# library, and memory_writeback records the codebase-specific gotcha so the same
# trace, re-run, sharpens.
#
# The run replays a canonical decision (PAY-4815: a duplicate-charge race in a
# payment-idempotency cache) from fixtures. No network; everything ships as a
# fixture so the build is deterministic and offline.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/../_lib.sh"

FIX="$HERE/fixtures"

# ── Authoring: scaffold the trace one piece at a time ───────────────────────
init_empty
scaffold_deliverable
author_file resources/request.md "add input: the bug report (PAY-4815)"

# steps in topological order (review_spec/review_quality are parallel; code_review fans in)
for s in bug_report triage_priority reproduce gather_evidence pattern_analysis \
         hypothesize test_hypothesis root_cause fix_design implement_tdd \
         review_spec review_quality code_review verify_completion finish_branch \
         writing_skills memory_writeback; do
  author_step "$s"
done

# ── Orientation: read-side CLI surfaces ───────────────────────────────────────
cli validate >/dev/null
cli lint >/dev/null 2>&1 || true
cli show --fmt json    >/dev/null
cli show --fmt mermaid >/dev/null
cli show --fmt ascii   >/dev/null

# ── Start the run ─────────────────────────────────────────────────────────────
RUN=$(cli run new --name "PAY-4815 — duplicate-charge race (fix + learn)" | tail -1)
cli run show --run "$RUN" >/dev/null

# helper: running → place fixture asset(s) → done → one minimal reply
do_fixture() {
  local id=$1 head=$2; shift 2
  cli step "$id" running --message "working" >/dev/null
  local args=() first=""
  for a in "$@"; do
    mkdir -p "runs/$RUN/$id"; cp "$FIX/$id/$a" "runs/$RUN/$id/$a"
    args+=(--asset "$a"); [[ -z "$first" ]] && first="$a"
  done
  cli step "$id" done "${args[@]}" --message "$head" >/dev/null
  python3 - "$id" "$first" "$head" <<'PY' | cli reply >/dev/null
import sys, json
sid, asset, head = sys.argv[1:4]
print(json.dumps({"headline": head, "status": "complete",
  "evidence": [{"type": "document", "path": f"{sid}/{asset}", "title": asset}],
  "checkpoint": {"step_id": sid}}))
PY
}

# helper: place fixture asset(s) for a step without emitting a reply (richer replies follow inline)
place_done() {
  local id=$1 head=$2; shift 2
  cli step "$id" running --message "working" >/dev/null
  local args=()
  for a in "$@"; do
    mkdir -p "runs/$RUN/$id"; cp "$FIX/$id/$a" "runs/$RUN/$id/$a"
    args+=(--asset "$a")
  done
  cli step "$id" done "${args[@]}" --message "$head" >/dev/null
}

# ── Intake + triage ───────────────────────────────────────────────────────────
do_fixture bug_report      "Bug parsed — duplicate charges, same idempotency key, both MISS" bug_report.json
do_fixture triage_priority "Triage — SEV-2/P1; systematic debugging required (no hotfix)"    triage.json

# ── Phase 1: reproduce + gather evidence (richer replies — the investigation) ─
place_done reproduce "Reproduced — deterministic at concurrency≥8/window≤20ms (74%)" repro.json
cli reply <<EOF >/dev/null
{
  "headline": "Reproduced the race deterministically",
  "status": "complete",
  "support": [
    "Serial or >250ms apart: 0% duplicates; two same-key requests within ~50ms: duplicates",
    "Duplicate rate rises with concurrency: 31% @ c2/40ms → 74% @ c8 → 92% @ c16",
    "Key read: BOTH requests log 'cache MISS' before either records a charge"
  ],
  "evidence": [
    { "type": "document", "path": "reproduce/repro.json", "title": "repro.json" },
    { "type": "check", "label": "reliably reproducible", "passed": true, "expected": ">0% under load", "actual": "92% @ c16" }
  ],
  "checkpoint": { "step_id": "reproduce" }
}
EOF

place_done gather_evidence "Evidence — breaks between lookup() and reserve(); both MISS first" evidence.json
cli reply <<EOF >/dev/null
{
  "headline": "Boundary evidence localizes the failure",
  "status": "complete",
  "support": [
    "Instrumented 4 boundaries: handler_entry, idem.lookup, idem.reserve, psp.charge",
    "Both lookup()s return MISS (t=1.40, 1.55ms) BEFORE either reserve() writes (t=3.55, 3.70ms)",
    "Not the PSP, not Redis, not the handler — the lookup/reserve split is the break"
  ],
  "findings": [
    { "title": "vulnerable window", "detail": "[lookup .. reserve] ~2ms, not mutually exclusive per key" },
    { "title": "second row", "detail": "idempotency table has an index but NO UNIQUE constraint" }
  ],
  "evidence": [
    { "type": "document", "path": "gather_evidence/evidence.json", "title": "evidence.json" }
  ],
  "checkpoint": { "step_id": "gather_evidence" }
}
EOF

# ── Phase 2 + 3: pattern, hypothesis, test, root cause ───────────────────────
do_fixture pattern_analysis "Pattern — inventory path uses atomic INSERT…ON CONFLICT; idem doesn't" pattern.json

place_done hypothesize "Hypothesis — TOCTOU race; no per-key critical section" hypothesis.json
cli reply <<EOF >/dev/null
{
  "headline": "One hypothesis, with a kill condition",
  "status": "complete",
  "takeaway": "Check-then-act (TOCTOU) race on the idempotency cache: lookup() and reserve() are non-atomic with no per-key mutual exclusion, so concurrent same-key requests both MISS and both charge.",
  "support": [
    "Because: both lookup()s complete before either reserve() writes (from evidence)",
    "Single variable under test: presence/absence of a per-key critical section across lookup..reserve",
    "Would falsify: duplicates persist even WITH a correct per-key lock held across the window"
  ],
  "evidence": [
    { "type": "document", "path": "hypothesize/hypothesis.json", "title": "hypothesis.json" }
  ],
  "checkpoint": { "step_id": "hypothesize" }
}
EOF

place_done test_hypothesis "Hypothesis CONFIRMED — per-key lock drops dupes 74%→0%; traced to source" hypothesis_test.json
cli reply <<EOF >/dev/null
{
  "headline": "Hypothesis confirmed by a one-variable probe",
  "status": "complete",
  "support": [
    "Per-key lock around lookup+reserve (test-only): 74% → 0% at c8, 0% at c16, nothing else changed",
    "Backward trace: the 'bad value' is the ABSENT mutual exclusion between lookup and reserve",
    "Note: the in-process lock only PROVES causation — the real fix must be atomic at the shared store"
  ],
  "evidence": [
    { "type": "document", "path": "test_hypothesis/hypothesis_test.json", "title": "hypothesis_test.json" },
    { "type": "check", "label": "per-key serialization removes duplicates", "passed": true, "expected": "0%", "actual": "0%" }
  ],
  "checkpoint": { "step_id": "test_hypothesis" }
}
EOF

place_done root_cause "Root cause CONFIRMED — non-atomic check-then-act; Iron Law satisfied" root_cause.json
cli reply <<EOF >/dev/null
{
  "headline": "Root cause confirmed at the source (Iron Law satisfied)",
  "status": "complete",
  "takeaway": "lookup()/reserve() are a non-atomic check-then-act with the PSP charge in between and no per-key mutual exclusion. The fix belongs at the source — an atomic reserve-or-get — not at the symptom.",
  "findings": [
    { "title": "source", "detail": "app/payments/idempotency.py — lookup()/reserve() split; no UNIQUE(idempotency_key)" },
    { "title": "NOT the fix", "detail": "PSP dedupe / client debounce / global lock (per-process, kills throughput)" }
  ],
  "evidence": [
    { "type": "document", "path": "root_cause/root_cause.json", "title": "root_cause.json" },
    { "type": "check", "label": "iron_law_satisfied (Phase 1–3 complete before any fix)", "passed": true, "expected": true, "actual": true }
  ],
  "checkpoint": { "step_id": "root_cause" }
}
EOF

# ── Fix design (design before code) ───────────────────────────────────────────
do_fixture fix_design "Design — atomic reserve-or-get + 4 defense-in-depth layers + test contract" fix_design.md

# ── Phase 4: implement test-first (the richest reply — red→green check evidence) ─
place_done implement_tdd "Implemented TDD — RED(got 7)→GREEN(1); suite 212/212; dupes 74%→0%" fix_summary.md tdd_evidence.json
cli reply <<EOF >/dev/null
{
  "headline": "Fix implemented test-first (RED → GREEN → REFACTOR)",
  "status": "complete",
  "support": [
    "RED: wrote the concurrency regression test FIRST; ran it → failed for the right reason (got 7 charges)",
    "GREEN: minimal atomic reserve-or-get (INSERT…ON CONFLICT DO NOTHING RETURNING) → test passes",
    "REFACTOR: extracted reserve_or_get(); added UNIQUE migration 0042 + header validation; suite stayed green"
  ],
  "findings": [
    { "title": "source fix", "detail": "only the winner charges; losers return the original charge" },
    { "title": "defense-in-depth", "detail": "L1 header validation · L2 atomic claim · L3 UNIQUE(idempotency_key) · L4 per-key log" }
  ],
  "evidence": [
    { "type": "document", "path": "implement_tdd/fix_summary.md", "title": "fix_summary.md" },
    { "type": "document", "path": "implement_tdd/tdd_evidence.json", "title": "tdd_evidence.json" },
    { "type": "check", "label": "RED before fix (test fails)", "passed": true, "expected": "1 charge", "actual": "7 charges (fails)" },
    { "type": "check", "label": "GREEN after fix (full suite)", "passed": true, "expected": 212, "actual": 212 }
  ],
  "checkpoint": { "step_id": "implement_tdd" }
}
EOF

# ── Two-stage review (parallel: spec then quality), each finds something real ──
place_done review_spec "Spec review — CHANGES REQUESTED: test doesn't assert original charge id returned" spec_review.json
cli reply <<EOF >/dev/null
{
  "headline": "Spec review (stage 1): one real gap",
  "status": "complete",
  "support": [
    "All four designed layers present + the concurrency test exists",
    "MISSING: test never asserts the non-owner returns the SAME (original) charge id",
    "A path that 1-charges but returns 409 to the retry would pass the current test yet violate the contract"
  ],
  "evidence": [
    { "type": "document", "path": "review_spec/spec_review.json", "title": "spec_review.json" }
  ],
  "checkpoint": { "step_id": "review_spec" }
}
EOF

place_done review_quality "Quality review — IMPORTANT: crashed-owner busy-wait can hang the retry" quality_review.json
cli reply <<EOF >/dev/null
{
  "headline": "Quality review (stage 2): one Important finding",
  "status": "complete",
  "support": [
    "Strength: fixed at the shared store (not an in-process lock) — correct across workers/pods",
    "Important: await_charge() busy-waits with a fixed sleep and no timeout — a crashed owner hangs the retry forever",
    "Minor: request_hash computed but not compared on HIT (different body silently returns original) — note for later"
  ],
  "evidence": [
    { "type": "document", "path": "review_quality/quality_review.json", "title": "quality_review.json" },
    { "type": "check", "label": "fix is cross-process safe", "passed": true, "expected": "shared-store atomic", "actual": "INSERT…ON CONFLICT" }
  ],
  "checkpoint": { "step_id": "review_quality" }
}
EOF

# ── Fan-in: adjudicate both reviews (fix + reasoned pushback) ─────────────────
place_done code_review "Adjudicated — 2 fixes applied, 1 pushback (global lock), 1 deferred Minor" code_review.json
cli reply <<EOF >/dev/null
{
  "headline": "Reviews adjudicated (verify → fix or push back)",
  "status": "complete",
  "support": [
    "FIX: assert all 50 responses share the owner's charge id (re-reviewed: compliant)",
    "FIX: replaced fixed-sleep wait with condition-based waiting + 5s deadline; stale in_progress reclaimable",
    "PUSHBACK: declined 'add a global lock' — per-key atomic INSERT already serializes; global lock = throughput cliff + per-process",
    "DEFER: request_hash mismatch → follow-up PAY-4823 (YAGNI for this page)"
  ],
  "evidence": [
    { "type": "document", "path": "code_review/code_review.json", "title": "code_review.json" },
    { "type": "check", "label": "all blocking findings resolved", "passed": true, "expected": true, "actual": true }
  ],
  "checkpoint": { "step_id": "code_review" }
}
EOF

# ── Verify fresh (the review changed code → earlier green is stale) ───────────
place_done verify_completion "Verified fresh — 215/215; red-green revert proven; all requirements met" verification.json
cli reply <<EOF >/dev/null
{
  "headline": "Fresh verification — evidence before the claim",
  "status": "complete",
  "takeaway": "Review changed the code, so the earlier green was stale. Re-ran everything fresh: 215/215, and the red-green revert proves the regression test actually catches the bug.",
  "support": [
    "Full suite fresh: 215 passed, 0 warnings, exit 0",
    "Red-green revert: stash the fix → test FAILS (got 6) → restore → PASSES",
    "Requirements checklist: no double charge · retry returns original charge · holds under concurrency · crashed owner can't hang — all met with evidence"
  ],
  "evidence": [
    { "type": "document", "path": "verify_completion/verification.json", "title": "verification.json" },
    { "type": "check", "label": "red-green revert proof", "passed": true, "expected": "fail-then-pass", "actual": "FAIL(6)→PASS(1)" },
    { "type": "check", "label": "full suite green", "passed": true, "expected": 215, "actual": 215 }
  ],
  "checkpoint": { "step_id": "verify_completion" }
}
EOF

# ── Ship it ───────────────────────────────────────────────────────────────────
do_fixture finish_branch "Finished — tests verified, PR opened (fix/PAY-4815-idempotency-race)" branch_finish.json

# ── GROW loop: distill a NEW skill back to the library (richer reply) ────────
place_done writing_skills "New skill written back — 'idempotent-side-effects' (Use-when triggers only)" new_skill.md
cli reply <<EOF >/dev/null
{
  "headline": "Distilled the learning into a NEW reusable skill",
  "status": "complete",
  "takeaway": "The run uncovered a broadly-applicable, non-obvious class of bug (check-then-act on a shared key) — exactly writing-skills' bar for 'create a skill'. Wrote 'idempotent-side-effects' back to the library.",
  "support": [
    "Frontmatter follows the SKILL.md spec; description is 'Use when…' TRIGGERS ONLY (no workflow summary — CSO rule)",
    "Core before/after (check-then-act → atomic reserve-or-get), quick-ref table, common mistakes, regression-test recipe",
    "Real-World Impact ties back to PAY-4815 without making the skill a one-off narrative"
  ],
  "evidence": [
    { "type": "document", "path": "writing_skills/new_skill.md", "title": "new_skill.md" },
    { "type": "check", "label": "description is triggers-only (no workflow summary)", "passed": true, "expected": "Use when…", "actual": "Use when…" }
  ],
  "checkpoint": { "step_id": "writing_skills" }
}
EOF

# ── GROW loop: record the codebase-specific gotcha in memory.md ───────────────
place_done memory_writeback "memory.md updated — per-key locking gotcha + dead-ends + lifecycle audit" memory.md
cli reply <<EOF >/dev/null
{
  "headline": "Recorded the codebase-specific gotcha in memory.md",
  "status": "complete",
  "takeaway": "The general technique went to the skill library; this repo-specific note goes to memory.md so the NEXT run skips the dead-ends and audits the right modules.",
  "support": [
    "Tell: both racing requests log 'cache MISS' at app/payments/idempotency.py:48",
    "Dead-end to skip next time: a global/process lock (kills throughput AND is per-process)",
    "Audit next: app/worker/lifecycle.py startup cache warm (same get-then-set shape) + refund.py + webhooks/dispatch.py"
  ],
  "evidence": [
    { "type": "document", "path": "memory_writeback/memory.md", "title": "memory.md" }
  ],
  "checkpoint": { "step_id": "memory_writeback" }
}
EOF

# ── Deliverable ───────────────────────────────────────────────────────────────
cli deliverable running --message "packaging deliverable" >/dev/null
cli deliverable done \
  --asset implement_tdd/fix_summary.md \
  --asset root_cause/root_cause.json \
  --asset writing_skills/new_skill.md \
  --asset memory_writeback/memory.md \
  --message "PAY-4815 fixed (atomic reserve-or-get, dupes 74%→0%) + new skill 'idempotent-side-effects' + memory.md gotcha" >/dev/null

echo
echo "=== final state ==="
"$BIN" run show --run "$RUN"
echo
echo "Done. View: trace serve  →  http://localhost:3000/traces/swe-bugfix"
