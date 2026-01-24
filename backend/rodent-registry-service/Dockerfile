# Build stage
FROM rust:1.75-slim-bookworm as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace Cargo.toml and all service directories
COPY Cargo.toml ./
COPY user-service ./user-service
COPY api-gateway ./api-gateway
COPY rodent-registry-service ./rodent-registry-service

# Build the rodent-registry-service
RUN cargo build --release --package rodent-registry-service

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy the built binary
COPY --from=builder /app/target/release/rodent-registry-service /app/rodent-registry-service

EXPOSE 8002

CMD ["/app/rodent-registry-service"]
