# LibreStock Inventory NestJS API

REST API for LibreStock Inventory Management System built with NestJS.

## Features

- 🔐 **Better Auth Authentication** - JWT/session auth with global guard
- 📝 **Swagger UI** - API documentation
- ✅ **Validation** - Request validation with class-validator
- 🏷️ **TypeScript** - Full type safety
- 📊 **Logging** - Structured logging with request IDs
- 🎯 **Guards & Decorators** - Custom auth guards and user decorators
- 🔗 **HATEOAS** - Hypermedia links in API responses
- 📦 **Inventory Management** - Track products across locations and areas
- 🚦 **Rate Limiting** - IP-based throttling with tiered limits
- 💪 **Transactions** - Atomic operations with `@Transactional` decorator
- 🏥 **Health Checks** - Kubernetes-ready liveness & readiness probes
- ⚠️ **Smart Error Handling** - Classified auth errors with retry hints

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
pnpm install
```

### Configuration

Copy the environment template:

```bash
cp .env.template .env
```

Set the following environment variables in `.env`:

```env
PORT=8080
BETTER_AUTH_SECRET=your_better_auth_secret
DATABASE_URL=postgresql://postgres@/librestock_inventory
```

### Running the Application

```bash
# Development mode with hot reload
pnpm run start:dev

# Production mode
pnpm run build
pnpm run start:prod
```

The API will be available at `http://localhost:8080`

### API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8080/api`

## Project Structure

```
src/
├── auth/                   # Authentication module
│   ├── dto/               # Auth DTOs
│   ├── auth.controller.ts # Auth endpoints
│   └── auth.module.ts
├── users/                  # Users module
│   ├── dto/               # User DTOs
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── categories/            # Categories module
│   ├── dto/
│   ├── categories.controller.ts
│   ├── categories.service.ts
│   └── categories.module.ts
├── products/              # Products module
│   ├── dto/
│   ├── products.controller.ts
│   ├── products.service.ts
│   └── products.module.ts
├── locations/             # Locations module
│   ├── dto/
│   ├── locations.controller.ts
│   ├── locations.service.ts
│   └── locations.module.ts
├── areas/                 # Areas module (zones within locations)
│   ├── dto/
│   ├── areas.controller.ts
│   ├── areas.service.ts
│   └── areas.module.ts
├── inventory/             # Inventory module
│   ├── dto/
│   ├── inventory.controller.ts
│   ├── inventory.service.ts
│   └── inventory.module.ts
├── health/                # Health check module
│   ├── health.controller.ts
│   └── health.module.ts
├── common/                # Shared utilities
│   ├── auth/              # Auth helpers
│   │   └── session.ts
│   ├── decorators/        # Custom decorators
│   │   └── roles.decorator.ts
│   ├── guards/            # Auth guards
│   │   └── roles.guard.ts
│   ├── middleware/        # Middleware
│   │   └── request-id.middleware.ts
│   ├── interceptors/      # Interceptors
│   │   └── logging.interceptor.ts
│   └── dto/               # Common DTOs
│       ├── error-response.dto.ts
│       └── message-response.dto.ts
├── app.module.ts          # Root module
└── main.ts                # Application entry point
```

## Authentication

All `/api/v1/*` endpoints (except `/health-check`) require Better Auth authentication.

### Using the API with Authentication

Include the Better Auth token in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_BETTER_AUTH_TOKEN" \
  http://localhost:8080/api/v1/users
```

### Sessions

Use the `@Session()` decorator from `@thallesp/nestjs-better-auth` to access the
authenticated session in controllers.

### Rate Limiting

The API includes built-in rate limiting to prevent abuse:

- **Standard endpoints**: 100 requests/minute
- **Bulk operations**: 20 requests/minute
- **Auth endpoints**: 10 requests/minute (prevents brute force)
- **Health checks**: No rate limiting

When rate limited, you'll receive a `429 Too Many Requests` response:

```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please slow down your requests and try again later.",
  "timestamp": "2026-01-18T20:00:00.000Z"
}
```

### Transaction Management

Critical operations are wrapped in database transactions to ensure data consistency:

- **Bulk operations** - All-or-nothing inserts/updates
- **Inventory creation** - Prevents race conditions
- **Quantity adjustments** - Atomic updates
- **Hierarchical updates** - Safe parent-child modifications

If any operation within a transaction fails, all changes are automatically rolled back.

### Enhanced Error Handling

Authentication errors include type information for better UX. Refer to the
Better Auth docs for error payload details.

## API Endpoints

### Health

- `GET /health-check` - Full health check (DB + Better Auth, no auth)
- `GET /health-check/live` - Liveness probe (always 200, Kubernetes ready)
- `GET /health-check/ready` - Readiness probe (DB check, Kubernetes ready)

### Authentication

- `GET /api/v1/auth/profile` - Get current user profile from Better Auth
- `GET /api/v1/auth/session-claims` - Get JWT session claims

### Users

- `GET /api/v1/users` - List all users
- `POST /api/v1/users` - Create user
- `GET /api/v1/users/:id` - Get user by ID
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user
- `GET /api/v1/users/search?q=query` - Search users by name

### Categories

- `GET /api/v1/categories` - List all categories (with tree structure)
- `POST /api/v1/categories` - Create category
- `PUT /api/v1/categories/:id` - Update category
- `DELETE /api/v1/categories/:id` - Delete category

### Products

- `GET /api/v1/products` - List all products (paginated)
- `GET /api/v1/products/all` - List all products
- `POST /api/v1/products` - Create product
- `POST /api/v1/products/bulk` - Bulk create products
- `GET /api/v1/products/:id` - Get product by ID
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product (soft delete)
- `DELETE /api/v1/products/bulk` - Bulk delete products
- `PATCH /api/v1/products/:id/restore` - Restore deleted product
- `PATCH /api/v1/products/bulk/restore` - Bulk restore products

### Locations

- `GET /api/v1/locations` - List all locations (paginated)
- `POST /api/v1/locations` - Create location
- `GET /api/v1/locations/:id` - Get location by ID
- `PUT /api/v1/locations/:id` - Update location
- `DELETE /api/v1/locations/:id` - Delete location

### Areas

Areas represent zones/shelves/bins within a Location.

- `GET /api/v1/areas` - List areas (with filters)
- `POST /api/v1/areas` - Create area
- `GET /api/v1/areas/:id` - Get area by ID
- `GET /api/v1/areas/:id/children` - Get area with children
- `PUT /api/v1/areas/:id` - Update area
- `DELETE /api/v1/areas/:id` - Delete area (cascades to children)

### Inventory

Inventory tracks quantities of products at locations/areas.

- `GET /api/v1/inventory` - List inventory (paginated)
- `POST /api/v1/inventory` - Create inventory record
- `GET /api/v1/inventory/:id` - Get inventory by ID
- `PUT /api/v1/inventory/:id` - Update inventory
- `PATCH /api/v1/inventory/:id/adjust` - Adjust quantity (+/-)
- `DELETE /api/v1/inventory/:id` - Delete inventory record

## Development

### Build

```bash
pnpm run build
```

### Linting

```bash
pnpm run lint
```

### Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

## Ported from Go API

This implementation is ported from the Go/Gin API and includes:

- ✅ Better Auth integration (equivalent to Go middleware)
- ✅ Request ID middleware
- ✅ Structured logging with request IDs
- ✅ All API endpoints from the Go implementation
- ✅ Input validation
- ✅ Error handling

## License

MIT
