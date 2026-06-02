# minimal

The smallest valid trace — one step, one reply, one deliverable. Useful as a
sanity test and as a template for new traces.

## Layout

```
minimal/
├─ trace.json           The static plan: one step + its asset contract.
├─ README.md             ← you are here
└─ steps/
    └─ say_hello/
        ├─ STEP.md       Contract: what the step reads/writes; impl hints.
        └─ scripts/
            └─ say.sh    Reference implementation (one-line bash).
```

The example ships a `build.sh` one level up (next to `template/`) that replays
the demo through the CLI; running it writes `runs/<run_id>/` with state,
replies, and per-step outputs.

For the canonical "mature trace folder" reference, see
[`../iris-analysis/README.md`](../iris-analysis/README.md).
