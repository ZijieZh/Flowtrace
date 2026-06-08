//! Ensure `frontend/dist/` exists before the crate is compiled.
//!
//! The web UI is embedded into the binary by `rust-embed`
//! (`#[folder = "../../frontend/dist/"]` in `serve::embed`), whose derive macro
//! fails to compile if that folder is absent. `frontend/dist/` is gitignored and
//! only produced by `npm run build`, so a clean checkout has none — which would
//! block building even the headless CLI (init/step/run/reply/show/validate …)
//! with a Rust toolchain alone.
//!
//! Creating an empty placeholder keeps `cargo build` working without Node. When
//! the folder is empty, `serve` already degrades at runtime with a "build the
//! frontend first" message; a real `npm run build` populates it and the UI is
//! embedded as usual.

use std::path::PathBuf;

fn main() {
    let manifest = std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
    let dist: PathBuf = [&manifest, "..", "..", "frontend", "dist"].iter().collect();
    if !dist.exists() {
        std::fs::create_dir_all(&dist)
            .unwrap_or_else(|e| panic!("failed to create {}: {e}", dist.display()));
    }
    // Re-run this script when frontend/dist/ appears or disappears, so the
    // placeholder is recreated as needed. (rust-embed emits its own per-file
    // rerun directives, so re-embedding on content changes is handled there, not
    // here.)
    println!("cargo:rerun-if-changed=../../frontend/dist");
}
