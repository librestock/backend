# Install dependencies
bootstrap:
  pnpm install

# Run development server with Infisical-injected environment variables
dev:
  pnpm start

# Build for production
build:
  pnpm build

# Run production server with Infisical-injected environment variables
start:
  pnpm start:prod:infisical

# Lint and fix code
lint:
  pnpm lint

# Format code
format:
  pnpm format

# Run tests
test:
  pnpm test

# Run tests in watch mode
test-watch:
  pnpm test:watch

# Run tests with coverage
test-coverage:
  pnpm test:cov

# Run e2e tests
test-e2e:
  pnpm test:e2e
