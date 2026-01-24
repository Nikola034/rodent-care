# Rodent Care Organization - Backend

This is the backend for the Rodent Care Organization application, built with Rust and Axum framework.

## Architecture

The backend consists of the following microservices:

### 1. API Gateway (Port 8000)
Central entry point for all API requests.
- **Features:**
  - JWT token validation
  - Request routing to microservices
  - Rate limiting (100 requests per minute per client)
  - CORS handling
  - Request logging

### 2. User Service (Port 8001)
Handles authentication, authorization, and user management.
- **Features:**
  - User registration with role selection
  - JWT-based authentication
  - Refresh token mechanism
  - Role management (Admin, Caretaker, Veterinarian, Volunteer)
  - User status management (Pending, Active, Inactive)
  - Activity logging

## Technologies

- **Rust** - Programming language
- **Axum** - Web framework
- **Tokio** - Async runtime
- **SQLx** - PostgreSQL database driver
- **PostgreSQL** - Relational database
- **JWT (jsonwebtoken)** - Token-based authentication
- **bcrypt** - Password hashing
- **Docker** - Containerization

## Prerequisites

- **Docker & Docker Compose** (recommended for easy setup)
- OR
- **Rust 1.75+** (for local development)
- **PostgreSQL 16+**

## Quick Start with Docker (Recommended)

### 1. Clone the repository
```bash
git clone https://github.com/Nikola034/rodent-care.git
cd rodent-care
```

### 2. Start all services
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- MongoDB (port 27017) - for future services
- RabbitMQ (ports 5672, 15672) - for future async communication
- User Service (port 8001)
- API Gateway (port 8000)

### 3. Check if services are running
```bash
docker-compose ps
```

### 4. View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f user-service
docker-compose logs -f api-gateway
```

### 5. Stop services
```bash
docker-compose down

# To also remove volumes (database data):
docker-compose down -v
```

## Local Development (Without Docker)

### 1. Install Rust
```bash
# Windows (PowerShell)
winget install Rustlang.Rust.MSVC

# Or download from https://rustup.rs
```

### 2. Install PostgreSQL
```bash
# Windows
winget install PostgreSQL.PostgreSQL

# Or download from https://www.postgresql.org/download/
```

### 3. Create database
```sql
-- Connect to PostgreSQL and run:
CREATE DATABASE rodent_care_users;
CREATE USER rodentcare WITH PASSWORD 'rodentcare_password';
GRANT ALL PRIVILEGES ON DATABASE rodent_care_users TO rodentcare;
```

### 4. Set up environment variables

Copy the example env files:
```bash
cd backend/user-service
copy .env.example .env

cd ../api-gateway
copy .env.example .env
```

Update `.env` files with your database credentials if needed.

### 5. Build and run

```bash
cd backend

# Build all services
cargo build --release

# Run User Service (in one terminal)
cargo run --package user-service

# Run API Gateway (in another terminal)
cargo run --package api-gateway
```

## API Endpoints

### Health Check
```
GET /api/health
GET /api/services/health
```

### Authentication (Public)

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "volunteer"  // volunteer, caretaker, veterinarian
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "access_token": "eyJ...",
  "refresh_token": "uuid-token",
  "token_type": "Bearer",
  "expires_in": 86400,
  "user": {
    "id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "volunteer",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "your-refresh-token"
}
```

### Protected Endpoints (Require JWT)

All protected endpoints require the `Authorization` header:
```
Authorization: Bearer <your-access-token>
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

#### Get Current User
```http
GET /api/users/me
Authorization: Bearer <token>
```

### Admin Endpoints (Require Admin Role)

#### List Users
```http
GET /api/users?status=pending&role=volunteer&page=1&limit=20
Authorization: Bearer <admin-token>
```

#### Get User by ID
```http
GET /api/users/{user_id}
Authorization: Bearer <admin-token>
```

#### Update User Role
```http
PUT /api/users/{user_id}/role
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "role": "caretaker"  // admin, caretaker, veterinarian, volunteer
}
```

#### Update User Status (Approve/Deactivate)
```http
PUT /api/users/{user_id}/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "active"  // pending, active, inactive
}
```

#### Delete User
```http
DELETE /api/users/{user_id}
Authorization: Bearer <admin-token>
```

#### Get User Activity Logs
```http
GET /api/users/{user_id}/activity-logs?page=1&limit=50
Authorization: Bearer <admin-token>
```

## Default Admin Account

When the User Service starts for the first time, it creates a default admin user:
- **Username:** admin
- **Password:** admin123
- **Role:** Admin
- **Status:** Active

⚠️ **Important:** Change the admin password in production!

## User Roles & Permissions

| Role | Description | Permissions |
|------|-------------|-------------|
| Admin | System administrator | Full access, user management |
| Caretaker | Animal caretaker/manager | Animal management, daily tracking |
| Veterinarian | Medical staff | Medical records, health analytics |
| Volunteer | Read-only user | View basic animal information |

## User Status Flow

1. **Pending** - New registration, awaiting admin approval
2. **Active** - Approved user, can access the system
3. **Inactive** - Deactivated account, cannot login

## Environment Variables

### User Service
| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Service port | 8001 |
| DATABASE_URL | PostgreSQL connection string | required |
| JWT_SECRET | Secret key for JWT signing | required |
| JWT_EXPIRATION_HOURS | Access token validity | 24 |
| REFRESH_TOKEN_EXPIRATION_DAYS | Refresh token validity | 7 |
| RUST_LOG | Log level | info |

### API Gateway
| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Gateway port | 8000 |
| USER_SERVICE_URL | User Service URL | http://localhost:8001 |
| RATE_LIMIT_REQUESTS | Max requests per window | 100 |
| RATE_LIMIT_WINDOW_SECS | Rate limit window | 60 |
| RUST_LOG | Log level | info |

## Testing with cURL

### 1. Login as Admin
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

### 2. Register a New User
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "newuser", "email": "new@example.com", "password": "password123", "role": "volunteer"}'
```

### 3. Approve User (as Admin)
```bash
curl -X PUT http://localhost:8000/api/users/{user_id}/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"status": "active"}'
```

## Project Structure

```
backend/
├── Cargo.toml              # Workspace configuration
├── .gitignore
├── user-service/
│   ├── Cargo.toml
│   ├── Dockerfile
│   ├── .env.example
│   └── src/
│       ├── main.rs         # Entry point
│       ├── config.rs       # Configuration
│       ├── db.rs           # Database connection & migrations
│       ├── error.rs        # Error handling
│       ├── handlers.rs     # Request handlers
│       ├── middleware.rs   # Auth middleware
│       ├── models.rs       # Data models & DTOs
│       └── routes.rs       # Route definitions
└── api-gateway/
    ├── Cargo.toml
    ├── Dockerfile
    ├── .env.example
    └── src/
        ├── main.rs         # Entry point
        ├── config.rs       # Configuration
        ├── error.rs        # Error handling
        ├── handlers.rs     # Route handlers
        ├── middleware.rs   # Auth & rate limit middleware
        ├── proxy.rs        # Request proxying
        └── rate_limiter.rs # Rate limiting logic
```

## Future Services (Not Yet Implemented)

- **Rodent Registry Service** (Port 8002) - Animal management
- **Activity Tracking Service** (Port 8003) - Daily activities
- **Analytics Service** (Port 8004) - Reports and analytics

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres
```

### Service Won't Start
```bash
# Check service logs
docker-compose logs user-service
docker-compose logs api-gateway

# Rebuild containers
docker-compose build --no-cache
docker-compose up -d
```

### Reset Everything
```bash
docker-compose down -v
docker-compose up -d
```

## License

This project is part of an academic project for "Napredne tehnike programiranja" course.
