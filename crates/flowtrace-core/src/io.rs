use crate::error::{TraceError, Result};
use std::io::Write;
use std::path::Path;

/// Atomic write via tempfile + rename in the same directory.
/// `notify-debouncer-full` coalesces the tmp+rename pair into a single event.
///
/// `tmp_prefix` is included in the dotfile name so multiple writers in the same
/// directory don't clobber each other's tmp files (e.g. ".trace.json.tmp" vs
/// ".state.json.tmp").
pub fn atomic_write_bytes(path: &Path, tmp_prefix: &str, bytes: &[u8]) -> Result<()> {
    let dir = path
        .parent()
        .ok_or_else(|| TraceError::Io(format!("path has no parent: {}", path.display())))?;
    std::fs::create_dir_all(dir)?;
    let file_name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let tmp = dir.join(format!(".{}.{}.tmp", tmp_prefix, file_name));
    {
        let mut f = std::fs::File::create(&tmp)?;
        f.write_all(bytes)?;
        f.sync_all()?;
    }
    std::fs::rename(&tmp, path)?;
    Ok(())
}

pub fn atomic_write_json<T: serde::Serialize>(path: &Path, tmp_prefix: &str, value: &T) -> Result<()> {
    let bytes = serde_json::to_vec_pretty(value)?;
    atomic_write_bytes(path, tmp_prefix, &bytes)
}
