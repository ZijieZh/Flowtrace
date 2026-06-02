# Examples

Each example below is a real trace you can build in one command, then open in the web UI. Run a builder, then:

```bash
flowtrace serve        # → http://localhost:3000
```

For the full technical reference (every builder, including the minimal CLI-surface demo), see [REFERENCE-TRACES.md](trace/REFERENCE-TRACES.md).

**English** · [简体中文](EXAMPLES.zh-CN.md)

---

## Tailored Resume Generator

Tailor a resume to a specific job posting. A `SKILL.md` lifted into a 7-node fan-in/fan-out DAG. It parses the JD and the resume in parallel, scores every bullet against the keywords, rewrites the weak ones, formats ATS-safe, and branches off strategic interview advice. The README's [Make your own trace](../README.md#make-your-own-trace) walks through this one.

<img src="assets/examples/tailored-resume.png" alt="tailored-resume DAG" width="760">

```bash
bash scripts/examples/tailored-resume/build.sh
```

---

## Deep Iris Analysis

A 24-step statistical analysis pipeline: descriptive stats, distribution diagnostics, three outlier detectors, consensus, conditional parametric/non-parametric inference, classification, and a composed report. The deepest example, with assumption-check gates and an error-retry.

<img src="assets/examples/iris-analysis.png" alt="iris-analysis DAG" width="760">

```bash
bash scripts/examples/iris-analysis/build.sh
```

---

## Research Synthesis

Given a topic, gather sources, pull facts and quotes in parallel, weave them into a narrative, and format a cited report. A clean diamond DAG.

<img src="assets/examples/nested-deps.png" alt="nested-deps DAG" width="760">

```bash
bash scripts/examples/nested-deps/build.sh
```

---

## Dream Analysis

Take a dream, gather personal context, produce a three-framework symbolic analysis (Jungian, Freudian, Eastern), generate an illustration, and compose a PDF report.

<img src="assets/examples/dream-analysis.png" alt="dream-analysis DAG" width="760">

```bash
bash scripts/examples/dream-analysis/build.sh
```
