use axum::body::{Body, Bytes};
use axum::extract::{Path as AxumPath, Query, State};
use axum::http::{header, HeaderMap, StatusCode};
use axum::response::Response;
use serde::Deserialize;
use std::path::{Path, PathBuf};

use crate::git;
use crate::serve::error::{ApiFault, ApiResult};
use crate::serve::state::AppState;

#[derive(Deserialize, Default)]
pub struct FileQuery {
    /// Optional commit SHA — when present, return the file's bytes as of that
    /// commit (via `git::show_at`) instead of the working-tree version.
    #[serde(default)]
    pub at: Option<String>,
}

/// Serve any file under one of the active scope roots. Path is a
/// scope-relative path joined back to the canonical root. Refuses any
/// path that escapes the root after canonicalization.
///
/// `?at=<sha>` switches the read to libgit2 — useful for re-rendering an old
/// reply faithfully (the asset the reply cited at write time).
pub async fn serve_file(
    State(state): State<AppState>,
    AxumPath(path): AxumPath<String>,
    Query(q): Query<FileQuery>,
    headers: HeaderMap,
) -> ApiResult<Response> {
    if path.contains("..") {
        return Err(ApiFault::forbidden("path traversal"));
    }
    if let Some(sha) = q.at.as_deref().filter(|s| !s.is_empty()) {
        return serve_at_commit(&state, &path, sha, &headers).await;
    }
    // Resolve to a canonical path inside some scope. Returns Err on missing
    // file or scope-escape attempts. After this, read directly — a separate
    // is_file() / exists() pre-check would add stats and a TOCTOU window.
    let candidate = resolve_under_scope(&state, &path)?;

    // One metadata stat, reused for the size guard and the ETag below.
    let meta = tokio::fs::metadata(&candidate).await.ok();

    // Refuse to buffer an enormous file fully into memory. `serve_file` (and
    // the Range path) both read the whole file via `tokio::fs::read`; a
    // multi-GB asset dropped into a trace folder would otherwise OOM the
    // server when it's clicked. Trace artifacts are docs, code, and modest
    // media — anything past this cap is refused rather than served.
    const MAX_SERVE_BYTES: u64 = 100 * 1024 * 1024; // 100 MB
    if let Some(m) = &meta {
        if m.len() > MAX_SERVE_BYTES {
            return Err(ApiFault::payload_too_large(format!(
                "file is {} bytes; refusing to serve over {} bytes",
                m.len(),
                MAX_SERVE_BYTES
            )));
        }
    }

    // Cheap conditional GET: weak ETag = "mtime_secs-size". Lets the browser
    // short-circuit polling without paying for the byte transfer when nothing
    // has changed. Skip if metadata failed — we'll still serve, just without ETag.
    let workdir_etag = meta.as_ref().and_then(|m| {
        let mtime = m
            .modified()
            .ok()?
            .duration_since(std::time::UNIX_EPOCH)
            .ok()?
            .as_secs();
        Some(format!("W/\"{}-{}\"", mtime, m.len()))
    });
    // 304 short-circuit only when this is a full-resource conditional GET.
    // A Range request asks for a fragment; RFC 7233 §3.2 says If-Range is the
    // only validator that combines with Range — bare If-None-Match doesn't
    // override range processing, so fall through to the Range branch below.
    if headers.get(header::RANGE).is_none() {
        if let (Some(etag), Some(req)) = (
            workdir_etag.as_deref(),
            headers.get(header::IF_NONE_MATCH).and_then(|v| v.to_str().ok()),
        ) {
            if req.split(',').any(|t| t.trim() == etag) {
                return Ok(Response::builder()
                    .status(StatusCode::NOT_MODIFIED)
                    .header(header::ETAG, etag)
                    .header(header::CACHE_CONTROL, "no-cache")
                    .body(Body::empty())
                    .map_err(|e| ApiFault::internal(e.to_string()))?);
            }
        }
    }

    let bytes = match tokio::fs::read(&candidate).await {
        Ok(b) => Bytes::from(b),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            return Err(ApiFault::not_found(path));
        }
        Err(e) => return Err(ApiFault::from(e)),
    };
    let mime = mime_guess::from_path(&candidate)
        .first_or_octet_stream()
        .to_string();
    if let Some(range) = headers.get(header::RANGE).and_then(|v| v.to_str().ok()) {
        if let Some(resp) = serve_range(&bytes, range, &mime) {
            return Ok(resp);
        }
    }
    let len = bytes.len();
    let mut builder = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime)
        .header(header::ACCEPT_RANGES, "bytes")
        .header(header::CONTENT_LENGTH, len)
        // Workdir content can change — `no-cache` means "always revalidate",
        // not "don't store". Combined with the weak ETag above, the client
        // gets 304s on unchanged polls.
        .header(header::CACHE_CONTROL, "no-cache");
    if let Some(etag) = workdir_etag.as_deref() {
        builder = builder.header(header::ETAG, etag);
    }
    let resp = builder
        .body(Body::from(bytes))
        .map_err(|e| ApiFault::internal(e.to_string()))?;
    Ok(resp)
}

/// Resolve `<scope-rel-path>` against scope roots → find the trace folder
/// that owns it → ask libgit2 for the bytes at that commit.
///
/// Sets `ETag: <blob_oid>` and `Cache-Control: public, max-age=31536000,
/// immutable`. `(commit, path)` uniquely identifies the blob, and the blob is
/// content-addressed by git — its contents can never change. Browsers and any
/// upstream CDN can cache the response forever. If the client sends
/// `If-None-Match: <blob_oid>` we return 304 with no body.
async fn serve_at_commit(
    state: &AppState,
    path: &str,
    sha: &str,
    headers: &HeaderMap,
) -> ApiResult<Response> {
    let (root, rel) = scope_owning(state, path).ok_or_else(|| {
        ApiFault::not_found(format!("no scope owns {}", path))
    })?;
    let sha_owned = sha.to_string();
    let rel_owned = rel.clone();
    let root_owned = root.clone();
    let (blob_oid, bytes) = tokio::task::spawn_blocking(move || {
        git::show_at_with_blob_sha(&root_owned, &sha_owned, &rel_owned)
    })
    .await
    .map_err(|e| ApiFault::internal(format!("git task panicked: {e}")))?
    .map_err(|e| ApiFault::not_found(format!("at={}: {}", sha, e)))?;

    let etag = format!("\"{}\"", blob_oid);

    // Conditional GET: if the client already has this blob cached, short-circuit.
    if let Some(inm) = headers.get(header::IF_NONE_MATCH).and_then(|v| v.to_str().ok()) {
        // Accept the bare or quoted form for tolerance, plus W/-weak.
        let trim = inm.trim_start_matches("W/").trim().trim_matches('"');
        if trim == blob_oid {
            return Response::builder()
                .status(StatusCode::NOT_MODIFIED)
                .header(header::ETAG, etag)
                .header(
                    header::CACHE_CONTROL,
                    "public, max-age=31536000, immutable",
                )
                .body(Body::empty())
                .map_err(|e| ApiFault::internal(e.to_string()));
        }
    }

    let mime = mime_guess::from_path(Path::new(&rel))
        .first_or_octet_stream()
        .to_string();
    let len = bytes.len();
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime)
        .header(header::CONTENT_LENGTH, len)
        .header(header::ETAG, etag)
        .header(
            header::CACHE_CONTROL,
            "public, max-age=31536000, immutable",
        )
        .body(Body::from(bytes))
        .map_err(|e| ApiFault::internal(e.to_string()))
}

/// For a scope-relative path like `dream-analysis/runs/<id>/foo/x.png`, find
/// the trace root that owns it. Returns (trace_root, path_relative_to_root).
fn scope_owning(state: &AppState, scope_rel: &str) -> Option<(PathBuf, String)> {
    let first = scope_rel.split('/').next()?;
    for scope in state.all_scopes() {
        let trace_root = scope.join(first);
        if trace_root.join("trace.json").is_file() {
            let rel = scope_rel
                .strip_prefix(first)
                .and_then(|s| s.strip_prefix('/'))
                .unwrap_or("")
                .to_string();
            if rel.is_empty() {
                return None;
            }
            return Some((trace_root, rel));
        }
    }
    None
}

fn resolve_under_scope(state: &AppState, rel: &str) -> ApiResult<PathBuf> {
    // `..` is also guarded at the handler entry, but keep the check here so
    // resolve_under_scope is correct on its own.
    if rel.contains("..") {
        return Err(ApiFault::forbidden("path traversal"));
    }
    for scope in state.all_scopes() {
        let candidate = scope.join(rel);
        // `canonicalize` errors on a non-existent path, so this is also our
        // existence check (no separate stat needed).
        let Ok(canon) = candidate.canonicalize() else { continue };
        if !canon.starts_with(&scope) {
            return Err(ApiFault::forbidden("path escapes scope"));
        }
        return Ok(canon);
    }
    Err(ApiFault::not_found(rel.to_string()))
}

fn serve_range(bytes: &Bytes, range: &str, mime: &str) -> Option<Response> {
    let total = bytes.len() as u64;
    if total == 0 {
        return None;
    }
    let raw = range.strip_prefix("bytes=")?;
    // Reject multi-range requests ("bytes=0-99,200-299") — uncommon and the
    // multipart/byteranges encoding would need extra plumbing. Single range only.
    if raw.contains(',') {
        return None;
    }
    let (start_s, end_s) = raw.split_once('-')?;
    let start: u64 = start_s.trim().parse().ok()?;
    let end: u64 = if end_s.trim().is_empty() {
        total - 1
    } else {
        end_s.trim().parse().ok()?
    };
    if start > end || end >= total {
        return None;
    }
    let len = (end - start + 1) as usize;
    let slice = bytes.slice(start as usize..=end as usize);
    let resp = Response::builder()
        .status(StatusCode::PARTIAL_CONTENT)
        .header(header::CONTENT_TYPE, mime)
        .header(header::ACCEPT_RANGES, "bytes")
        .header(header::CONTENT_LENGTH, len)
        .header(
            header::CONTENT_RANGE,
            format!("bytes {}-{}/{}", start, end, total),
        )
        .body(Body::from(slice))
        .ok()?;
    Some(resp)
}
