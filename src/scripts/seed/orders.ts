import { faker } from '@faker-js/faker';
import { ClientStatus } from '@librestock/types/clients'
import { OrderStatus } from '@librestock/types/orders'
import { type Client } from '../../routes/clients/entities/client.entity';
import { OrderItem } from '../../routes/orders/entities/order-item.entity';
import { Order } from '../../routes/orders/entities/order.entity';
import { type Product } from '../../routes/products/entities/product.entity';
import { MOCK_USER_ID, SEED_CONFIG } from './config';
import { registry } from './registry';

registry.register({
  name: 'orders',
  dependencies: ['clients', 'products'],
  async run(ctx) {
    console.log('Seeding orders...');

    const clients = ctx.store.get('clients') as Client[];
    const products = ctx.store.get('products') as Product[];

    const orderRepo = ctx.dataSource.getRepository(Order);
    const orderItemRepo = ctx.dataSource.getRepository(OrderItem);
    const orders: Order[] = [];
    const allOrderItems: OrderItem[] = [];

    const activeClients = clients.filter((c) => c.account_status === ClientStatus.ACTIVE);

    for (let i = 0; i < SEED_CONFIG.orders; i++) {
      const client = faker.helpers.arrayElement(activeClients);
      const orderDate = faker.date.recent({ days: 60 });

      const status = faker.helpers.weightedArrayElement([
        { value: OrderStatus.DRAFT, weight: 2 },
        { value: OrderStatus.CONFIRMED, weight: 3 },
        { value: OrderStatus.SOURCING, weight: 2 },
        { value: OrderStatus.PICKING, weight: 2 },
        { value: OrderStatus.PACKED, weight: 2 },
        { value: OrderStatus.SHIPPED, weight: 3 },
        { value: OrderStatus.DELIVERED, weight: 4 },
        { value: OrderStatus.CANCELLED, weight: 1 },
        { value: OrderStatus.ON_HOLD, weight: 1 },
      ]);

      const confirmedAt =
        status !== OrderStatus.DRAFT && status !== OrderStatus.CANCELLED
          ? new Date(orderDate.getTime() + faker.number.int({ min: 3600000, max: 86400000 }))
          : null;
      const shippedAt =
        status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED
          ? new Date((confirmedAt ?? orderDate).getTime() + faker.number.int({ min: 86400000, max: 604800000 }))
          : null;
      const deliveredAt =
        status === OrderStatus.DELIVERED && shippedAt
          ? new Date(shippedAt.getTime() + faker.number.int({ min: 3600000, max: 259200000 }))
          : null;

      const orderNumber = `ORD-${(orderDate.getFullYear() % 100).toString().padStart(2, '0')}${(orderDate.getMonth() + 1).toString().padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`;

      const order = orderRepo.create({
        order_number: orderNumber,
        client_id: client.id,
        status,
        delivery_deadline: faker.helpers.maybe(
          () => faker.date.soon({ days: 14, refDate: orderDate }),
          { probability: 0.7 },
        ),
        delivery_address:
          client.default_delivery_address ??
          `Marina Berth ${faker.number.int({ min: 1, max: 200 })}, ${faker.location.city()}`,
        yacht_name: client.yacht_name,
        special_instructions: faker.helpers.maybe(
          () => faker.helpers.arrayElement([
            'Deliver before 10 AM',
            'Contact captain before delivery',
            'Fragile items - handle with care',
            'Refrigerated items - keep cold chain',
            'Leave at dock security if no one aboard',
            faker.lorem.sentence(),
          ]),
          { probability: 0.4 },
        ),
        total_amount: 0,
        assigned_to: faker.helpers.maybe(() => MOCK_USER_ID, { probability: 0.6 }),
        created_by: MOCK_USER_ID,
        confirmed_at: confirmedAt,
        shipped_at: shippedAt,
        delivered_at: deliveredAt,
      });

      const savedOrder = await orderRepo.save(order);

      const itemCount = faker.number.int({ min: SEED_CONFIG.itemsPerOrder.min, max: SEED_CONFIG.itemsPerOrder.max });
      let totalAmount = 0;
      const usedProductIds = new Set<string>();

      for (let j = 0; j < itemCount; j++) {
        let product: Product;
        let attempts = 0;
        do {
          product = faker.helpers.arrayElement(products);
          attempts++;
        } while (usedProductIds.has(product.id) && attempts < 20);

        if (usedProductIds.has(product.id)) continue;
        usedProductIds.add(product.id);

        const quantity = faker.number.int({ min: 1, max: 20 });
        const unitPrice = product.standard_price ?? product.standard_cost ?? 50;
        const subtotal = Number.parseFloat((quantity * unitPrice).toFixed(2));
        totalAmount += subtotal;

        let quantityPicked = 0;
        let quantityPacked = 0;
        if ([OrderStatus.PICKING, OrderStatus.PACKED, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(status)) {
          quantityPicked = status === OrderStatus.PICKING ? faker.number.int({ min: 0, max: quantity }) : quantity;
        }
        if ([OrderStatus.PACKED, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(status)) {
          quantityPacked = quantity;
        }

        const orderItem = orderItemRepo.create({
          order_id: savedOrder.id,
          product_id: product.id,
          quantity,
          unit_price: unitPrice,
          subtotal,
          notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 }),
          quantity_picked: quantityPicked,
          quantity_packed: quantityPacked,
        });

        const savedItem = await orderItemRepo.save(orderItem);
        allOrderItems.push(savedItem);
      }

      savedOrder.total_amount = Number.parseFloat(totalAmount.toFixed(2));
      await orderRepo.save(savedOrder);
      orders.push(savedOrder);
    }

    console.log(`  Created ${orders.length} orders with ${allOrderItems.length} line items\n`);
    ctx.store.set('orders', orders);
    ctx.store.set('order-items', allOrderItems);
  },
});
