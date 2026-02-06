import { type Routes } from '@nestjs/core';
import { AuthModule } from './routes/auth/auth.module';
import { CategoriesModule } from './routes/categories/categories.module';
import { HealthModule } from './routes/health/health.module';
import { ProductsModule } from './routes/products/products.module';
import { LocationsModule } from './routes/locations/locations.module';
import { AreasModule } from './routes/areas/areas.module';
import { InventoryModule } from './routes/inventory/inventory.module';
import { AuditLogsModule } from './routes/audit-logs/audit-logs.module';
import { BrandingModule } from './routes/branding/branding.module';
import { UsersModule } from './routes/users/users.module';
import { ClientsModule } from './routes/clients/clients.module';
import { StockMovementsModule } from './routes/stock-movements/stock-movements.module';
import { OrdersModule } from './routes/orders/orders.module';

/**
 * Application routes configuration
 * Centralizes all route-to-module mappings for the application
 * Routes are combined with the global prefix /api/v1 (except those excluded in main.ts)
 */
export const routes: Routes = [
  {
    path: '',
    module: HealthModule,
  },
  {
    path: 'auth',
    module: AuthModule,
  },
  {
    path: 'categories',
    module: CategoriesModule,
  },
  {
    path: 'products',
    module: ProductsModule,
  },
  {
    path: 'locations',
    module: LocationsModule,
  },
  {
    path: 'areas',
    module: AreasModule,
  },
  {
    path: 'inventory',
    module: InventoryModule,
  },
  {
    path: 'audit-logs',
    module: AuditLogsModule,
  },
  {
    path: 'branding',
    module: BrandingModule,
  },
  {
    path: 'users',
    module: UsersModule,
  },
  {
    path: 'clients',
    module: ClientsModule,
  },
  {
    path: 'stock-movements',
    module: StockMovementsModule,
  },
  {
    path: 'orders',
    module: OrdersModule,
  },
];
