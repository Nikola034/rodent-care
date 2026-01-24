use axum::{
    body::Body,
    extract::State,
    http::{header, Request},
    response::Response,
};
use std::sync::Arc;

use crate::{error::GatewayError, AppState};

pub async fn proxy_request(
    State(state): State<Arc<AppState>>,
    target_url: &str,
    req: Request<Body>,
) -> Result<Response, GatewayError> {
    // Build the full URL - add /api prefix since routes are nested under /api
    let uri = req.uri();
    let path_and_query = uri
        .path_and_query()
        .map(|pq| pq.as_str())
        .unwrap_or("");
    
    // The path comes without /api prefix because of nesting, so we add it back
    let full_url = format!("{}/api{}", target_url, path_and_query);

    tracing::info!("Proxying {} {} to: {}", req.method(), path_and_query, full_url);

    // Build the proxied request - convert axum Method to reqwest Method
    let method = req.method().clone();
    let reqwest_method = reqwest::Method::from_bytes(method.as_str().as_bytes())
        .map_err(|_| GatewayError::InternalError)?;
    let mut builder = state.http_client.request(reqwest_method, &full_url);

    // Forward headers (except host)
    for (key, value) in req.headers().iter() {
        if key != header::HOST {
            if let Ok(v) = value.to_str() {
                builder = builder.header(key.as_str(), v);
            }
        }
    }

    // Forward body for POST/PUT/PATCH
    if matches!(method.as_str(), "POST" | "PUT" | "PATCH") {
        let body_bytes = axum::body::to_bytes(req.into_body(), usize::MAX)
            .await
            .map_err(|_| GatewayError::InternalError)?;
        builder = builder.body(body_bytes);
    }

    // Send the request
    let response = builder
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Proxy request failed: {:?}", e);
            GatewayError::ServiceUnavailable(format!("Upstream service unavailable: {}", e))
        })?;

    // Build the response
    let status = response.status();
    let headers = response.headers().clone();
    let body = response
        .bytes()
        .await
        .map_err(|_| GatewayError::BadGateway("Failed to read response body".to_string()))?;

    let mut response_builder = Response::builder().status(status.as_u16());
    
    for (key, value) in headers.iter() {
        if let Ok(v) = value.to_str() {
            response_builder = response_builder.header(key.as_str(), v);
        }
    }

    response_builder
        .body(Body::from(body))
        .map_err(|_| GatewayError::InternalError)
}
