# Contributing to Flowtrace

Thanks for your interest in Flowtrace. This guide gets you from a clone to a running build and a first pull request.

## Build & run

The web UI is embedded into the Rust binary at compile time (via `rust-embed`), so **the frontend must be built before the CLI**.

```bash
# one-shot: builds frontend + CLI and symlinks `flowtrace` onto your PATH
./scripts/install.sh          # override the symlink target with INSTALL_DIR=…

# or build by hand while hacking:
cd frontend && npm install && npm run build && cd ..
cargo build --release -p flowtrace-cli
```

Run the tests:

```bash
cargo test
```

Before opening a PR, please run:

```bash
cargo fmt
cargo clippy --all-targets
```

## Try a reference trace

Every example ships as a builder that constructs a real trace folder under `~/traces/` and walks the CLI lifecycle once:

```bash
bash scripts/examples/iris-analysis/build.sh   # → ~/traces/iris-analysis/
flowtrace serve                                  # → http://localhost:3000
```

See [`docs/trace/REFERENCE-TRACES.md`](docs/trace/REFERENCE-TRACES.md) for the full set.

## Propose a new trace

The fastest way to author one is the **`make-trace` skill** (`skills/make-trace/`) — copy or symlink it into your coding agent's skills directory and run `/make-trace`. Or scaffold by hand:

```bash
cd ~/traces
flowtrace init my-trace        # creates my-trace/ with .git + an empty trace.json
flowtrace validate             # check the schema
flowtrace show --fmt mermaid   # eyeball the DAG
```

New reference traces are very welcome — see the existing builders under `scripts/examples/` for the pattern.

## Where things live

- `crates/flowtrace-core` — schema, validation, paths, the shared types.
- `crates/flowtrace-cli` — the `flowtrace` binary: commands, `serve`, `explain`, formatters.
- `frontend/` — the embedded web UI (Next.js / React).
- `docs/trace/` — the canonical reference (`CLI.md`, `SCHEMA.md`, `PHILOSOPHY.md`, …).
- `scripts/examples/` — one builder per reference trace.

## Pull requests

- Keep PRs focused and small where you can; one logical change per PR.
- Describe the *why*, not just the *what*.
- Link the issue you're addressing (e.g. `Closes #12`).
- Make sure `cargo test`, `cargo fmt`, and `cargo clippy` are clean.

## Good first issues

New here? Look for issues labelled [**good first issue**](https://github.com/AIScientists-Dev/Flowtrace/labels/good%20first%20issue) — they're scoped to land in an hour or two, with the relevant files called out. Comment to claim one before you start.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
