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
import { PermissionProvider } from './platform/permission-provider';
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
import { TracingLive } from './platform/tracing';

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
const withPlatform = <A, E, R>(layer: Layer.Layer<A, E, R>) =>
  layer.pipe(Layer.provide(platformLayer));

const rolesApplicationLayer = withPlatform(RolesService.Default);
const permissionProviderLayer = Layer.effect(
  PermissionProvider,
  Effect.map(RolesService, ({ getPermissionsForUser }) => ({ getPermissionsForUser })),
).pipe(Layer.provide(rolesApplicationLayer));
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

const foundationalServicesLayer = Layer.mergeAll(
  withPlatform(HealthService.Default),
  withPlatform(AuditLogsService.Default),
  withPlatform(BrandingService.Default),
  withPlatform(LocationsService.Default),
  withPlatform(CategoriesService.Default),
  withPlatform(ClientsService.Default),
  withPlatform(SuppliersService.Default),
  withPlatform(PhotosService.Default),
);

const locationsApplicationLayer = withPlatform(LocationsService.Default);
const categoriesApplicationLayer = withPlatform(CategoriesService.Default);
const areasApplicationLayer = AreasService.Default.pipe(
  Layer.provide(Layer.mergeAll(platformLayer, locationsApplicationLayer)),
);
const clientsApplicationLayer = withPlatform(ClientsService.Default);
const productsApplicationLayer = ProductsService.Default.pipe(
  Layer.provide(Layer.mergeAll(platformLayer, categoriesApplicationLayer)),
);
const workflowServicesLayer = Layer.mergeAll(
  StockMovementsService.Default.pipe(
    Layer.provide(
      Layer.mergeAll(
        platformLayer,
        productsApplicationLayer,
        locationsApplicationLayer,
      ),
    ),
  ),
  InventoryService.Default.pipe(
    Layer.provide(
      Layer.mergeAll(
        platformLayer,
        productsApplicationLayer,
        locationsApplicationLayer,
        areasApplicationLayer,
      ),
    ),
  ),
  OrdersService.Default.pipe(
    Layer.provide(
      Layer.mergeAll(
        platformLayer,
        clientsApplicationLayer,
        productsApplicationLayer,
      ),
    ),
  ),
);

const startupLayer = Layer.mergeAll(
  auditLayer.pipe(Layer.provide(platformLayer)),
  rolesSeedLayer,
  betterAuthMigrationLayer,
);

const applicationLayer = Layer.mergeAll(
  platformLayer,
  TracingLive,
  startupLayer,
  foundationalServicesLayer,
  rolesApplicationLayer,
  permissionProviderLayer,
  authApplicationLayer,
  usersApplicationLayer,
  areasApplicationLayer,
  productsApplicationLayer,
  workflowServicesLayer,
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
