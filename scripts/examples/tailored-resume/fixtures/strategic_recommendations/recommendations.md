# Strategic Recommendations — Jordan Lee → PayCore Backend Engineer

## 1. Competitive strengths

- **Real payments exposure.** You built and owned a Stripe checkout integration — webhooks, retries, reconciliation, live customer money. Almost no generalist candidate has touched the payments domain at all; lead with this.
- **Python backend is a direct hit.** The JD accepts Python and you have ~6 years of it, including Flask services, a reporting REST API, and internal services used daily by 60+ staff. This is your spine — make it the headline, not the frontend history.
- **Relational-DB ownership.** You owned schema and query performance on a production MySQL database under daily load; that maps cleanly onto the must-have PostgreSQL work.
- **Reliability + observability instinct.** The p95 latency win, the logging/dashboards that killed a recurring pipeline failure, on-call rotation, and incident root-causing are exactly the muscles a payments backend screens for.

## 2. Unmet requirements + honest solutions

| Gap (must-have) | Where you stand | Move |
|---|---|---|
| **Distributed systems** | No direct production experience | Frame the ~2M-record nightly pipeline and the multi-team reporting API as distributed-thinking seeds; do one focused project (or course) before interviews and say so plainly. |
| **Kafka / message queues** | Not on your resume | A weekend building a small Kafka producer/consumer gives you an honest talking point; note RabbitMQ is also accepted by the JD. |
| **Go or Java** | Python only | Python is explicitly accepted, so this isn't a hard blocker — but signal you're already learning Go (most common at payments shops) to de-risk it for the hiring manager. |
| **High-throughput (proven at transactional scale)** | ~2M records nightly is batch-adjacent, not transactional TPS | Be precise about the volume you *have* handled; don't overclaim transactions-per-second numbers you don't have. Pair it with the Stripe work to tell a credible "payments at volume" story. |

## 3. Interview talking points

- Walk through the **Stripe integration** end to end: how you handled webhook idempotency, retries, and reconciliation — and what you'd want to harden if it were processing PayCore's volume.
- The **p95 latency 40% cut**: how you found the hot endpoints, what you cached, how you measured it (observability angle).
- The **recurring pipeline failure**: the logging/dashboards you added, how they surfaced the root cause, and how the repeat incidents went to zero.
- The **2M-record nightly pipeline**: schema choices, where it bottlenecked, and what you'd change at 10x.
- A **production incident** you root-caused on-call — payments teams screen hard for reliability ownership.

## 4. Cover-letter hooks

- *"I've already shipped and owned a live payments integration — webhooks, retries, reconciliation — so 'reliability is the product' isn't an abstraction to me. I want to take that mindset to a system that moves money at PayCore's scale."*
- *"For six years I've made Python services faster and more observable under load — a 40% p95 cut, monitoring that killed a recurring failure, on-call ownership. I'm deliberately leveling up on distributed systems and Kafka to do that work at payments scale."*

---
*Honest-gap note: the distributed-systems and Kafka gaps are real, and Go/Java is Python-only on paper. This plan closes them with small, truthful, before-the-interview actions — and leans on the genuine payments + reliability signal already in the history — rather than resume inflation.*
