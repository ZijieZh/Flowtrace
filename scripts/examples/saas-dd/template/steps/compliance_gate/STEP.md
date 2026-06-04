---
name: compliance_gate
description: Select applicable frameworks, simulate the mock audit, decide READY / CONDITIONAL / BLOCK — this gate can veto.
reads:
  - ingest_legal/legal_pack.json
  - lens_gc/gc_review.json
  - valuation/valuation.json
writes:
  - compliance_gate.json
---

# Compliance Gate (Veto)

Source skill: **compliance-os** (framework_selector — which of the twelve frameworks apply to this
profile; audit_simulator — mock-audit findings against the IIA severity distribution, with the
skill's stated healthy ceiling on the critical/major share; evidence-pool reuse) +
**compliance-readiness** (the six forcing questions; verdict READY / STAGE-2-CANDIDATE / NOT-READY)
+ **soc2-audit-prep** (observation-period exception logic: a skipped control cycle = a report
exception).

**The veto node.** It sits **last** in the value chain — it even reads the valuation — but it is
**binding**: *price does not buy past this gate.* From the company profile, select the applicable
frameworks and which are binding; run the mock audit and compare its severity distribution against
the skill's healthy-severity ceiling; then return a verdict — **READY**, **CONDITIONAL** (Stage-2
candidate), or **BLOCK** — chosen from the findings. State the conditions under which it **would
escalate to BLOCK** *regardless of price*, and emit the **binding conditions to close**
(reps/warranties + conditions precedent). Assess only from evidence in the legal pack; where a
finding cannot be made from what is on file, say it **requires the data room** rather than
asserting a violation. Write `compliance_gate.json`.
