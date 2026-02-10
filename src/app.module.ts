import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, RouterModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { AuthModule as AuthRoutesModule } from './routes/auth/auth.module';
import { CategoriesModule } from './routes/categories/categories.module';
import { ProductsModule } from './routes/products/products.module';
import { LocationsModule } from './routes/locations/locations.module';
import { AreasModule } from './routes/areas/areas.module';
import { InventoryModule } from './routes/inventory/inventory.module';
import { AuditLogsModule } from './routes/audit-logs/audit-logs.module';
import { BrandingModule } from './routes/branding/branding.module';
import { RolesModule } from './routes/roles/roles.module';
import { UsersModule } from './routes/users/users.module';
import { ClientsModule } from './routes/clients/clients.module';
import { StockMovementsModule } from './routes/stock-movements/stock-movements.module';
import { OrdersModule } from './routes/orders/orders.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransactionInterceptor } from './common/interceptors/transaction.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import databaseConfig from './config/database.config';
import { HealthModule } from './routes/health/health.module';
import { routes } from './app.routes';
import { auth } from './auth';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        if (!dbConfig) {
          throw new Error('Database configuration not found');
        }
        return dbConfig;
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute (global default)
      },
    ]),
    BetterAuthModule.forRoot({
      auth,
      disableGlobalAuthGuard: false,
    }),
    HealthModule,
    AuthRoutesModule,
    CategoriesModule,
    ProductsModule,
    LocationsModule,
    AreasModule,
    InventoryModule,
    AuditLogsModule,
    BrandingModule,
    RolesModule,
    UsersModule,
    ClientsModule,
    StockMovementsModule,
    OrdersModule,
    RouterModule.register(routes),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransactionInterceptor,
    },
    // APP_FILTER providers run in reverse registration order:
    // ThrottlerExceptionFilter runs first, GlobalExceptionFilter is the fallback.
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ThrottlerExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
