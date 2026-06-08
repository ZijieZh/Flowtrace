mod debug_watch;
mod explain;
mod format_dag;
mod git;
mod id;
mod reply;
mod serve;

use anyhow::{Context, Result};
use clap::{CommandFactory, Parser, Subcommand};
use flowtrace_core::{
    io::atomic_write_json,
    paths::check_and_normalize_all,
    schema::Trace,
    state::{create_run, find_trace_root, list_runs, read_state, resolve_run, write_state},
    validate::{lint, validate, validate_trace_id},
};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Parser)]
#[command(
    name = "flowtrace",
    version,
    about = "Trace CLI — manage and serve trace folders"
)]
struct Cli {
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Set a step's status. `status ∈ {idle, running, blocked, done, error}`.
    /// `blocked` and `error` require `--message`; `running` and `done` may include one.
    /// Each `--asset` is step-relative and must already exist on disk.
    /// The commit stages exactly `state.json` + the declared asset paths.
    #[command(after_help = "\
EXAMPLES:
  # Mark a step running with an activity hint
  flowtrace step gather_context running --message \"reading 14 prior journals\"

  # Mark a step done with two declared assets
  flowtrace step analyze_dream done \\
      --asset jung-shadow-anima.png --asset freud-displacement.png \\
      --message \"convergent reading across frameworks\"

  # Mark a step blocked (message required)
  flowtrace step generate_dream_image blocked --message \"awaiting reviewer pick\"

  # Schema for a step's state entry:
  #   flowtrace explain state.steps")]
    Step {
        /// Step id (key in `trace.steps`). Must exist in `trace.json`.
        step_id: String,
        /// Target status.
        status: StatusArg,
        /// Status-specific message (required for `blocked` and `error`).
        #[arg(long)]
        message: Option<String>,
        /// Step-relative asset filename. Repeat for multiple. Each must exist on disk.
        #[arg(long = "asset")]
        assets: Vec<String>,
        /// Run id; defaults to the latest run.
        #[arg(long)]
        run: Option<String>,
    },
    /// Set the run's deliverable status and asset list. `--asset` paths are
    /// run-relative (e.g. `analyze_dream/foo.png`). Each must exist on disk.
    #[command(after_help = "\
EXAMPLES:
  # Mark deliverable as running
  flowtrace deliverable running --message \"assembling final\"

  # Ship the deliverable with declared assets
  flowtrace deliverable done \\
      --asset generate_report/dream_report.pdf \\
      --asset analyze_dream/jung-shadow-anima.png \\
      --message \"dream analysis complete\"

  # Schema for the deliverable's state entry:
  #   flowtrace explain state.deliverable")]
    Deliverable {
        /// Target status.
        status: StatusArg,
        /// Status-specific message (required for `blocked` and `error`).
        #[arg(long)]
        message: Option<String>,
        /// Run-relative asset path. Repeat for multiple. Each must exist on disk.
        #[arg(long = "asset")]
        assets: Vec<String>,
        /// Run id; defaults to the latest run.
        #[arg(long)]
        run: Option<String>,
    },
    /// Run lifecycle: `new` / `list` / `show` / `pause` / `resume` / `abort` / `rename`.
    Run {
        #[command(subcommand)]
        action: RunCmd,
    },
    /// Validate the `trace.json` in the current trace folder.
    Validate,
    /// Lint the `trace.json` (warnings only; exits non-zero if any).
    Lint,
    /// Print `trace.json` (default), or render as ASCII / Mermaid / DOT.
    #[command(after_help = "\
EXAMPLES:
  flowtrace show                           # JSON (default)
  flowtrace show --fmt mermaid             # Mermaid graph definition
  flowtrace show --fmt dot                 # GraphViz DOT
  flowtrace show --fmt ascii               # ASCII tree
  flowtrace show --fmt json | jq .steps    # programmatic consumption
  flowtrace show --downstream gather       # steps to re-run after changing `gather`")]
    Show {
        /// Render format: `json` (default), `ascii`, `mermaid`, `dot`.
        #[arg(long, default_value = "json")]
        fmt: String,
        /// Instead of rendering the DAG, print the steps DAG-downstream of
        /// `<step_id>` (its transitive `from_steps` dependents) one per line, in
        /// topological order — the set you must re-run after editing that step,
        /// safe to re-run front-to-back. Empty if none.
        #[arg(long, value_name = "step_id")]
        downstream: Option<String>,
    },
    /// Append a structured-output reply to a run's reply stream.
    ///
    /// Reads the payload from stdin as JSON (StructuredOutput shape).
    /// The step this reply is "about" comes from `checkpoint.step_id` inside
    /// the payload; run-level replies omit the checkpoint. Every
    /// `evidence[].path` cited in the payload must exist on disk — the call
    /// stages those files together with the new reply in one commit.
    #[command(after_help = "\
EXAMPLES:
  # Pipe a payload file:
  flowtrace reply < reply.json

  # Heredoc:
  flowtrace reply <<EOF
  { \"headline\": \"three-framework synthesis\", \"status\": \"complete\",
    \"checkpoint\": { \"step_id\": \"analyze_dream\" },
    \"evidence\": [ { \"type\": \"figure\", \"path\": \"analyze_dream/x.png\" } ] }
  EOF

  # Inspect the payload schema first:
  flowtrace explain reply
  flowtrace explain reply.evidence.figure
  flowtrace explain reply --output example > skeleton.json")]
    Reply {
        /// Run id; defaults to the latest run.
        #[arg(long)]
        run: Option<String>,
    },
    /// Print the schema of a type the CLI knows about. Mirrors `kubectl explain`:
    /// takes a dotted path like `reply` or `reply.evidence.figure` or
    /// `state.steps.assets`, sourced from the same Rust types the CLI validates against.
    ///
    /// Roots: `reply` (the structured-output payload), `state` (state.json), `trace` (trace.json).
    #[command(after_help = "\
EXAMPLES:
  # Top-level shape:
  flowtrace explain reply
  flowtrace explain state
  flowtrace explain trace

  # Drill into a field:
  flowtrace explain reply.evidence
  flowtrace explain reply.evidence.figure
  flowtrace explain state.steps.status
  flowtrace explain trace.steps

  # Other output formats:
  flowtrace explain reply --output example     # minimal valid JSON
  flowtrace explain reply --output jsonschema  # raw JSON Schema")]
    Explain {
        /// Dotted path (e.g. `reply`, `reply.evidence.figure`, `state.steps.assets`).
        path: String,
        /// Output format.
        #[arg(long, default_value = "plaintext")]
        output: explain::ExplainFormat,
    },
    /// Start the local web UI + HTTP API + SSE event stream.
    Serve {
        /// Scope directory (folder containing trace folders).
        #[arg(long, default_value = ".")]
        scope: PathBuf,
        /// Port to bind.
        #[arg(long, default_value_t = 3000)]
        port: u16,
        /// Open the browser on start.
        #[arg(long)]
        open: bool,
    },
    /// Print debounced filesystem events for a path (engineering aid).
    DebugWatch {
        path: PathBuf,
        #[arg(long, default_value_t = 200)]
        debounce_ms: u64,
    },
    /// Generate a shell-completion script: `bash` / `zsh` / `fish` / `powershell` / `elvish`.
    Completion {
        /// Shell name.
        shell: String,
    },
    /// Scaffold a new trace folder at `<slug>/`. Slug must match
    /// `[a-z][a-z0-9-]{0,62}` (the trace-id rule).
    #[command(after_help = "\
EXAMPLES:
  flowtrace init iris-analysis
  cd iris-analysis && flowtrace validate
")]
    Init {
        /// Folder name and trace id (same string).
        slug: String,
    },
}

#[derive(Clone, Copy, Debug, clap::ValueEnum)]
#[clap(rename_all = "snake_case")]
enum StatusArg {
    Idle,
    Running,
    Blocked,
    Done,
    Error,
}

#[derive(Subcommand)]
enum RunCmd {
    /// Create a new run folder under runs/
    New {
        /// Human-readable name for the run (e.g. "Monday baseline").
        #[arg(long, default_value = "")]
        name: String,
    },
    /// List all run ids
    List,
    /// Show state.json for a run
    Show {
        #[arg(long)]
        run: Option<String>,
    },
    /// Pause a run (sets `paused: true`; step statuses are left untouched)
    Pause {
        #[arg(long)]
        run: Option<String>,
    },
    /// Resume a paused run
    Resume {
        #[arg(long)]
        run: Option<String>,
    },
    /// Abort a run
    Abort {
        #[arg(long)]
        run: Option<String>,
    },
    /// Rename a run (set its human-readable label)
    Rename {
        name: String,
        #[arg(long)]
        run: Option<String>,
    },
}

/// Exit quietly on SIGPIPE (a downstream pipe closing) instead of letting the
/// next stdout write panic with "failed printing to stdout: Broken pipe". Rust
/// ignores SIGPIPE by default; this restores the normal Unix CLI behavior.
/// No-op on non-Unix targets, which have no SIGPIPE.
#[cfg(unix)]
fn restore_default_sigpipe() {
    // SAFETY: setting a signal disposition before any thread is spawned is sound.
    unsafe {
        libc::signal(libc::SIGPIPE, libc::SIG_DFL);
    }
}

#[cfg(not(unix))]
fn restore_default_sigpipe() {}

/// Ignore SIGPIPE so a long-lived server is not killed when a client disconnects
/// mid-response — the broken connection surfaces as an ordinary I/O error
/// instead. No-op on non-Unix targets.
#[cfg(unix)]
fn ignore_sigpipe() {
    // SAFETY: setting a signal disposition before the tokio runtime starts is sound.
    unsafe {
        libc::signal(libc::SIGPIPE, libc::SIG_IGN);
    }
}

#[cfg(not(unix))]
fn ignore_sigpipe() {}

fn main() -> Result<()> {
    // A normal Unix CLI exits quietly when a downstream consumer closes the pipe
    // early (a pager quitting, `head`, `| grep -q`); `serve` overrides this below.
    restore_default_sigpipe();

    let cli = Cli::parse();
    match cli.cmd {
        Cmd::DebugWatch { path, debounce_ms } => debug_watch::run(&path, debounce_ms),
        Cmd::Validate => cmd_validate(),
        Cmd::Lint => cmd_lint(),
        Cmd::Show { fmt, downstream } => cmd_show(&fmt, downstream.as_deref()),
        Cmd::Reply { run } => cmd_reply(run),
        Cmd::Serve { scope, port, open } => {
            // Unlike the one-shot CLI commands, the server must survive a client
            // disconnecting mid-response, so keep SIGPIPE ignored.
            ignore_sigpipe();
            let runtime = tokio::runtime::Builder::new_multi_thread()
                .enable_all()
                .build()?;
            runtime.block_on(serve::run(&scope, port, open))
        }
        Cmd::Completion { shell } => cmd_completion(&shell),
        Cmd::Run { action } => cmd_run(action),
        Cmd::Step {
            step_id,
            status,
            message,
            assets,
            run,
        } => cmd_step(step_id, status, message, assets, run),
        Cmd::Deliverable {
            status,
            message,
            assets,
            run,
        } => cmd_deliverable(status, message, assets, run),
        Cmd::Explain { path, output } => {
            print!("{}", explain::explain(&path, output)?);
            Ok(())
        }
        Cmd::Init { slug } => cmd_init(&slug),
    }
}

fn cmd_init(slug: &str) -> Result<()> {
    validate_trace_id(slug)
        .with_context(|| format!("slug `{}` is not a valid trace id", slug))?;

    let target = std::env::current_dir()?.join(slug);
    if target.exists() {
        anyhow::bail!("`{}` already exists", target.display());
    }
    fs::create_dir(&target).with_context(|| format!("creating {}", target.display()))?;

    let trace = Trace::minimal(slug, slug, "");
    atomic_write_json(&target.join("trace.json"), "trace", &trace)
        .with_context(|| format!("writing {}/trace.json", target.display()))?;
    git::init(&target)?;
    git::commit_files(&target, "initial commit", &["trace.json"])?;
    println!("initialized {} ({})", target.display(), slug);
    Ok(())
}

fn cmd_validate() -> Result<()> {
    let root = trace_root_or_bail()?;
    let r = load_trace(&root)?;
    validate(&r)?;
    println!("ok: {} ({}, {} steps)", r.title, r.id, r.steps.len());
    Ok(())
}

fn cmd_lint() -> Result<()> {
    let root = trace_root_or_bail()?;
    let r = load_trace(&root)?;
    let warnings = lint(&r);
    if warnings.is_empty() {
        println!("clean ({} steps)", r.steps.len());
    } else {
        println!("{}", serde_json::to_string_pretty(&warnings)?);
        std::process::exit(1);
    }
    Ok(())
}

fn cmd_show(fmt: &str, downstream: Option<&str>) -> Result<()> {
    let root = trace_root_or_bail()?;
    let r = load_trace(&root)?;
    if let Some(step_id) = downstream {
        if !r.steps.contains_key(step_id) {
            anyhow::bail!("unknown step `{}`", step_id);
        }
        for s in r.downstream_of(step_id) {
            println!("{}", s);
        }
        return Ok(());
    }
    match fmt {
        "json" => println!("{}", serde_json::to_string_pretty(&r)?),
        "ascii" => print!("{}", format_dag::ascii(&r)),
        "mermaid" => print!("{}", format_dag::mermaid(&r)),
        "dot" => print!("{}", format_dag::dot(&r)),
        other => anyhow::bail!("unknown format: {}", other),
    }
    Ok(())
}

fn cmd_reply(run: Option<String>) -> Result<()> {
    let root = trace_root_or_bail()?;
    let raw = reply::read_stdin_to_string()?;
    let payload = reply::parse_payload(&raw)?;
    let step_id: Option<String> = payload.step_id().map(String::from);

    // Every cited evidence path must exist on disk at call time.
    let run_id = resolve_run(&root, run.as_deref())?;
    let cited = payload.evidence_paths();
    for p in &cited {
        let abs = flowtrace_core::state::run_dir(&root, &run_id).join(p);
        if !abs.exists() {
            anyhow::bail!(
                "evidence path `{}` not found on disk (resolved to {}) — write the file before calling `flowtrace reply`",
                p,
                abs.display()
            );
        }
    }

    let (seq, _at) = reply::append_reply(&root, &run_id, payload)?;

    // Stage explicitly: the new reply file + every cited evidence path.
    // No `add -A`; commits should contain only what the payload declares.
    let reply_rel = format!("runs/{}/replies/{:04}.json", run_id, seq);
    let cited_rel: Vec<String> = cited
        .iter()
        .map(|p| format!("runs/{}/{}", run_id, p))
        .collect();
    let mut files: Vec<&str> = Vec::with_capacity(1 + cited_rel.len());
    files.push(reply_rel.as_str());
    for c in &cited_rel {
        files.push(c.as_str());
    }
    git::commit_files(&root, &git::reply_commit_msg(step_id.as_deref(), seq), &files)?;

    match step_id {
        Some(s) => println!("ok: run={} step={} seq={:04}", run_id, s, seq),
        None => println!("ok: run={} seq={:04}", run_id, seq),
    }
    Ok(())
}

fn cmd_completion(shell: &str) -> Result<()> {
    use clap_complete::Shell;
    let shell = match shell {
        "bash" => Shell::Bash,
        "zsh" => Shell::Zsh,
        "fish" => Shell::Fish,
        "powershell" | "pwsh" => Shell::PowerShell,
        "elvish" => Shell::Elvish,
        other => anyhow::bail!("unsupported shell: {}", other),
    };
    let mut cmd = Cli::command();
    let bin = cmd.get_name().to_string();
    clap_complete::generate(shell, &mut cmd, bin, &mut std::io::stdout());
    Ok(())
}

fn cmd_run(action: RunCmd) -> Result<()> {
    let root = trace_root_or_bail()?;
    match action {
        RunCmd::New { name } => {
            git::init(&root)?;
            let id = create_run(&root, name.clone())?;
            let label = if name.is_empty() { id.clone() } else { name };
            let state_rel = format!("runs/{}/state.json", id);
            git::commit_files(
                &root,
                &git::run_event_commit_msg(&label, "start"),
                &[state_rel.as_str()],
            )?;
            println!("{}", id);
        }
        RunCmd::List => {
            for id in list_runs(&root)? {
                println!("{}", id);
            }
        }
        RunCmd::Show { run } => {
            let id = resolve_run(&root, run.as_deref())?;
            let s = read_state(&root, &id)?;
            println!("{}", serde_json::to_string_pretty(&s)?);
        }
        RunCmd::Pause { run } => commit_run_event(&root, run.as_deref(), "paused", |s| s.pause())?,
        RunCmd::Resume { run } => {
            commit_run_event(&root, run.as_deref(), "resumed", |s| s.resume())?
        }
        RunCmd::Abort { run } => {
            commit_run_event(&root, run.as_deref(), "aborted", |s| s.abort())?
        }
        RunCmd::Rename { name, run } => {
            let event = format!("renamed to {}", name);
            commit_run_event(&root, run.as_deref(), &event, |s| s.set_name(name.clone()))?
        }
    }
    Ok(())
}

fn commit_run_event(
    root: &Path,
    run_id: Option<&str>,
    event: &str,
    apply: impl FnMut(&mut flowtrace_core::state::RunState),
) -> Result<()> {
    let id = mutate_run(root, run_id, apply)?;
    let state_rel = format!("runs/{}/state.json", id);
    git::commit_files(
        root,
        &git::run_event_commit_msg(&id, event),
        &[state_rel.as_str()],
    )?;
    Ok(())
}

fn mutate_run(
    root: &Path,
    run_id: Option<&str>,
    mut apply: impl FnMut(&mut flowtrace_core::state::RunState),
) -> Result<String> {
    let id = resolve_run(root, run_id)?;
    let mut state = read_state(root, &id)?;
    apply(&mut state);
    write_state(root, &id, &state)?;
    println!("ok: run={}", id);
    Ok(id)
}

fn cmd_step(
    step_id: String,
    status: StatusArg,
    message: Option<String>,
    assets: Vec<String>,
    run: Option<String>,
) -> Result<()> {
    let root = trace_root_or_bail()?;
    let r = load_trace(&root)?;
    if !r.steps.contains_key(&step_id) {
        anyhow::bail!("step `{}` is not declared in trace.json", step_id);
    }
    let id = resolve_run(&root, run.as_deref())?;
    let new_status = flowtrace_core::state::Status::from_kind(status.label(), message)
        .map_err(anyhow::Error::msg)?;
    let normalized_assets = normalize_assets(&assets)?;

    // Asset paths are step-relative. Resolve under runs/<id>/<step_id>/ and
    // require each to exist before staging. The commit declares what it touches.
    let step_dir_abs = flowtrace_core::state::run_dir(&root, &id).join(&step_id);
    for a in &normalized_assets {
        let abs = step_dir_abs.join(a);
        if !abs.exists() {
            anyhow::bail!("asset `{}` not found on disk (resolved to {})", a, abs.display());
        }
    }

    let commit_msg = git::step_commit_msg(&step_id, &new_status);
    let mut state = read_state(&root, &id)?;
    state.set_step_status(&step_id, new_status);
    if !normalized_assets.is_empty() {
        state.set_step_assets(&step_id, normalized_assets.clone());
    }
    write_state(&root, &id, &state)?;

    // Stage exactly state.json + each declared asset. No add -A.
    let state_rel = format!("runs/{}/state.json", id);
    let asset_rels: Vec<String> = normalized_assets
        .iter()
        .map(|a| format!("runs/{}/{}/{}", id, step_id, a))
        .collect();
    let mut files: Vec<&str> = Vec::with_capacity(1 + asset_rels.len());
    files.push(state_rel.as_str());
    for a in &asset_rels {
        files.push(a.as_str());
    }
    git::commit_files(&root, &commit_msg, &files)?;
    println!("ok: run={} step={}", id, step_id);
    Ok(())
}

fn cmd_deliverable(
    status: StatusArg,
    message: Option<String>,
    assets: Vec<String>,
    run: Option<String>,
) -> Result<()> {
    let root = trace_root_or_bail()?;
    let id = resolve_run(&root, run.as_deref())?;
    let new_status = flowtrace_core::state::Status::from_kind(status.label(), message)
        .map_err(anyhow::Error::msg)?;
    let normalized_assets = normalize_assets(&assets)?;

    // Deliverable asset paths are run-relative. Validate each exists.
    let run_dir_abs = flowtrace_core::state::run_dir(&root, &id);
    for a in &normalized_assets {
        let abs = run_dir_abs.join(a);
        if !abs.exists() {
            anyhow::bail!("asset `{}` not found on disk (resolved to {})", a, abs.display());
        }
    }

    let commit_msg = git::deliverable_commit_msg(&new_status);
    let mut state = read_state(&root, &id)?;
    state.set_deliverable_status(new_status);
    if !normalized_assets.is_empty() {
        state.set_deliverable_assets(normalized_assets.clone());
    }
    write_state(&root, &id, &state)?;

    let state_rel = format!("runs/{}/state.json", id);
    let asset_rels: Vec<String> = normalized_assets
        .iter()
        .map(|a| format!("runs/{}/{}", id, a))
        .collect();
    let mut files: Vec<&str> = Vec::with_capacity(1 + asset_rels.len());
    files.push(state_rel.as_str());
    for a in &asset_rels {
        files.push(a.as_str());
    }
    git::commit_files(&root, &commit_msg, &files)?;
    println!("ok: run={} deliverable", id);
    Ok(())
}

fn normalize_assets(assets: &[String]) -> Result<Vec<String>> {
    check_and_normalize_all(assets.iter().map(String::as_str))
        .map_err(|(p, e)| anyhow::anyhow!("invalid asset path `{}`: {}", p, e))
}

impl StatusArg {
    fn label(self) -> &'static str {
        match self {
            StatusArg::Idle => "idle",
            StatusArg::Running => "running",
            StatusArg::Blocked => "blocked",
            StatusArg::Done => "done",
            StatusArg::Error => "error",
        }
    }
}

fn trace_root_or_bail() -> Result<PathBuf> {
    let cwd = env::current_dir()?;
    find_trace_root(&cwd)
        .with_context(|| format!("no trace.json found in {:?} or any parent", cwd))
}

fn load_trace(root: &Path) -> Result<Trace> {
    let path = root.join("trace.json");
    let bytes = fs::read(&path).with_context(|| format!("reading {}", path.display()))?;
    let r: Trace = serde_json::from_slice(&bytes)
        .with_context(|| format!("parsing {}", path.display()))?;
    Ok(r)
}
