# Build stage
FROM rust:1.88-slim-bookworm as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the workspace Cargo files
COPY Cargo.toml ./

# Copy all workspace members (required by workspace)
COPY user-service ./user-service
COPY api-gateway ./api-gateway
COPY rodent-registry-service ./rodent-registry-service
COPY activity-tracking-service ./activity-tracking-service
COPY analytics-service ./analytics-service

# Build the user-service
RUN cargo build --release --package user-service

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy the built binary
COPY --from=builder /app/target/release/user-service /app/user-service

# Expose the port
EXPOSE 8001

# Run the service
CMD ["/app/user-service"]
