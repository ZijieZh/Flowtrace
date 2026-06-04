---
name: lens_gc
description: The General Counsel six questions. IP ownership, liability, data/DPA, regulatory trigger, employment/equity — independent verdict.
reads:
  - ingest_legal/legal_pack.json
writes:
  - gc_review.json
---

# Lens — GC

Source skill: **gc-review** (the six GC forcing questions: IP ownership, liability & indemnity,
data processing / DPA, termination & renewal, regulatory surface, employment & equity; a
three-way verdict — sign-as-is / negotiate / do-not-sign) backed by **general-counsel-advisor**
(the founder-killer clauses, the roughly one-year liability-cap norm with carve-outs,
DPA-required-when-EU-data, IP-assignment discipline, the regulatory-trigger table). **Not legal
advice — surfaces questions for counsel.**

**One of five parallel lenses — no cross-pollination.** Reads only `legal_pack.json`.

Walk the six questions, scoring each risk and naming the remedy / condition-to-close it implies;
weigh whether any single item is a deal-killer and whether the *stack* is material even when no
single item is. Return the three-way verdict — **sign-as-is**, **negotiate**, or **do-not-sign**
(material risk) — from that read, and pass any **regulatory triggers** (e.g. GDPR / EU AI Act) on
to the compliance gate, which this lens feeds. Where the data room is silent, say the question is
**open / requires the data room** rather than inventing a finding. Write `gc_review.json`.
