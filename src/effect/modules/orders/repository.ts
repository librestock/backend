import { Effect } from 'effect';
import type { Schema } from 'effect';
import { eq, and, ilike, or, gte, lte, desc, sql, type SQL } from 'drizzle-orm';
import { type OrderQuerySchema } from '@librestock/types/orders';
import {
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
} from '../../platform/drizzle-query.utils';
import { DrizzleDatabase } from '../../platform/drizzle';
import {
  orders,
  orderItems,
  clients,
  products,
} from '../../platform/db/schema';
import { OrdersInfrastructureError } from './orders.errors';

type OrderQueryDto = Schema.Schema.Type<typeof OrderQuerySchema>;

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new OrdersInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

export class OrdersRepository extends Effect.Service<OrdersRepository>()(
  '@librestock/effect/OrdersRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const findAllPaginated = (query: OrderQueryDto) =>
        tryAsync('list orders paginated', async () => {
          const { page, limit, skip } = resolvePaginationWindow(
            query.page,
            query.limit,
          );

          const conditions: SQL[] = [];
          if (query.client_id) {
            conditions.push(eq(orders.client_id, query.client_id));
          }
          if (query.status) {
            conditions.push(eq(orders.status, query.status));
          }
          if (query.date_from) {
            conditions.push(gte(orders.created_at, new Date(query.date_from)));
          }
          if (query.date_to) {
            conditions.push(lte(orders.created_at, new Date(query.date_to)));
          }
          if (query.q) {
            conditions.push(
              or(
                ilike(orders.order_number, `%${query.q}%`),
                ilike(clients.company_name, `%${query.q}%`),
              )!,
            );
          }

          const where = conditions.length > 0 ? and(...conditions) : undefined;

          // Count query — join clients only if q filter needs it
          const distinctCount = sql<number>`count(DISTINCT ${orders.id})::int`;
          const totalCount = sql<number>`count(*)::int`;
          const countQuery = query.q
            ? db
                .select({ count: distinctCount })
                .from(orders)
                .leftJoin(clients, eq(orders.client_id, clients.id))
                .where(where)
            : db.select({ count: totalCount }).from(orders).where(where);

          const [countResult] = await countQuery;
          const total = countResult?.count ?? 0;

          // Data query with relations
          const orderRows = await db
            .select()
            .from(orders)
            .leftJoin(clients, eq(orders.client_id, clients.id))
            .where(where)
            .orderBy(desc(orders.created_at))
            .offset(skip)
            .limit(limit);

          const orderIds = orderRows.map((r) => r.orders.id);
          const itemsByOrderId: Record<
            string,
            (typeof orderItems.$inferSelect)[]
          > = {};
          if (orderIds.length > 0) {
            const allItems = await db
              .select()
              .from(orderItems)
              .where(sql`${orderItems.order_id} IN ${orderIds}`);
            for (const item of allItems) {
              (itemsByOrderId[item.order_id] ??= []).push(item);
            }
          }

          const data = orderRows.map((r) => ({
            ...r.orders,
            client: r.clients,
            items: itemsByOrderId[r.orders.id] ?? [],
          }));

          return toRepositoryPaginatedResult(data, total, page, limit);
        });

      const findById = (id: string) =>
        tryAsync('find order by id', async () => {
          const rows = await db
            .select()
            .from(orders)
            .leftJoin(clients, eq(orders.client_id, clients.id))
            .where(eq(orders.id, id))
            .limit(1);

          if (!rows[0]) return null;

          const items = await db
            .select({
              item: orderItems,
              product: products,
            })
            .from(orderItems)
            .leftJoin(products, eq(orderItems.product_id, products.id))
            .where(eq(orderItems.order_id, id));

          return {
            ...rows[0].orders,
            client: rows[0].clients,
            items: items.map((i) => ({ ...i.item, product: i.product })),
          };
        });

      const create = (data: typeof orders.$inferInsert) =>
        tryAsync('create order', async () => {
          const rows = await db.insert(orders).values(data).returning();
          return rows[0]!;
        });

      const update = (id: string, data: Partial<typeof orders.$inferInsert>) =>
        tryAsync('update order', async () => {
          const rows = await db
            .update(orders)
            .set({ ...data, updated_at: new Date() })
            .where(eq(orders.id, id))
            .returning({ id: orders.id });
          return rows.length;
        });

      const remove = (id: string) =>
        tryAsync('delete order', () =>
          db.delete(orders).where(eq(orders.id, id)),
        );

      const getNextOrderNumberSequence = () =>
        tryAsync('get next order number', async () => {
          const result = await db.execute(
            sql`SELECT nextval('order_number_seq')::bigint AS value`,
          );
          const rows =
            (result as unknown as { rows: { value: unknown }[] }).rows ??
            (result as unknown as { value: unknown }[]);
          return Number(rows[0]?.value);
        });

      const existsById = (id: string) =>
        tryAsync('check order existence', async () => {
          const rows = await db
            .select({ id: orders.id })
            .from(orders)
            .where(eq(orders.id, id))
            .limit(1);
          return rows.length > 0;
        });

      return {
        findAllPaginated,
        findById,
        create,
        update,
        delete: remove,
        getNextOrderNumberSequence,
        existsById,
      };
    }),
  },
) {}

export class OrderItemsRepository extends Effect.Service<OrderItemsRepository>()(
  '@librestock/effect/OrderItemsRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const findByIds = (ids: string[]) =>
        tryAsync('find order items by ids', async () => {
          const rows = await db
            .select()
            .from(orderItems)
            .where(sql`${orderItems.id} IN ${ids}`)
            .limit(ids.length);

          if (!rows[0]) return null;

          return rows;
        });

      const findByOrderId = (orderId: string) =>
        tryAsync('find order items by order id', async () => {
          const items = await db
            .select({
              item: orderItems,
              product: products,
            })
            .from(orderItems)
            .leftJoin(products, eq(orderItems.product_id, products.id))
            .where(eq(orderItems.order_id, orderId));

          return items.map((i) => ({ ...i.item, product: i.product }));
        });

      const createMany = (items: (typeof orderItems.$inferInsert)[]) =>
        tryAsync('create order items', () =>
          db.insert(orderItems).values(items).returning(),
        );

      const incrementPicked = (orderItemId: string, quantity: number) =>
        tryAsync('increment order item quantity_picked', async () => {
          const rows = await db
            .update(orderItems)
            .set({
              quantity_picked: sql`${orderItems.quantity_picked} + ${quantity}`,
              updated_at: new Date(),
            })
            .where(
              and(
                eq(orderItems.id, orderItemId),
                sql`${orderItems.quantity_picked} + ${quantity} <= ${orderItems.quantity}`,
              ),
            )
            .returning({ id: orderItems.id });
          return rows.length;
        });

      const deleteByOrderId = (orderId: string) =>
        tryAsync('delete order items by order id', () =>
          db.delete(orderItems).where(eq(orderItems.order_id, orderId)),
        );

      return {
        findByIds,
        findByOrderId,
        createMany,
        incrementPicked,
        deleteByOrderId,
      };
    }),
  },
) {}
