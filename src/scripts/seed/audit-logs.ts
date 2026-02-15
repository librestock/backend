import { faker } from '@faker-js/faker';
import { AuditAction, AuditEntityType, OrderStatus } from '@librestock/types';
import { AuditLog } from '../../routes/audit-logs/entities/audit-log.entity';
import { Category } from '../../routes/categories/entities/category.entity';
import { Location } from '../../routes/locations/entities/location.entity';
import { Order } from '../../routes/orders/entities/order.entity';
import { Product } from '../../routes/products/entities/product.entity';
import { Supplier } from '../../routes/suppliers/entities/supplier.entity';
import { MOCK_USER_ID, SEED_CONFIG } from './config';
import { registry } from './registry';

registry.register({
  name: 'audit-logs',
  dependencies: ['products', 'categories', 'suppliers', 'orders', 'locations'],
  async run(ctx) {
    console.log('Seeding audit logs...');

    const products = ctx.store.get('products') as Product[];
    const categories = ctx.store.get('categories') as Category[];
    const suppliers = ctx.store.get('suppliers') as Supplier[];
    const orders = ctx.store.get('orders') as Order[];
    const locations = ctx.store.get('locations') as Location[];

    const auditRepo = ctx.dataSource.getRepository(AuditLog);
    const auditLogs: AuditLog[] = [];

    const entityPool: { type: AuditEntityType; id: string }[] = [
      ...products.map((p) => ({ type: AuditEntityType.PRODUCT, id: p.id })),
      ...categories.map((c) => ({ type: AuditEntityType.CATEGORY, id: c.id })),
      ...suppliers.map((s) => ({ type: AuditEntityType.SUPPLIER, id: s.id })),
      ...orders.map((o) => ({ type: AuditEntityType.ORDER, id: o.id })),
      ...locations.map((l) => ({ type: AuditEntityType.LOCATION, id: l.id })),
    ];

    for (let i = 0; i < SEED_CONFIG.auditLogs; i++) {
      const entity = faker.helpers.arrayElement(entityPool);

      const action = faker.helpers.weightedArrayElement([
        { value: AuditAction.CREATE, weight: 4 },
        { value: AuditAction.UPDATE, weight: 5 },
        { value: AuditAction.DELETE, weight: 1 },
        { value: AuditAction.STATUS_CHANGE, weight: 2 },
      ]);

      let changes: { before?: Record<string, unknown>; after?: Record<string, unknown> } | null = null;

      if (action === AuditAction.UPDATE) {
        if (entity.type === AuditEntityType.PRODUCT) {
          changes = {
            before: { standard_price: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }) },
            after: { standard_price: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }) },
          };
        } else if (entity.type === AuditEntityType.ORDER) {
          const oldStatus = faker.helpers.arrayElement(Object.values(OrderStatus));
          changes = {
            before: { status: oldStatus },
            after: { status: faker.helpers.arrayElement(Object.values(OrderStatus).filter((s) => s !== oldStatus)) },
          };
        } else {
          changes = {
            before: { name: faker.commerce.productName() },
            after: { name: faker.commerce.productName() },
          };
        }
      } else if (action === AuditAction.CREATE) {
        changes = { after: { name: faker.commerce.productName() } };
      }

      const log = auditRepo.create({
        user_id: MOCK_USER_ID,
        action,
        entity_type: entity.type,
        entity_id: entity.id,
        changes,
        ip_address: faker.internet.ipv4(),
        user_agent: faker.helpers.arrayElement([
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        ]),
      });

      const saved = await auditRepo.save(log);
      auditLogs.push(saved);
    }

    console.log(`  Created ${auditLogs.length} audit logs\n`);
    ctx.store.set('audit-logs', auditLogs);
  },
});
