# Install dependencies
bootstrap:
  pnpm install

# Decrypt environment variables
decrypt:
  op inject -i env.template -o .env

# Run development server
dev:
  pnpm start:dev

# Build for production
build:
  pnpm build

# Run production server
start:
  pnpm start:prod

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
