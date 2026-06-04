---
name: ingest_product
description: Structure the technical data room — architecture, stack, tech-debt inventory, security posture, AI features.
reads:
  - intake/deal_brief.json
writes:
  - product_tech.json
---

# Ingest — Product & Tech

Source skill: **cto-advisor** (technology-evaluation framework, tech-debt inventory with
severity / cost-to-fix / blast-radius, DORA metrics, scaling-cliff hypothesis) — used here in
*read* mode to inventory the asset before the CTO lens judges it.

One of four parallel ingest lanes. Structure the technical data room: the **architecture**
(topology, datastores, cloud/region, multitenancy model), the **scaling-cliff hypothesis**
(where the current design saturates and how much headroom remains), the **tech-debt inventory**
(each item scored by severity, cost-to-fix, and blast radius), the **DORA** read (deploy
frequency, lead time, change-failure rate, MTTR), the **security posture** (SOC 2 / ISO 27001
status, pen-test recency, SSO/SCIM, encryption), and any **AI feature** (what data it uses and
whether it is governed). This is a *read*, not a verdict — the CTO lens judges it. Write
`product_tech.json`.
