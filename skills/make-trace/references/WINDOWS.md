# Windows guide for make-trace

Read this file when the user is on Windows, when paths look like `C:\...`, or when Flowtrace install/build/serve commands fail because PowerShell, WSL, Rust, or Node are mixed.

## Choose one execution model

Use one shell model per command block.

| Model | Use when | Path style |
|---|---|---|
| WSL-first | Running upstream Bash scripts, examples, or `./scripts/install.sh` | `/mnt/c/tmp/Flowtrace` |
| PowerShell | Managing Windows files, opening folders, calling `gh`/`git` from Windows | `C:\tmp\Flowtrace` |
| Windows-native Rust | Building `flowtrace.exe` directly on Windows | `C:\tmp\Flowtrace` |

Prefer **WSL-first** for Flowtrace examples and install scripts because the repository's scripts are Bash-first.

## WSL-first install

Run in PowerShell only if WSL is missing:

```powershell
wsl --install
```

Then run inside WSL:

```bash
sudo apt-get update
sudo apt-get install -y curl git nodejs npm build-essential pkg-config libssl-dev
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
source "$HOME/.cargo/env"
cd /mnt/c/tmp
git clone https://github.com/AIScientists-Dev/Flowtrace.git
cd Flowtrace
./scripts/install.sh
export PATH="$HOME/.local/bin:$PATH"
flowtrace --version
```

If the user already cloned a fork on Windows, enter it from WSL:

```bash
cd /mnt/c/tmp/Flowtrace
source "$HOME/.cargo/env"
export PATH="$HOME/.local/bin:$PATH"
./scripts/install.sh
```

## Check an existing install

PowerShell:

```powershell
wsl bash -lc 'source "$HOME/.cargo/env" 2>/dev/null; export PATH="$HOME/.local/bin:$PATH"; flowtrace --version'
```

WSL:

```bash
source "$HOME/.cargo/env"
export PATH="$HOME/.local/bin:$PATH"
flowtrace --version
```

## Run an example on Windows

WSL:

```bash
source "$HOME/.cargo/env"
export PATH="$HOME/.local/bin:$PATH"
cd /mnt/c/tmp/Flowtrace/scripts/examples/minimal
bash build.sh
flowtrace serve --scope "$HOME/traces" --port 3320
```

Open in the Windows browser:

```text
http://127.0.0.1:3320
```

## PowerShell path conversion

When a user gives a Windows path, convert it before passing it to WSL:

```text
C:\tmp\Flowtrace -> /mnt/c/tmp/Flowtrace
C:\Users\ROG\work -> /mnt/c/Users/ROG/work
```

When documenting PowerShell commands, keep Windows paths:

```powershell
Set-Location -LiteralPath "C:\tmp\Flowtrace"
```

When documenting WSL commands, keep WSL paths:

```bash
cd /mnt/c/tmp/Flowtrace
```

## Trace path rules still use forward slashes

Inside `trace.json`, `STEP.md` frontmatter, CLI `--asset`, and reply `evidence[].path`, always use relative POSIX paths:

```text
resources/input.md
analysis/report.md
final/report.pdf
```

Never use:

```text
C:\tmp\trace\runs\run_...\analysis\report.md
analysis\report.md
/mnt/c/tmp/trace/runs/run_.../analysis/report.md
```

The CLI validates these paths and rejects backslashes, drive letters, absolute paths, `..`, and Windows-reserved names like `CON`, `NUL`, `COM1`, or `LPT1`.

## Common failures

### `cargo: command not found` inside Bash

Cause: Rust is installed on Windows, but `bash` is WSL and cannot see Windows Cargo reliably.

Fix inside WSL:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
source "$HOME/.cargo/env"
```

### `link.exe not found`

Cause: building Windows-native Rust without MSVC C++ Build Tools.

Fix: install Visual Studio Build Tools with the C++ workload, or switch to WSL-first install.

### `unexpected argument '--host'`

`flowtrace serve` accepts `--scope`, `--port`, and `--open`; it does not accept `--host`.

Use:

```bash
flowtrace serve --scope "$HOME/traces" --port 3320
```

### Browser cannot connect

Check the server is running and the port is correct:

```bash
flowtrace serve --scope "$HOME/traces" --port 3320
```

Then open:

```text
http://127.0.0.1:3320
```

### Mixed old and new inputs on reuse

On Windows this often happens because files are edited in Explorer while WSL is running the trace. Before creating a new run, replace every intended file under `resources/` and commit them if the run should preserve input history:

```bash
git add resources/
git commit -m "swap inputs: <new instance>"
```

## Windows-friendly data-analysis skeleton

For a repeated business or data-analysis workflow, prefer this trace shape:

```text
01_intake
02_business_question
03_data_inventory
04_metric_definition
05_data_quality_check
06_analysis_plan
07_driver_analysis
08_competitor_or_context_check
09_findings_synthesis
10_risk_and_assumption_check
11_final_deliverable
12_workflow_update
```

Use Markdown, CSV, JSON, PNG, or XLSX artifacts that a Windows user can open directly. Keep final deliverables separate from scratch notes.

