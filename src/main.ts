import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { AppModule } from './app.module';
import { auth } from './auth';
import { Client } from './routes/clients/entities/client.entity';
import { HateoasInterceptor } from './common/hateoas';
import { AuditLog } from './routes/audit-logs/entities/audit-log.entity';
import { Category } from './routes/categories/entities/category.entity';
import { Inventory } from './routes/inventory/entities/inventory.entity';
import { Location } from './routes/locations/entities/location.entity';
import { OrderItem } from './routes/orders/entities/order-item.entity';
import { Order } from './routes/orders/entities/order.entity';
import { Photo } from './routes/photos/entities/photo.entity';
import { StockMovement } from './routes/stock-movements/entities/stock-movement.entity';
import { SupplierProduct } from './routes/suppliers/entities/supplier-product.entity';
import { Supplier } from './routes/suppliers/entities/supplier.entity';

const VALID_NODE_ENVS = ['development', 'staging', 'production'];

async function bootstrap() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (!VALID_NODE_ENVS.includes(nodeEnv)) {
    throw new Error(
      `Invalid NODE_ENV="${nodeEnv}". Must be one of: ${VALID_NODE_ENVS.join(', ')}`,
    );
  }
  process.env.NODE_ENV = nodeEnv;
  const isProduction = nodeEnv === 'production';

  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
  }));

  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  if (isProduction && (!corsOrigin || corsOrigin === '*')) {
    throw new Error(
      'CORS_ORIGIN must be set to a specific origin in production (not "*" or empty)',
    );
  }
  app.enableCors({
    origin: corsOrigin ?? false,
    credentials: true,
  });

  // Mount Better Auth handler before body parsing — it handles its own parsing
  // and needs the raw request body. NestJS middleware forRoutes() doesn't apply
  // to paths without registered controllers, so we mount it at the Express level.
  app.use('/api/auth', toNodeHandler(auth));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Set global prefix for all routes
  app.setGlobalPrefix('api/v1', {
    exclude: ['health-check', 'api/auth/(.*)'], // Exclude health check and auth from prefix
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new HateoasInterceptor(app.get(Reflector)));

  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('LibreStock Inventory API')
      .setDescription('REST API for LibreStock Inventory Management System')
      .setVersion('1.0.0')
      .setContact('API Support', '', '')
      .setLicense('MIT', '')
      .addServer('http://localhost:8080', 'Development Server')
      .addServer('https://api.librestock.com', 'Production Server')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Better Auth token',
        },
        'BearerAuth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      extraModels: [
        AuditLog,
        Category,
        Client,
        Inventory,
        Location,
        Order,
        OrderItem,
        Photo,
        StockMovement,
        Supplier,
        SupplierProduct,
      ],
    });
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger UI enabled at /api/docs');
  }

  // Run Better Auth migrations in non-production, or when explicitly requested via env flag
  if (!isProduction || process.env.RUN_BETTER_AUTH_MIGRATIONS === 'true') {
    const ctx = await auth.$context;
    await ctx.runMigrations();
  }

  await app.listen(process.env.PORT ?? 8080);
}
void bootstrap();
