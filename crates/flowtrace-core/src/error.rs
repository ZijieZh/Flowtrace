use thiserror::Error;

pub type Result<T> = std::result::Result<T, TraceError>;

#[derive(Debug, Error)]
pub enum TraceError {
    #[error("not inside a trace (no trace.json found in CWD or any parent)")]
    NotInTrace,
    #[error("run not found: {0}")]
    RunNotFound(String),
    #[error("no runs yet — create one with `trace run new`")]
    NoRuns,
    #[error("validation: {0}")]
    Validation(String),
    #[error("io: {0}")]
    Io(String),
    #[error("json: {0}")]
    Json(String),
}

impl From<std::io::Error> for TraceError {
    fn from(e: std::io::Error) -> Self {
        TraceError::Io(e.to_string())
    }
}

impl From<serde_json::Error> for TraceError {
    fn from(e: serde_json::Error) -> Self {
        TraceError::Json(e.to_string())
    }
}
