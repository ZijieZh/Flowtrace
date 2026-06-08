#!/usr/bin/env bash
# security-cicd — lift AppSec / DevSecOps skills into a trace, then run it once.
#
# A pull-request security gate for acme/payments-gateway PR #482. The source
# skills are from:
#
#   mukul975/Anthropic-Cybersecurity-Skills  (Apache-2.0)
#   NB: "Anthropic" is the maintainer's repo name, not an official Anthropic repo.
#
# Each node is a faithful lift of a specific SKILL.md (cited in its STEP.md):
#   intake / scan fan-out / severity gate ... implementing-devsecops-security-scanning
#   scan_sast ......... implementing-semgrep-for-custom-sast-rules
#   scan_sca .......... performing-sca-dependency-scanning-with-snyk
#   scan_secrets ...... implementing-secret-scanning-with-gitleaks
#   scan_variant ...... exploiting-sql-injection-vulnerabilities + semgrep taint
#   scan_crypto_timing  performing-cryptographic-audit-of-application
#   scan_mutation ..... implementing-fuzz-testing-in-cicd-with-aflplusplus
#   triage ............ prioritizing-vulnerabilities-with-cvss-scoring
#                       + performing-cve-prioritization-with-kev-catalog
#                       + implementing-epss-score-for-vulnerability-prioritization
#   red_team .......... executing-red-team-exercise
#                       + performing-threat-emulation-with-atomic-red-team
#   blue_team ......... building-detection-rules-with-sigma
#                       + performing-yara-rule-development-for-detection
#   threat_intel ...... analyzing-apt-group-with-mitre-navigator
#
# The knowledge is in the arrows: six scans run in parallel, then triage dedups
# BEFORE red-team (so PoC validation runs on the deduped set, not raw scanner
# output), blue-team synthesizes detections from the same set in parallel, and
# the severity gate decides block/allow from the COMBINED red+blue result.
#
# The run replays canonical findings from fixtures — no network, deterministic.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/../_lib.sh"
FIX="$HERE/fixtures"

# ── Authoring: scaffold the trace one piece at a time ────────────────────────
init_empty
scaffold_deliverable
author_file resources/request.md "add input: the PR under review (acme/payments-gateway #482)"

for s in intake threat_intel \
         scan_sast scan_sca scan_secrets scan_variant scan_crypto_timing scan_mutation \
         triage red_team blue_team severity_gate pr_comment posture_report; do
  author_step "$s"
done

# ── Orientation: read-side CLI surfaces ───────────────────────────────────────
cli validate >/dev/null
cli lint >/dev/null 2>&1 || true
cli show --fmt json    >/dev/null
cli show --fmt mermaid >/dev/null
cli show --fmt ascii   >/dev/null

# ── Start the run ─────────────────────────────────────────────────────────────
RUN=$(cli run new --name "acme/payments-gateway PR #482 — security gate" | tail -1)

# helper: running → place fixture asset(s) → done → one simple reply
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

# ── 2 roots ───────────────────────────────────────────────────────────────────
do_fixture intake       "Scan target — PR #482, new webhook + JWT bump, 6 scanners" scan_target.json
do_fixture threat_intel "Threat intel — T1190/T1212/T1552.001; CVE-2022-29217"      threat_intel.json

# ── 6 parallel scans (independent reads of intake) ────────────────────────────
do_fixture scan_sast          "SAST — SQLi in idempotency query (CWE-89), 1 ERROR" sast.json
do_fixture scan_sca           "SCA — golang-jwt v3.2.0 CVE-2022-29217 (High, reachable)" sca.json
do_fixture scan_secrets       "Secrets — hardcoded webhook signing secret (CWE-798, new)" secrets.json
do_fixture scan_variant       "Variant — same tainted source → 2nd SQL sink (CWE-89)" variant.json
do_fixture scan_crypto_timing "Crypto — non-constant-time HMAC compare (CWE-208/347)" crypto_timing.json
do_fixture scan_mutation      "Fuzz — OOB read in sig-header parser (CWE-125)"     mutation.json

# ── Fan-in 1: triage (dedup + CVSS/EPSS/KEV) — richer reply ───────────────────
cli step triage running --message "dedup by root cause, then score CVSS v4.0 + EPSS + KEV" >/dev/null
mkdir -p "runs/$RUN/triage"; cp "$FIX/triage/triage.json" "runs/$RUN/triage/triage.json"
cli step triage done --asset triage.json \
  --message "7 raw → 6 deduped; SAST SQLi + taint variant merged into T-001; 3 blocking candidates" >/dev/null
cli reply <<'EOF' >/dev/null
{
  "headline": "Triaged: 7 raw findings → 6 deduped, 3 blocking candidates",
  "status": "complete",
  "support": [
    "SAST SQLi (F-SAST-001) + taint variant (F-VAR-001) share one tainted source → merged into T-001",
    "Scored with CVSS v4.0, then EPSS + CISA-KEV enrichment, then P-level + SLA",
    "Only the deduped blocking candidates go to the expensive red-team lane — not raw scanner output"
  ],
  "findings": [
    { "title": "T-001 SQLi (Critical, CVSS 9.3)", "detail": "CWE-89; one root cause, two sinks (:147 query, :201 audit)" },
    { "title": "T-002 forgeable signature (High, CVSS 8.7)", "detail": "leaked secret (CWE-798) + non-constant-time compare (CWE-208/347) scored as one risk" },
    { "title": "T-003 golang-jwt alg-confusion (High, CVSS 7.5)", "detail": "CVE-2022-29217, reachable, EPSS 0.18 → P2 — blocking candidate pending red-team" }
  ],
  "evidence": [
    { "type": "document", "path": "triage/triage.json", "title": "triage.json" },
    { "type": "check", "label": "dedup collapsed duplicate root cause", "passed": true, "expected": 6, "actual": 6 }
  ],
  "checkpoint": { "step_id": "triage" }
}
EOF

# ── Fan-out: red_team ∥ blue_team off triage ──────────────────────────────────
# red_team — richer reply (the confirmed/not-reproduced split is the point)
cli step red_team running --message "ATT&CK emulation / PoC validation on the deduped set only" >/dev/null
mkdir -p "runs/$RUN/red_team"; cp "$FIX/red_team/red_team.json" "runs/$RUN/red_team/red_team.json"
cli step red_team done --asset red_team.json \
  --message "Chain: forge signature (T1552.001→T1212) → SQLi (T1190). T-001 & T-002 confirmed; T-003 NOT reproducible" >/dev/null
cli reply <<'EOF' >/dev/null
{
  "headline": "Exploitable chain confirmed — forge signature → SQL injection",
  "status": "complete",
  "support": [
    "T-002 confirmed: forged a valid Stripe-Signature end-to-end (leaked secret + timing oracle)",
    "T-001 confirmed: SQLi reproduced through the now-trusted webhook path",
    "T-003 NOT reproducible: call site pins HS256, so the alg-confusion PoC didn't chain — High by CVSS, not exploitable as written"
  ],
  "findings": [
    { "title": "T1552.001 → T1212 (T-002)", "detail": "confirmed exploitable — keystone that makes the SQLi remotely reachable" },
    { "title": "T1190 (T-001)", "detail": "confirmed exploitable — read/write to idempotency + audit tables" },
    { "title": "T1190 via JWT (T-003)", "detail": "NOT reproducible — why red-team runs AFTER triage, not on raw severity" }
  ],
  "evidence": [
    { "type": "document", "path": "red_team/red_team.json", "title": "red_team.json" },
    { "type": "check", "label": "confirmed-exploitable High+ findings", "passed": true, "expected": 2, "actual": 2 }
  ],
  "checkpoint": { "step_id": "red_team" }
}
EOF

# blue_team — richer reply (purple-team detection coverage)
cli step blue_team running --message "synthesize Sigma + YARA from the same triaged findings" >/dev/null
mkdir -p "runs/$RUN/blue_team"; cp "$FIX/blue_team/detections.json" "runs/$RUN/blue_team/detections.json"
cli step blue_team done --asset detections.json \
  --message "2 Sigma + 1 YARA; covers T1190/T1212/T1552.001; residual gap on T1499.004 DoS" >/dev/null
cli reply <<'EOF' >/dev/null
{
  "headline": "Detections shipped: 2 Sigma + 1 YARA (3/4 techniques covered)",
  "status": "complete",
  "support": [
    "Sigma for the SQLi source tokens (T1190) and the sig-verify failure spike (T1212)",
    "YARA anchored on the leaked-secret artifact (T1552.001) for build-artifact scanning",
    "Detection coverage is a COMPENSATING control — it does not unblock a confirmed-exploitable High"
  ],
  "findings": [
    { "title": "Sigma b3d9e7a1 / a7f1c0e2", "detail": "validated (sigma check PASS); cover T-001 / T-002" },
    { "title": "YARA acme_leaked_stripe_webhook_secret", "detail": "flags whsec_… in any artifact until rotation lands" },
    { "title": "Residual gap", "detail": "T1499.004 parser-DoS (T-004) has no rule yet — logged for posture" }
  ],
  "evidence": [
    { "type": "document", "path": "blue_team/detections.json", "title": "detections.json" },
    { "type": "check", "label": "threat-model techniques with detection", "passed": false, "expected": 4, "actual": 3 }
  ],
  "checkpoint": { "step_id": "blue_team" }
}
EOF

# ── Fan-in 2: severity_gate (combined red+blue) — richer reply with the gate check ──
cli step severity_gate running --message "decide block/allow from combined red+blue result" >/dev/null
mkdir -p "runs/$RUN/severity_gate"; cp "$FIX/severity_gate/gate_decision.json" "runs/$RUN/severity_gate/gate_decision.json"
cli step severity_gate done --asset gate_decision.json \
  --message "BLOCK — T-001 & T-002 are High+ AND confirmed-exploitable; T-003 not reproduced → not blocking" >/dev/null
cli reply <<'EOF' >/dev/null
{
  "headline": "Gate: BLOCK — 2 findings High+ AND confirmed-exploitable",
  "status": "complete",
  "support": [
    "Rule: block iff (triage severity ≥ High) AND (red-team confirmed-exploitable) — combined, not single-tool",
    "T-001 (Critical) and T-002 (High) meet both bars → block",
    "T-003 is High but red-team couldn't chain it → tracked, not blocking",
    "Blue-team detections recorded as compensating controls; they do NOT unblock"
  ],
  "findings": [
    { "title": "Blocks merge", "detail": "T-001 (T1190) + T-002 (T1552.001→T1212)" },
    { "title": "Why not single-tool", "detail": "naive 'any High blocks' would block T-003 (not exploitable) and under-rate T-002 (severity is in the composition)" }
  ],
  "evidence": [
    { "type": "document", "path": "severity_gate/gate_decision.json", "title": "gate_decision.json" },
    { "type": "check", "label": "PR #482 merge gate", "passed": false, "expected": "0 confirmed-exploitable High+", "actual": "2 confirmed-exploitable High+ (T-001, T-002)" }
  ],
  "checkpoint": { "step_id": "severity_gate" }
}
EOF

# ── Presentation: PR comment + durable posture report ─────────────────────────
do_fixture pr_comment     "PR comment — BLOCKED, fixes for T-001/T-002, detections deployed" pr_comment.md
do_fixture posture_report "Posture report — verdict, ATT&CK coverage, detection map, SLAs"  posture_report.md

# ── Deliverable ───────────────────────────────────────────────────────────────
cli deliverable running --message "packaging deliverable" >/dev/null
cli deliverable done \
  --asset posture_report/posture_report.md \
  --asset pr_comment/pr_comment.md \
  --asset triage/triage.json \
  --asset severity_gate/gate_decision.json \
  --message "PR #482: BLOCKED — SQLi (T-001) + forgeable signature (T-002) confirmed exploitable; T-003/4/5 tracked" >/dev/null

echo
echo "=== final state ==="
"$BIN" run show --run "$RUN"
echo
echo "Done. View: flowtrace serve  →  http://localhost:3000/traces/security-cicd"
