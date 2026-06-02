use axum::extract::{Path as AxumPath, Query, State};
use axum::Json;
use flowtrace_core::output::StructuredOutput;
use serde::Deserialize;

use crate::git;
use crate::reply::{append_reply, list_replies_since, Reply};
use crate::serve::error::{ApiFault, ApiResult};
use crate::serve::events::{broadcast, SseEventBody};
use crate::serve::scope::locate_run;
use crate::serve::state::AppState;

/// POST body for `/api/runs/{id}/replies`. Just the structured-output payload —
/// step is derived from `checkpoint.step_id` inside it.
#[derive(Deserialize)]
pub struct AppendReplyBody {
    pub output: StructuredOutput,
}

/// `POST /api/runs/{id}/replies` — append one reply to the run's stream.
/// Step is derived from `output.checkpoint.step_id`. Every cited evidence
/// path must exist on disk; the commit stages the reply file + those paths.
pub async fn append(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
    Json(body): Json<AppendReplyBody>,
) -> ApiResult<Json<Reply>> {
    let (trace_id, root) = locate_run(&state, &id)?;
    let output = body.output;
    let step_id: Option<String> = output.step_id().map(String::from);
    let cited = output.evidence_paths();

    // Validate every cited evidence path exists.
    let run_dir = flowtrace_core::state::run_dir(&root, &id);
    for p in &cited {
        if !run_dir.join(p).exists() {
            return Err(ApiFault::bad_request(format!(
                "evidence path `{}` not found on disk",
                p
            )));
        }
    }

    let id_for_task = id.clone();
    let step_for_task = step_id.clone();
    let output_for_task = output.clone();
    let cited_for_task = cited;
    let (seq, at, sha) = tokio::task::spawn_blocking(move || -> anyhow::Result<_> {
        let (seq, at) = append_reply(&root, &id_for_task, output_for_task)?;
        let commit_msg = git::reply_commit_msg(step_for_task.as_deref(), seq);
        let reply_rel = format!("runs/{}/replies/{:04}.json", id_for_task, seq);
        let cited_rel: Vec<String> =
            cited_for_task.iter().map(|p| format!("runs/{}/{}", id_for_task, p)).collect();
        let mut files: Vec<&str> = Vec::with_capacity(1 + cited_rel.len());
        files.push(reply_rel.as_str());
        for c in &cited_rel {
            files.push(c.as_str());
        }
        git::commit_files(&root, &commit_msg, &files)?;
        let sha = git::head_sha(&root)?;
        Ok((seq, at, sha))
    })
    .await
    .map_err(|e| ApiFault::internal(format!("reply task panicked: {e}")))?
    .map_err(ApiFault::from)?;

    broadcast(
        &state,
        SseEventBody::ReplyAppended {
            trace_id,
            run_id: id.clone(),
            seq,
        },
    );
    Ok(Json(Reply {
        seq,
        at,
        step_id,
        commit: Some(sha),
        output,
    }))
}

#[derive(Deserialize, Default)]
pub struct ListRepliesQuery {
    #[serde(default)]
    pub since: u32,
    /// Optional commit SHA — return the reply stream as it was at that commit.
    #[serde(default)]
    pub at: Option<String>,
}

/// `GET /api/runs/{id}/replies[?since=N][&at=SHA]` — return replies with
/// `seq > since`, sorted ascending. Each reply is enriched with the SHA of
/// the commit that introduced its file.
pub async fn list(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
    Query(q): Query<ListRepliesQuery>,
) -> ApiResult<Json<Vec<Reply>>> {
    let (_, root) = locate_run(&state, &id)?;
    let id_for_task = id.clone();
    let at = q.at.clone().filter(|s| !s.is_empty());
    let replies: Vec<Reply> = tokio::task::spawn_blocking(move || -> anyhow::Result<Vec<Reply>> {
        let mut replies = match at.as_deref() {
            Some(sha) => list_replies_at(&root, &id_for_task, sha)?,
            None => list_replies_since(&root, &id_for_task, q.since)?,
        };

        // Build a `rel_path → introducing_sha` index in ONE history walk,
        // then look up each reply in O(1). Replaces the O(N×walk) per-reply
        // search that opened libgit2 once per reply.
        let dir_rel = format!("runs/{}/replies", id_for_task);
        let wanted: Vec<String> = replies
            .iter()
            .map(|r| format!("{}/{:04}.json", dir_rel, r.seq))
            .collect();
        let intros = git::introducing_commits(&root, wanted.iter().map(String::as_str))
            .unwrap_or_default();
        for (i, r) in replies.iter_mut().enumerate() {
            r.commit = intros.get(&wanted[i]).cloned();
        }
        if let Some(sha) = at {
            for r in &mut replies {
                if r.commit.is_none() {
                    r.commit = Some(sha.clone());
                }
            }
        }
        Ok(replies)
    })
    .await
    .map_err(|e| ApiFault::internal(format!("list task panicked: {e}")))?
    .map_err(ApiFault::from)?;
    Ok(Json(replies))
}

/// Replies present in the tree at `sha`, sorted by seq ascending.
fn list_replies_at(
    root: &std::path::Path,
    run_id: &str,
    sha: &str,
) -> anyhow::Result<Vec<Reply>> {
    let dir_rel = format!("runs/{}/replies", run_id);
    let entries = git::list_dir_blobs_at(root, sha, &dir_rel)?;
    let mut typed: Vec<(u32, Reply)> = Vec::with_capacity(entries.len());
    for (name, bytes) in entries {
        let Some(stem) = name.strip_suffix(".json") else { continue };
        let Ok(seq) = stem.parse::<u32>() else { continue };
        if let Ok(r) = serde_json::from_slice::<Reply>(&bytes) {
            typed.push((seq, r));
        }
    }
    typed.sort_by_key(|(s, _)| *s);
    Ok(typed.into_iter().map(|(_, r)| r).collect())
}
