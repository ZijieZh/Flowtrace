# Strategic Recommendations — Jordan Lee → PayCore Backend Engineer

## 1. Competitive strengths

- **Python is a direct hit.** The JD accepts Python and you have 4 years of it — lead with this in every conversation.
- **Relational-DB ownership.** You owned schema and query performance on MySQL; that maps cleanly onto the must-have PostgreSQL work.
- **Performance + reliability instinct.** The p95 latency win and incident-response work are exactly the muscles a payments backend needs.

## 2. Unmet requirements + honest solutions

| Gap (must-have) | Where you stand | Move |
|---|---|---|
| **Distributed systems** | No direct production experience | Frame the high-volume data pipeline as your distributed-thinking seed; do one focused project (or course) before interviews and say so. |
| **Kafka / message queues** | Not on your resume | A weekend building a small Kafka producer/consumer gives you an honest talking point; mention RabbitMQ is also accepted. |
| **Go or Java** | Python only | Python is accepted, so this isn't a blocker — but signal you're already learning Go (most-used at payments shops) to de-risk it for the hiring manager. |
| **High-throughput (proven at scale)** | ~2M records nightly is adjacent, not transactional throughput | Be precise about the volume you *have* handled; don't overclaim transaction-per-second numbers you don't have. |

## 3. Interview talking points

- Walk through the **p95 latency 40% cut** end to end: how you found the hot endpoints, what you cached, how you measured it (observability angle).
- The **2M-record nightly pipeline**: schema choices, where it bottlenecked, what you'd do differently at 10×.
- A **production incident** you root-caused — payments teams screen hard for reliability ownership.

## 4. Cover-letter hooks

- *"I've spent four years making Python services faster and more reliable under load — the p95 work and the 2M-record pipeline are the kind of problems I want to take to a system where reliability is the product."*
- *"PayCore moves money at volume; I've owned relational performance and production incidents, and I'm deliberately leveling up on distributed systems and Kafka to do it at payments scale."*

---
*Honest-gap note: the distributed-systems and Kafka gaps are real. This plan closes them with small, truthful, before-the-interview actions rather than resume inflation.*
