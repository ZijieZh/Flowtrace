pub mod classify;
pub mod embed;
pub mod error;
pub mod events;
pub mod routes;
pub mod scope;
pub mod state;
pub mod watcher;

use anyhow::{Context, Result};
use axum::routing::{delete, get, patch, post};
use axum::Router;
use std::net::SocketAddr;
use std::path::Path;
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

use state::AppState;

pub async fn run(scope: &Path, port: u16, open: bool) -> Result<()> {
    let state = AppState::new(scope)?;
    watcher::spawn(state.clone()).context("starting filesystem watcher")?;
    watcher::spawn_heartbeat(state.clone());

    let app = build_router(state.clone());

    let addr: SocketAddr = ([127, 0, 0, 1], port).into();
    let listener = TcpListener::bind(addr)
        .await
        .with_context(|| format!("binding to {}", addr))?;
    let bound = listener.local_addr()?;
    let url = format!("http://{}", bound);
    eprintln!("flowtrace serve listening at {}", url);
    eprintln!("scope: {}", state.user_scope_root.display());

    if open {
        if let Err(e) = open_url(&url) {
            eprintln!("could not open browser: {}", e);
        }
    }

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

fn build_router(state: AppState) -> Router {
    let api = Router::new()
        .route("/traces", get(routes::traces::list))
        .route("/traces", post(routes::traces::create))
        .route("/traces/{trace_id}", get(routes::traces::get))
        .route("/traces/{trace_id}", patch(routes::traces::patch_meta))
        .route("/traces/{trace_id}", delete(routes::traces::remove))
        .route(
            "/traces/{trace_id}/steps",
            post(routes::traces::add_step),
        )
        .route(
            "/traces/{trace_id}/steps/{step_id}",
            patch(routes::traces::patch_step),
        )
        .route(
            "/traces/{trace_id}/files",
            get(routes::traces::list_trace_files),
        )
        .route(
            "/traces/{trace_id}/steps/{step_id}/files",
            get(routes::traces::list_step_files),
        )
        .route(
            "/traces/{trace_id}/steps/{step_id}",
            delete(routes::traces::remove_step),
        )
        .route(
            "/traces/{trace_id}/steps/{step_id}/rename",
            post(routes::traces::rename_step),
        )
        .route(
            "/traces/{trace_id}/steps/{step_id}/from_steps",
            post(routes::traces::add_from_step),
        )
        .route(
            "/traces/{trace_id}/steps/{step_id}/from_steps/{dep}",
            delete(routes::traces::remove_from_step),
        )
        .route(
            "/traces/{trace_id}/steps/{step_id}/assets",
            post(routes::traces::add_asset),
        )
        .route(
            "/traces/{trace_id}/steps/{step_id}/assets/{asset}",
            delete(routes::traces::remove_asset),
        )
        .route(
            "/traces/{trace_id}/deliverable",
            patch(routes::traces::patch_deliverable),
        )
        .route(
            "/traces/{trace_id}/environment/{lang}",
            post(routes::traces::add_env_pkg),
        )
        .route(
            "/traces/{trace_id}/environment/{lang}/{pkg}",
            delete(routes::traces::remove_env_pkg),
        )
        .route("/traces/{trace_id}/runs", get(routes::runs::list))
        .route("/traces/{trace_id}/runs", post(routes::runs::create))
        .route("/runs/{id}", get(routes::runs::get))
        .route("/runs/{id}/name", patch(routes::runs::rename_run))
        .route(
            "/runs/{id}/steps/{step_id}",
            post(routes::runs::set_step),
        )
        .route("/runs/{id}/pause", post(routes::runs::pause))
        .route("/runs/{id}/resume", post(routes::runs::resume))
        .route("/runs/{id}/abort", post(routes::runs::abort))
        .route("/runs/{id}/deliverable", post(routes::runs::set_deliverable))
        .route(
            "/runs/{id}/replies",
            get(routes::reply::list).post(routes::reply::append),
        )
        .route("/runs/{id}/commits", get(routes::commits::list))
        .route("/files/{*path}", get(routes::assets::serve_file))
        .route("/events", get(routes::events::sse))
        .route("/config", get(routes::config::get))
        .route("/config/scope", post(routes::config::add_scope))
        .route(
            "/config/scope/{idx}",
            delete(routes::config::remove_scope),
        )
        .with_state(state.clone());

    Router::new()
        .nest("/api", api)
        .fallback(embed::serve_spa)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
}

fn open_url(url: &str) -> Result<()> {
    let cmd = if cfg!(target_os = "macos") {
        "open"
    } else if cfg!(target_os = "windows") {
        "start"
    } else {
        "xdg-open"
    };
    std::process::Command::new(cmd).arg(url).spawn()?;
    Ok(())
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c().await.ok();
    eprintln!("\nshutting down");
}
