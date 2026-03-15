import 'dotenv/config';
import { HttpServer } from '@effect/platform';
import { BunHttpServer, BunRuntime } from '@effect/platform-bun';
import { Effect, Layer } from 'effect';
import { httpApp } from './http/app';
import { auditLayer } from './platform/audit';
import { betterAuthLayer } from './platform/better-auth';
import {
  TypeOrmDataSource,
  TypeOrmInitializationError,
  typeOrmLayer,
} from './platform/typeorm';
import { healthLayer } from './modules/health/layer';
import { rolesLayer } from './modules/roles/layer';
import { authLayer } from './modules/auth/layer';
import { usersLayer } from './modules/users/layer';
import { auditLogsLayer } from './modules/audit-logs/layer';
import { brandingLayer } from './modules/branding/layer';
import { locationsLayer } from './modules/locations/layer';
import { categoriesLayer } from './modules/categories/layer';
import { areasLayer } from './modules/areas/layer';
import { clientsLayer } from './modules/clients/layer';
import { suppliersLayer } from './modules/suppliers/layer';
import { productsLayer } from './modules/products/layer';
import { photosLayer } from './modules/photos/layer';
import { stockMovementsLayer } from './modules/stock-movements/layer';
import { inventoryLayer } from './modules/inventory/layer';
import { ordersLayer } from './modules/orders/layer';
import { RolesService } from './modules/roles/service';
import type { RolesInfrastructureError } from '../routes/roles/roles.errors';
import { BetterAuth } from './platform/better-auth';

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

const platformLayer = Layer.mergeAll(typeOrmLayer, betterAuthLayer);

const rolesApplicationLayer = rolesLayer.pipe(Layer.provide(platformLayer));
const authApplicationLayer = authLayer.pipe(
  Layer.provide(rolesApplicationLayer),
);
const usersApplicationLayer = usersLayer.pipe(
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

    yield* TypeOrmDataSource;
    const betterAuth = yield* BetterAuth;
    yield* Effect.tryPromise({
      try: async () => {
        const ctx = await betterAuth.auth.$context;
        await ctx.runMigrations();
      },
      catch: (cause) =>
        new TypeOrmInitializationError({
          message: 'Failed to run Better Auth migrations',
          cause,
        }),
    });
  }),
);

// Phase 2 layers
const auditLogsApplicationLayer = auditLogsLayer.pipe(Layer.provide(platformLayer));
const brandingApplicationLayer = brandingLayer.pipe(Layer.provide(platformLayer));
const locationsApplicationLayer = locationsLayer.pipe(Layer.provide(platformLayer));
const categoriesApplicationLayer = categoriesLayer.pipe(Layer.provide(platformLayer));
const areasApplicationLayer = areasLayer.pipe(
  Layer.provide(Layer.mergeAll(platformLayer, locationsApplicationLayer)),
);

// Phase 3 layers
const clientsApplicationLayer = clientsLayer.pipe(Layer.provide(platformLayer));
const suppliersApplicationLayer = suppliersLayer.pipe(Layer.provide(platformLayer));
const productsApplicationLayer = productsLayer.pipe(
  Layer.provide(Layer.mergeAll(platformLayer, categoriesApplicationLayer)),
);
const photosApplicationLayer = photosLayer.pipe(Layer.provide(platformLayer));

// Phase 4 layers
const stockMovementsApplicationLayer = stockMovementsLayer.pipe(
  Layer.provide(
    Layer.mergeAll(
      platformLayer,
      productsApplicationLayer,
      locationsApplicationLayer,
    ),
  ),
);
const inventoryApplicationLayer = inventoryLayer.pipe(
  Layer.provide(
    Layer.mergeAll(
      platformLayer,
      productsApplicationLayer,
      locationsApplicationLayer,
      areasApplicationLayer,
    ),
  ),
);
const ordersApplicationLayer = ordersLayer.pipe(
  Layer.provide(
    Layer.mergeAll(platformLayer, clientsApplicationLayer, productsApplicationLayer),
  ),
);

const applicationLayer = Layer.mergeAll(
  platformLayer,
  auditLayer,
  healthLayer,
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

const serverLayer = HttpServer.serve(httpApp).pipe(
  Layer.provide(BunHttpServer.layer({ port })),
);

BunRuntime.runMain(
  Layer.launch(serverLayer).pipe(
    Effect.provide(applicationLayer),
  ) as Effect.Effect<
    never,
    RolesInfrastructureError | TypeOrmInitializationError,
    never
  >,
);
