use axum::body::Body;
use axum::http::{header, Response, StatusCode, Uri};
use axum::response::IntoResponse;
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "../../frontend/dist/"]
#[include = "**/*"]
struct Assets;

/// Serve embedded SPA. Falls back to index.html for unknown paths so
/// react-router can take over client-side routing.
pub async fn serve_spa(uri: Uri) -> impl IntoResponse {
    let path = uri.path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };
    serve_or_index(path)
}

fn serve_or_index(path: &str) -> Response<Body> {
    if let Some(content) = Assets::get(path) {
        let mime = mime_guess::from_path(path).first_or_octet_stream();
        let body = Body::from(content.data.into_owned());
        // index.html is the SPA shell — must revalidate on every visit so
        // upgrades don't get stuck on a stale JS bundle reference.
        let cache = if path == "index.html" || path.is_empty() {
            "no-cache"
        } else {
            "public, max-age=31536000, immutable"
        };
        return Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, mime.as_ref())
            .header(header::CACHE_CONTROL, cache)
            .body(body)
            .unwrap();
    }
    if let Some(index) = Assets::get("index.html") {
        let body = Body::from(index.data.into_owned());
        return Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
            .header(header::CACHE_CONTROL, "no-cache")
            .body(body)
            .unwrap();
    }
    // Frontend not yet built; helpful message.
    Response::builder()
        .status(StatusCode::NOT_FOUND)
        .header(header::CONTENT_TYPE, "text/plain; charset=utf-8")
        .body(Body::from(
            "frontend/dist/ is empty. Build the frontend first: `cd frontend && npm run build`.",
        ))
        .unwrap()
}
