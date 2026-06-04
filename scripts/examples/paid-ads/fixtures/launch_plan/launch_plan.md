# Week 7 Launch & Tracking Plan — Lumora

> ⚠️ Illustrative — fictional brand, competitors, and figures; not real marketing data about any real company.

**Test shipping:** H1 (fresh long-story before/after video vs. fatigued hero) + H2 (frequency cap +
LAL-3%→LAL-1% reallocation).
**Launch slot:** **Wednesday 9:00 ET** (memory wk3 — best slot; Sunday underperforms).
**Owner sign-off required before spend.**

---

## 1. Launch checklist (ads — Universal Pre-Launch)

- [ ] Conversion tracking fires on a **real** test purchase (end-to-end, not just tag preview).
- [ ] Landing pages load < 3s and are mobile-clean (PDP + quiz funnel).
- [ ] UTM parameters present and correct on every ad URL (scheme below).
- [ ] Budget set; **50/50** split on H1; frequency cap ~3/wk applied (H2); LAL-3% budget moved to LAL-1%.
- [ ] Targeting matches intent: LAL-1% (purchasers) core; LAL-3% trimmed; gift-intent → quiz funnel.
- [ ] Both video variants QA'd; treatment specs validated (see `variants.md`).
- [ ] Guardrail stop-rules armed: pause if blended CPA worsens materially or refund/unsub spikes.
- [ ] Do **not** start a counter-discount; competitor sales are transient (let CPMs normalise).

**Ramp:** hold budget flat through the H1 learning window; no >20–30% budget moves mid-test
(disrupts the algorithm's learning and confounds the read).

---

## 2. Tracking instrumentation (analytics — track for decisions, not data)

Every event below exists to read a specific metric tier from `ab_setup.json`. Nothing vanity.

### Event plan (object_action naming)

| Event | Properties | Trigger | Reads which metric |
|---|---|---|---|
| `ad_impression` | variant, audience, placement | Ad served | CTR denominator, frequency (H2) |
| `ad_clicked` | variant, audience, campaign | Outbound click | **Primary (H1): prospecting CTR** |
| `video_hook_viewed` | variant, seconds=3 | 3-sec video view | Secondary (H1): hook rate |
| `pdp_viewed` | variant, traffic_source | PDP load | Funnel / message-match guardrail |
| `quiz_started` | variant, segment | Quiz step 1 | Gift-intent routing (context for H3 later) |
| `checkout_started` | variant, value | Begin checkout | CVR numerator (mid) |
| `purchase_completed` | variant, plan=duvet, value, order_id | Order confirmed | **Primary (H2)/secondary (H1): CPA, ROAS** |
| `refund_requested` | order_id, reason | Refund initiated | **Guardrail:** refund rate |

### UTM scheme (distinguish control vs. treatment cleanly)

```
utm_source   = meta | google
utm_medium   = cpc
utm_campaign = lumora_wk7_creativetest
utm_content  = ctrl_herovideo  |  trt_beforeafter      <- the variant discriminator
utm_term     = lal1 | lal3 | nonbrand                  <- audience, for segment cuts
```

- `utm_content` is the load-bearing field: it is how every downstream metric is split control vs.
  treatment. If it's wrong, the test is unreadable.

### Conversions to mark
- `purchase_completed` → primary conversion (count once per order).
- `checkout_started` → secondary funnel conversion.

### Validation (before spend)
- [ ] GA4 **DebugView**: each event fires once, on the right trigger, with `variant` + `utm_content` populated.
- [ ] No double-fires (single container; trigger not firing twice).
- [ ] Platform CPA cross-checked against GA4/blended (platform attribution is inflated — trust blended).
- [ ] No PII in any property.

---

## 3. Go / No-Go gate

**GO** when: real-purchase conversion verified, UTMs + `utm_content` split confirmed in DebugView,
guardrail stop-rules armed, both creatives QA'd, budget/cap/allocation set, launch scheduled Wed 9:00 ET.

**Read-out:** hold to the pre-committed sample (~10–14 days). No peeking-and-stopping. At read-out,
the winner and its numbers get written into `memory.md` (the playbook), promoting the pending entry.

_Source: ads / Universal Pre-Launch Checklist + Budget/ramp; analytics / Tracking Plan + Event Naming + UTM Strategy + Validation Checklist._
