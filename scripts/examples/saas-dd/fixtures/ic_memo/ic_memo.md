> ⚠️ **Illustrative — fictional company, figures, and findings. "Acme RevOps, Inc." is a fictional placeholder; nothing here is about any real company.**

# Project Loom — Investment Committee Memo — Acme RevOps, Inc. (a fictional company)

**Target: Acme RevOps, Inc.** · B2B SaaS (RevOps automation) · Control acquisition · 2026-06-01
**Prepared by:** Corp Dev, Meridian Growth Partners · **For:** Investment Committee

| Recommendation | Recommended Offer | Seller Ask | Implied Multiple | Hurdle | Compliance |
|:--|:--|:--|:--|:--|:--|
| **GO — WITH CONDITIONS** | **$252M (6.0× ARR)** | $336M (8.0×) | offer 6.0× / walk > 6.8× | 20% IRR | **CONDITIONAL (gate may veto)** |

**House view — Go, but only at a negotiated entry. Yes on the asset; no on the terms as offered.**

- The capability and the AI sequencing team are worth owning — **buy beats an ~18-month build** in a consolidating category [PRO].
- At the **$336M ask the deal is negative-NPV and returns ~11% IRR**, below our 20% hurdle; it clears the hurdle only at **≤ 6.5× ARR** [VAL].
- The deal does **not close on price alone**: the compliance gate gates it on four binding pre-close conditions and can BLOCK on the EU AI Act / DPA exposure [GATE].

---

## 1. Recommendation

We recommend the IC approve **proceeding with an offer of $252M (6.0× ARR)**, cash-and-stock,
**with an earn-out bridging toward the seller's $336M ask** on realized cross-sell and AI
milestones, and a **hard walk-away above $285M (6.8× ARR)**. Approval is **contingent on the
compliance gate's four conditions to close** being achievable inside the exclusivity window.

This is a **GO-WITH-CONDITIONS**, not a clean GO. The five C-suite lenses — run independently,
in parallel, with no cross-pollination — did **not** converge, and that disagreement is the
finding: it is a *yes on the asset, a no on the terms as offered*.

## 2. How the five lenses voted

The lenses read the **same** data room and reached **genuinely different** conclusions. We ran
them in parallel on purpose: run serially, the CFO's price discipline would have framed
everyone else's read.

| Lens | Verdict | The one-line reason |
|:--|:--|:--|
| **CEO** | **GO** | Right kind of bet — buy > build (18mo) > partner; strategic fit 5/5 |
| **CFO** | **YELLOW** | Unit economics clear the bar *barely*; 8.0× fails the hurdle — get price down |
| **CTO** | **SHARPEN** | Two P1 debt items (auth/tenancy) sit on the cross-sell critical path; integration ~55% under-priced |
| **CRO** | **GAP** | NRR 109% sits on **GRR 88%** with 12%/yr logo churn; coverage 2.7× < 3×; discount creep |
| **GC** | **DO NOT SIGN AS-IS** | Uncapped IP indemnity + 2 missing EU DPAs + unassigned contractor IP + ungoverned AI on EU data |

**Where they agree:** the asset and the AI talent are worth owning.
**Where they diverge:** price (CFO), integration cost (CTO), revenue durability (CRO), and legal/compliance risk (GC).

## 3. The case FOR (steelman)

*Vote: APPROVE, Medium confidence — conditional on price + conditions* [PRO]

- **Buy beats build by ~18 months** in a fast-consolidating category; 3-year build TCO ~$16M and we'd cede the AI roadmap.
- The **AI sequencing team and IP are the durable prize** — 40% of new logos cite the feature.
- **NRR 109% and 74% gross margin are real**; expansion is working and cost-of-revenue grows slower than revenue.
- **$9M of 3-year cross-sell** into our enterprise base is incremental ARR we can actually land (ICP overlap is high).
- The seller is **motivated**: the $336M ask is *below* the 2023 Series C post of $390M — a markdown round.

## 4. The case AGAINST (devil's advocate)

*Vote: DEFER, High confidence — walk unless price + conditions move* [CONTRA]

- **8.0× ARR for a Rule-of-40 of 31 with decelerating growth fails the hurdle**; the bear case (revenue at 50% of plan) loses money at ask.
- **The revenue synergy is gated on the same tech-debt the integration must fix** — the $9M cross-sell needs SSO/SCIM + multi-region, both unfunded P1 debt.
- **Integration is ~55% more than the deal model carries** — $7M true vs $4.5M priced — cutting the base-case synergy NPV to ~$2M in the bear case.
- **NRR 109% on GRR 88% is less durable than the headline**; win rate slipped 38%→34% and discounting crept 9%→14%.
- **The legal/compliance stack is material and unresolved** (see §6).

> *The one thing that kills it (the CEO's own stated fear): we pay a platform multiple, the
> auth/tenancy debt slips, the cross-sell never lands, and we own a decelerating mid-market
> asset at an enterprise price.*

## 5. Valuation — priced after the thesis, not before

We priced the target three ways **after** the thesis was written, so the number could not anchor the argument [VAL].

| Method | Implied EV | Note |
|:--|:--|:--|
| Comps (Rule-of-40-adjusted ARR multiple) | $260M @ 6.2× | below-median multiple for decelerating growth + 88% GRR |
| DCF (5-yr FCF, WACC 12%, term. growth 4%) | $243M | implied exit multiple inside the comps band (passes cross-check) |
| NPV/IRR on synergy cash flows (net of $7M integration) | see below | hurdle 20% IRR |

**NPV/IRR by entry price:**

| Entry | Multiple | Base-case IRR | Base-case NPV | Verdict |
|:--|:--|:--|:--|:--|
| $336M (ask) | 8.0× | 11% | **−$44M** | fails hurdle, negative NPV |
| $273M | 6.5× | 19% | −$4M | borderline |
| **$252M (offer)** | **6.0×** | **23%** | **+$18M** | **clears 20% hurdle, positive NPV** |

*Reconciliation:* fair-value range **$243–273M**, midpoint $258M. **Recommended offer $252M (6.0× ARR)**;
**walk above $285M**. The ask is **$63–93M above fair value** — the deal works only on a negotiated entry,
with an earn-out bridging the gap on realized milestones. The offer is **under the fund's $300M max check**.
*Note: even at $252M the **bear case still loses** (−$22M NPV) — size the deal for the downside.*

## 6. Compliance gate — the veto

The gate sits **last but is binding**. It read the legal pack, the GC review, and the valuation, and
returned **CONDITIONAL (Stage-2 candidate)** — *price does not buy past this gate* [GATE].

- **Applicable frameworks:** GDPR (binding), EU AI Act (binding), SOC 2 Type II (held, one exception), ISO 27001 (buyer-expected).
- **Mock audit:** 9 findings, **2 critical (22%)** — above the ≤15% healthy ceiling — concentrated in **EU data + AI**:
  - **F-01 (critical):** two EU subprocessors with **no DPA**.
  - **F-02 (critical):** AI feature trains/infers on EU personal data with **no lawful basis, no DPIA, no EU AI Act classification**.
  - **F-03 (major):** SOC 2 **access-review control skipped a cycle** → report exception.
- **Would be BLOCK if** either critical finding is unresolved at close, or the seller won't warrant remediation — **regardless of price**.

**Binding conditions to close** (reps/warranties + conditions precedent, indemnity-escrow-backed):
1. DPAs executed with both EU subprocessors before EU data continues to flow.
2. EU AI Act risk classification + DPIA on the AI feature, reviewed by EU counsel.
3. SOC 2 access-review exception remediated + bridge letter obtained.
4. Documented EU data-residency roadmap.

## 7. Conditions to close (consolidated)

| # | Condition | Owner | Source lens |
|:--|:--|:--|:--|
| 1 | Entry ≤ 6.5× ARR; structure earn-out to bridge to ask | Corp Dev / CFO | CFO + VAL |
| 2 | Re-baseline integration to ~$7M / 8 quarters; auth + tenancy on critical path | CTO | CTO |
| 3 | Retention + earn-out for co-founder CTO and core AI engineers | CEO / People | CEO |
| 4 | Confirm top-customer (9% ARR) renewal + change-of-control consent | CRO / GC | CRO + GC |
| 5 | IP assignments for 2 contractors; clear AGPL dependency | GC | GC |
| 6 | DPAs, DPIA + EU AI Act classification, SOC 2 exception remediation | Compliance / GC | GATE |

## 8. The decision

**Approve a $252M (6.0× ARR) offer with an earn-out toward $336M, a hard walk above $285M, and
the six conditions above — with the compliance gate's four items as conditions precedent.** Strategy
says yes; the lenses say the asset is good but the terms are not; valuation says the price has to
come down ~$63–93M to clear our hurdle; and the gate says no signature until the EU data + AI
exposure is remediated. Those are consistent, not contradictory: **a disciplined yes, at our price,
on our conditions — or we walk.**

---

*Acme RevOps, Inc. is a fictional target constructed for this example. This memo is an illustration
of a composed due-diligence workflow, not investment, legal, or tax advice. The five C-suite lenses,
two-sided thesis, valuation, and compliance gate are faithful lifts of the corresponding skills in
**alirezarezvani/claude-skills** (MIT). The compliance and GC lanes surface questions for qualified
counsel; they are not a substitute for one.*

**Source skills composed:** financial-analyst · saas-metrics-coach · business-investment-advisor ·
cfo-advisor / cfo-review · ceo-advisor · cto-advisor / cto-review · cro-advisor / cro-review ·
general-counsel-advisor / gc-review · cross-eval · compliance-os · compliance-readiness · soc2-audit-prep.
