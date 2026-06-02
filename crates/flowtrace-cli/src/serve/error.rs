use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ApiError {
    pub error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

#[derive(Debug)]
pub struct ApiFault {
    pub status: StatusCode,
    pub error: String,
    pub detail: Option<String>,
}

impl ApiFault {
    pub fn not_found(s: impl Into<String>) -> Self {
        Self {
            status: StatusCode::NOT_FOUND,
            error: s.into(),
            detail: None,
        }
    }
    pub fn bad_request(s: impl Into<String>) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            error: s.into(),
            detail: None,
        }
    }
    pub fn unprocessable(s: impl Into<String>, detail: impl Into<String>) -> Self {
        Self {
            status: StatusCode::UNPROCESSABLE_ENTITY,
            error: s.into(),
            detail: Some(detail.into()),
        }
    }
    pub fn internal(s: impl Into<String>) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            error: s.into(),
            detail: None,
        }
    }
    pub fn payload_too_large(s: impl Into<String>) -> Self {
        Self {
            status: StatusCode::PAYLOAD_TOO_LARGE,
            error: s.into(),
            detail: None,
        }
    }
    pub fn forbidden(s: impl Into<String>) -> Self {
        Self {
            status: StatusCode::FORBIDDEN,
            error: s.into(),
            detail: None,
        }
    }
}

impl IntoResponse for ApiFault {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(ApiError {
                error: self.error,
                detail: self.detail,
            }),
        )
            .into_response()
    }
}

impl From<anyhow::Error> for ApiFault {
    fn from(e: anyhow::Error) -> Self {
        ApiFault::internal(e.to_string())
    }
}

impl From<flowtrace_core::TraceError> for ApiFault {
    fn from(e: flowtrace_core::TraceError) -> Self {
        use flowtrace_core::TraceError as E;
        match e {
            E::NotInTrace => ApiFault::not_found("not in a trace folder"),
            E::RunNotFound(s) => ApiFault::not_found(format!("run not found: {}", s)),
            E::NoRuns => ApiFault::not_found("no runs"),
            E::Validation(s) => ApiFault::unprocessable("validation", s),
            E::Io(s) => ApiFault::internal(format!("io: {}", s)),
            E::Json(s) => ApiFault::unprocessable("json", s),
        }
    }
}

impl From<std::io::Error> for ApiFault {
    fn from(e: std::io::Error) -> Self {
        ApiFault::internal(format!("io: {}", e))
    }
}

impl From<serde_json::Error> for ApiFault {
    fn from(e: serde_json::Error) -> Self {
        ApiFault::unprocessable("json", e.to_string())
    }
}

pub type ApiResult<T> = Result<T, ApiFault>;
