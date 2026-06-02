#!/usr/bin/env bash
# Build the `flowtrace` binary (frontend first, then cargo) and symlink it onto $PATH.
# Default symlink target is ~/.local/bin/; override with INSTALL_DIR.
# Re-run after `git pull` to update — the symlink points at target/release/flowtrace,
# so subsequent rebuilds are picked up automatically.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"

cd "$REPO_ROOT"

echo "▶ building web UI (frontend/dist → embedded into binary)" >&2
(cd frontend && npm install --silent && npm run build)

echo "▶ building flowtrace CLI (release profile)" >&2
cargo build --release -p flowtrace-cli

mkdir -p "$INSTALL_DIR"
ln -sf "$REPO_ROOT/target/release/flowtrace" "$INSTALL_DIR/flowtrace"
echo "  ✓ symlinked: $INSTALL_DIR/flowtrace → target/release/flowtrace" >&2

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    echo "  ! warning: $INSTALL_DIR is not on \$PATH" >&2
    echo "    add to your shell rc:  export PATH=\"$INSTALL_DIR:\$PATH\"" >&2
    ;;
esac

"$INSTALL_DIR/flowtrace" --version
