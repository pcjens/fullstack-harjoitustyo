//! The module for endpoints at the base path, e.g. \[/api\]/ping. Every
//! submodule defines more HTTP request handlers, named based on the path. For
//! example, the \[/api\]/foo/bar resource would be in the `foo` module, and the
//! handler function would be `crate::routes::foo::bar`.

use std::sync::Arc;

use anyhow::Context;
use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::get;
use axum::Router;
use sqlx::{AnyPool, Connection};

mod user;

#[derive(Debug)]
pub struct SharedState {
    pub db_pool: AnyPool,
}

pub fn create_router() -> Router<Arc<SharedState>> {
    Router::new()
        .route("/health", get(health))
        .nest("/user", user::create_router())
        .fallback(not_found)
}

#[tracing::instrument(level = "trace")]
pub async fn health(State(state): State<Arc<SharedState>>) -> (StatusCode, String) {
    let run_checks = || async {
        // Database
        let mut conn =
            state.db_pool.acquire().await.context("cannot acquire database connection")?;
        conn.ping().await.context("database ping was not returned")?;
        tracing::trace!("Database is good.");

        Ok(())
    };

    if let Err(message) = run_checks().await {
        let message: anyhow::Error = message;
        (StatusCode::INTERNAL_SERVER_ERROR, format!("{message}"))
    } else {
        (StatusCode::OK, "All systems nominal.".into())
    }
}

async fn not_found() -> (StatusCode, &'static str) {
    (
        StatusCode::NOT_FOUND,
        "404 Not Found\r\n\r\nYou've reached the backend API, but there's no resource at this path.",
    )
}
