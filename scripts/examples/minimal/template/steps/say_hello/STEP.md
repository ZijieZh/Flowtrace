---
name: say_hello
description: Print 'hello world' to a text file. The smallest possible step.
display_name: "Say Hello"
---

# Say Hello

The smallest possible step. Demonstrates that a trace can have one instruction step with no executable body.

## What this step does

Print "Hello, world." to the executor's output.

## How to do it

Just print the string. No tooling needed. No data dependencies. No assets.

## Why this exists

Two reasons:

1. **Smallest valid trace.** Demonstrates that `from_inputs: []`, `from_steps: []`, `assets: []`, and an empty `environment` are all legal — a trace doesn't have to be complex to be valid.
2. **Instruction-only step shape.** This step has no code in its folder — only this STEP.md. The executor reads it and acts on it directly.

## Materials in this folder

Just this `STEP.md`. Nothing else needed for a step this simple.
