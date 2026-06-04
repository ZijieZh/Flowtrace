<div align="center">

<img src="docs/assets/hero.png" width="440" alt="Flowtrace">

# Flowtrace

**Turn your agent's work into a transparent, reusable, evolving trace.**

Structure the agent reasons through, and you can step in anywhere.

[![MIT License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE) [![Homepage](https://img.shields.io/badge/Homepage-morphmind.ai-lightgrey?style=flat-square)](https://morphmind.ai) [![Discord](https://img.shields.io/badge/Discord-Join-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/x9mtbMEx) [![X](https://img.shields.io/badge/X-Follow-000000?style=flat-square&logo=x&logoColor=white)](https://x.com/morphmind__ai?s=11)

[**What it does**](#what-it-does) · [**Get started**](#get-started) · [**Examples**](#examples) · [**Docs**](docs/trace/README.md)

**English** · [简体中文](docs/README.zh-CN.md)

</div>

---

Flowtrace turns a task you run with your agent into a trace: a flow of steps the agent works through one at a time, instead of a single stream of text. Each step leaves its output on disk to open and check. It works with the agent and skills you already use, including Claude Code, Codex, and Cursor.

One real example: a buy-or-sell decision that ends in a fixed-format, citable PDF.

<div align="center">
<table><tr>
<td align="center" valign="top"><img src="docs/assets/examples/nvda-decision.png" height="340" alt="A trace shown as a flow: ingest lanes fan into a synthesized thesis, then position sizing and risk controls, then a research-note report"><br><sub>The flow</sub></td>
<td align="center" valign="top"><img src="docs/assets/examples/nvda-decision-pdf.png" height="340" alt="The deliverable, a fixed-format research-note PDF"><br><sub>The deliverable</sub></td>
</tr></table>
</div>

<p align="center"><a href="docs/assets/examples/nvda-decision.pdf"><strong>Read the full research-note PDF</strong></a></p>

## What it does

**Transparent.** The whole task is a visible flow of steps, and each one shows what it did.

**Grounded.** Every result can be checked, because the agent works one step at a time and each step leaves real files on disk. A reported result points back to those files, not to a claim.

**Steerable.** The work is a structure to point at, not a conversation to scroll. A change applies to a single step, and whatever depends on it follows.

**Traceable.** Nothing is ever lost. Every change is a git commit, so each run keeps a full audit trail: a new approach never overwrites the one that worked, and any earlier version can be brought back.

**Reusable.** Once a trace exists, the next task of the same kind runs the same steps on new inputs. The method is reused, not rebuilt.

**Evolving.** A step improved once carries into every later run. The trace gets better the more it runs.

## Get started

The fast path is to hand the repo to an agent. Point a coding agent (Claude Code, Codex, Cursor) at this folder and say:

> _"Install Flowtrace and run the tailored-resume example."_

It installs the CLI, builds a real trace at `~/traces/tailored-resume/`, and opens the web view at `http://localhost:3000`, where the flow lights up step by step.

Two ways to get a trace:

- **Try a reference.** Each example ships as a builder that creates a real trace folder and walks one full run.

  ```bash
  bash scripts/examples/tailored-resume/build.sh   # → ~/traces/tailored-resume/
  flowtrace serve                                  # → http://localhost:3000
  ```

- **Make your own.** The `make-trace` skill turns any source (a `SKILL.md`, a runbook, a chat log, a finished task) into a trace. Copy `skills/make-trace/` into the agent's skills directory and run `/make-trace`.

A run is steerable: stop at any step, change it, and the steps that depend on it re-run while the rest stay put.

<details>
<summary>Install by hand</summary>

```bash
git clone https://github.com/AIScientists-Dev/flowtrace.git
cd flowtrace
./scripts/install.sh        # builds + symlinks flowtrace to ~/.local/bin/
```

Update with `git pull && ./scripts/install.sh`. Override the symlink target with `INSTALL_DIR=…`. Building from source or contributing? See [CONTRIBUTING.md](./CONTRIBUTING.md).

</details>

## Examples

**Nine examples** built from popular open-source skills, spanning different domains — open any one for its flow and a one-command demo in the [examples gallery](docs/EXAMPLES.md):

<div align="center">
<table><tr>
<td align="center" valign="top"><a href="docs/EXAMPLES.md#saas-dd"><img src="docs/assets/examples/feat-saas-dd.png" height="240" alt="SaaS acquisition due diligence flow"></a><br><sub><a href="docs/EXAMPLES.md#saas-dd">SaaS due diligence</a></sub></td>
<td align="center" valign="top"><a href="docs/EXAMPLES.md#security-cicd"><img src="docs/assets/examples/feat-security-cicd.png" height="240" alt="security CI/CD pipeline flow"></a><br><sub><a href="docs/EXAMPLES.md#security-cicd">Security CI/CD gate</a></sub></td>
<td align="center" valign="top"><a href="docs/EXAMPLES.md#distill-mind"><img src="docs/assets/examples/feat-distill-mind.png" height="240" alt="distill a mind into a skill flow"></a><br><sub><a href="docs/EXAMPLES.md#distill-mind">Distill a mind into a skill</a></sub></td>
</tr></table>
</div>

Plus six more:

- 📄 Career — [Tailored Résumé Generator](docs/EXAMPLES.md#tailored-resume)
- 💰 Investing — [Comprehensive Stock Analysis](docs/EXAMPLES.md#nvda-decision)
- ✍️ Research / writing — [Industry Deep-Dive Report](docs/EXAMPLES.md#research-writer)
- 🐛 Software engineering — [Bug-Fix Learning Loop](docs/EXAMPLES.md#swe-bugfix)
- 📈 Growth / marketing — [Weekly Paid-Ads Optimization](docs/EXAMPLES.md#paid-ads)
- 🖼 Design / decks — [Talk → Magazine Slide Deck](docs/EXAMPLES.md#talk-to-deck)

## Documentation

A trace is one git repository. `trace.json` declares the steps, their dependencies, and the final deliverable. Each run lives under `runs/<run_id>/`:

```
<trace_root>/
├─ .git/                                    standard git repo, the audit trail
├─ trace.json                              the static plan (steps + deliverable)
├─ scripts/                                 shared code used by 2+ steps
├─ resources/                               shared static material (refs, papers, master data)
├─ steps/<step_id>/
│  ├─ STEP.md                               per-step contract + impl hints
│  ├─ scripts/                              step-local code
│  └─ resources/                            step-local material (figures, PDFs, fixtures)
└─ runs/<run_id>/
   ├─ state.json                            run status (sole source of truth)
   ├─ replies/NNNN.json                     append-only structured-output stream
   └─ <step_id>/                            run-time files (assets + scratch)
```

The same two-name convention (`scripts/` for code that runs, `resources/` for static material that doesn't) appears at both the trace root and inside each step. Anything reused across 2+ steps belongs at the trace root; single-step material stays inside the step folder. `STEP.md` references either with relative paths.

Every CLI write makes one git commit, scoped to exactly the paths it declares: `state.json` plus any `--asset` paths, or the new reply file plus its cited evidence paths. Scratch files stay untracked. The git history is the audit trail, and the UI can time-travel through it.

Steps pass data through files, not parameters: each step writes its output, and a downstream step reads it.

| To learn | Read |
|---|---|
| The idea, in depth | [PHILOSOPHY.md](docs/trace/PHILOSOPHY.md) |
| Driving a trace as an agent | [docs/trace/CLI.md](docs/trace/CLI.md) |
| Making a trace | [skills/make-trace/SKILL.md](skills/make-trace/SKILL.md), or run `/make-trace` |
| The format spec | [SCHEMA.md](docs/trace/SCHEMA.md) and [FIELDS.md](docs/trace/FIELDS.md) |
| All examples | [docs/EXAMPLES.md](docs/EXAMPLES.md) |

---

## Community

**If Flowtrace is useful to you, consider starring the repo. It helps others find it.**

- **Contributing**: see [CONTRIBUTING.md](./CONTRIBUTING.md), and look for [good first issues](https://github.com/AIScientists-Dev/Flowtrace/labels/good%20first%20issue).
- **GitHub Issues**: [report bugs / propose changes](https://github.com/AIScientists-Dev/flowtrace/issues)
- **Discord**: [discord.gg/x9mtbMEx](https://discord.gg/x9mtbMEx)
- **X**: [@morphmind__ai](https://x.com/morphmind__ai?s=11)

---

MIT. See [`LICENSE`](./LICENSE).
