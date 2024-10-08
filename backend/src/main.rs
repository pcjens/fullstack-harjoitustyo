use core::time::Duration;
use std::sync::Arc;
use std::time::SystemTime;

use axum::http::header::{AUTHORIZATION, CONTENT_TYPE};
use axum::http::Method;
use axum::Router;
use sqlx::AnyPool;
use tokio::net::TcpListener;
use tokio::signal;
use tower_http::cors::{self, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

use crate::request_state::SharedState;

mod api_errors;
mod array_string_types;
mod config;
mod data;
mod request_state;
mod routes;
mod services;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().with_env_filter(EnvFilter::from_default_env()).init();
    tracing::debug!("Starting up.");

    let base_path = config::http_base_path();
    let router = if base_path.is_empty() || base_path == "/" {
        routes::create_router()
    } else {
        Router::new().nest(&base_path, routes::create_router())
    };
    tracing::debug!("Routes created.");

    let conn_str = config::database_url();
    sqlx::any::install_default_drivers();
    let mut db_pool =
        AnyPool::connect(&conn_str).await.expect("DATABASE_URL should be connectable");
    tracing::info!("Connected to the database.");

    sqlx::migrate!().run(&db_pool).await.expect("migrations should run");
    tracing::info!("Migrations done.");

    services::patch_postgres_primary_keys(&mut db_pool).await;

    let shared_state = Arc::new(SharedState { db_pool });

    tokio::spawn({
        let state = shared_state.clone();
        async move {
            loop {
                match state.db_pool.acquire().await {
                    Ok(mut conn) => {
                        let before_timestamp = SystemTime::now()
                            - Duration::from_secs(config::session_expiration_seconds());
                        if let Err(err) =
                            services::user::remove_sessions(&mut *conn, before_timestamp).await
                        {
                            tracing::warn!("Failed to remove old sessions: {:?}", err);
                        }
                    }
                    Err(err) => tracing::warn!(
                        "Failed to acquire db connection to remove old sessions: {:?}",
                        err
                    ),
                }
                tokio::time::sleep(Duration::from_secs(60)).await;
            }
        }
    });

    let cors_layer = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::PUT])
        .allow_origin(cors::Any)
        .allow_headers([AUTHORIZATION, CONTENT_TYPE]);
    let app = router.with_state(shared_state).layer(TraceLayer::new_for_http()).layer(cors_layer);
    tracing::debug!("Axum app configured.");

    let addr = config::http_bind_address();
    let listener = TcpListener::bind(&addr).await.unwrap();
    tracing::info!("Now serving the HTTP API at: http://{addr}{base_path}");

    axum::serve(listener, app).with_graceful_shutdown(shutdown_signal()).await.unwrap();

    tracing::info!("Bye!");
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c().await.expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal caught, stopping gracefully.");
}
