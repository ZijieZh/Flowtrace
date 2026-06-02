use uuid::Uuid;

/// Random slug fallback for `POST /api/traces` when no id is supplied:
/// `rcp-<16 hex>`. Hyphen (not underscore) so the result satisfies the
/// slug regex in `flowtrace-core::validate`. Human-authored ids go through
/// `trace init <slug>` and look like `iris-analysis`.
pub fn random_trace_id() -> String {
    let raw = Uuid::new_v4().simple().to_string();
    format!("rcp-{}", &raw[..16])
}
