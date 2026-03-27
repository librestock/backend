import { HttpServer } from '@effect/platform';
import { BunHttpServer, BunRuntime } from '@effect/platform-bun';
import 'dotenv/config';
import { Effect, Layer } from 'effect';
import { buildHttpApp } from './http/app';
import { AuditLogsService } from './modules/audit-logs/service';
import { AreasService } from './modules/areas/service';
import { AuthService } from './modules/auth/service';
import { BrandingService } from './modules/branding/service';
import { CategoriesService } from './modules/categories/service';
import { ClientsService } from './modules/clients/service';
import { HealthService } from './modules/health/service';
import { InventoryService } from './modules/inventory/service';
import { LocationsService } from './modules/locations/service';
import { OrdersService } from './modules/orders/service';
import { PhotosService } from './modules/photos/service';
import { ProductsService } from './modules/products/service';
import type { RolesInfrastructureError } from './modules/roles/roles.errors';
import { RolesService } from './modules/roles/service';
import { StockMovementsService } from './modules/stock-movements/service';
import { SuppliersService } from './modules/suppliers/service';
import { UsersService } from './modules/users/service';
import { auditLayer } from './platform/audit';
import { BetterAuth, betterAuthLayer } from './platform/better-auth';
import { runtimeLoggingLayer } from './platform/console-logging';
import {
  DrizzleDatabase,
  DrizzleInitializationError,
  drizzleLayer,
} from './platform/drizzle';

const VALID_NODE_ENVS = ['development', 'staging', 'production'] as const;
const nodeEnv = process.env.NODE_ENV ?? 'development';
if (!VALID_NODE_ENVS.includes(nodeEnv as (typeof VALID_NODE_ENVS)[number])) {
  throw new Error(
    `Invalid NODE_ENV="${nodeEnv}". Must be one of: ${VALID_NODE_ENVS.join(', ')}`,
  );
}
process.env.NODE_ENV = nodeEnv;
const isProduction = nodeEnv === 'production';

const port = Number(process.env.PORT ?? 8080);

const platformLayer = Layer.mergeAll(drizzleLayer, betterAuthLayer);

// Phase 1 layers
const rolesApplicationLayer = RolesService.Default.pipe(
  Layer.provide(platformLayer),
);
const authApplicationLayer = AuthService.Default.pipe(
  Layer.provide(rolesApplicationLayer),
);
const usersApplicationLayer = UsersService.Default.pipe(
  Layer.provide(Layer.mergeAll(platformLayer, rolesApplicationLayer)),
);
const rolesSeedLayer = Layer.effectDiscard(
  Effect.flatMap(RolesService, (rolesService) => rolesService.seed()),
).pipe(Layer.provide(rolesApplicationLayer));
const betterAuthMigrationLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const runMigrations =
      !isProduction || process.env.RUN_BETTER_AUTH_MIGRATIONS === 'true';

    if (!runMigrations) {
      return;
    }

    yield* DrizzleDatabase;
    const betterAuth = yield* BetterAuth;
    yield* Effect.tryPromise({
      try: async () => {
        const ctx = await betterAuth.auth.$context;
        await ctx.runMigrations();
      },
      catch: (cause) =>
        new DrizzleInitializationError({
          messageKey: 'drizzle.migrationsFailed',
          cause,
        }),
    });
  }),
).pipe(Layer.provide(platformLayer));

// Phase 2 layers
const auditLogsApplicationLayer = AuditLogsService.Default.pipe(
  Layer.provide(platformLayer),
);
const brandingApplicationLayer = BrandingService.Default.pipe(
  Layer.provide(platformLayer),
);
const locationsApplicationLayer = LocationsService.Default.pipe(
  Layer.provide(platformLayer),
);
const categoriesApplicationLayer = CategoriesService.Default.pipe(
  Layer.provide(platformLayer),
);
const areasApplicationLayer = AreasService.Default.pipe(
  Layer.provide(Layer.mergeAll(platformLayer, locationsApplicationLayer)),
);

// Phase 3 layers
const clientsApplicationLayer = ClientsService.Default.pipe(
  Layer.provide(platformLayer),
);
const suppliersApplicationLayer = SuppliersService.Default.pipe(
  Layer.provide(platformLayer),
);
const productsApplicationLayer = ProductsService.Default.pipe(
  Layer.provide(Layer.mergeAll(platformLayer, categoriesApplicationLayer)),
);
const photosApplicationLayer = PhotosService.Default.pipe(
  Layer.provide(platformLayer),
);

// Phase 4 layers
const stockMovementsApplicationLayer = StockMovementsService.Default.pipe(
  Layer.provide(
    Layer.mergeAll(
      platformLayer,
      productsApplicationLayer,
      locationsApplicationLayer,
    ),
  ),
);
const inventoryApplicationLayer = InventoryService.Default.pipe(
  Layer.provide(
    Layer.mergeAll(
      platformLayer,
      productsApplicationLayer,
      locationsApplicationLayer,
      areasApplicationLayer,
    ),
  ),
);
const ordersApplicationLayer = OrdersService.Default.pipe(
  Layer.provide(
    Layer.mergeAll(
      platformLayer,
      clientsApplicationLayer,
      productsApplicationLayer,
    ),
  ),
);

const applicationLayer = Layer.mergeAll(
  platformLayer,
  auditLayer.pipe(Layer.provide(platformLayer)),
  HealthService.Default.pipe(Layer.provide(platformLayer)),
  rolesApplicationLayer,
  authApplicationLayer,
  usersApplicationLayer,
  rolesSeedLayer,
  betterAuthMigrationLayer,
  auditLogsApplicationLayer,
  brandingApplicationLayer,
  locationsApplicationLayer,
  categoriesApplicationLayer,
  areasApplicationLayer,
  clientsApplicationLayer,
  suppliersApplicationLayer,
  productsApplicationLayer,
  photosApplicationLayer,
  stockMovementsApplicationLayer,
  inventoryApplicationLayer,
  ordersApplicationLayer,
);

const serverLayer = Layer.unwrapEffect(
  buildHttpApp.pipe(
    Effect.map((app) =>
      HttpServer.serve(app).pipe(Layer.provide(BunHttpServer.layer({ port }))),
    ),
  ),
);

BunRuntime.runMain(
  Layer.launch(serverLayer).pipe(
    Effect.provide(applicationLayer),
    Effect.provide(runtimeLoggingLayer),
  ) as Effect.Effect<
    never,
    RolesInfrastructureError | DrizzleInitializationError,
    never
  >,
);
