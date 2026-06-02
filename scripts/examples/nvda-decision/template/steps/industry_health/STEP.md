---
name: industry_health
description: Semis/AI-compute cycle, end-demand, NVDA share position.
reads:
  - ingest_macro/macro.json
writes:
  - industry.json
---

# Industry Health

Source skill: **sector-analyst**.

From the macro read, zoom to the name's industry: where the semiconductor / AI-compute
cycle sits, end-demand trajectory (datacenter / GPU), supply constraints, and NVDA's
competitive share. Write `industry.json` with a cycle stage, a demand read, and a
tailwind / headwind list.
