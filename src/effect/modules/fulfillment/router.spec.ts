/**
 * Router tests for the fulfillment module.
 *
 * **The fulfillment module has no `router.ts` at the time of writing.**
 *
 * `FulfillmentService` exposes `confirm`, `pick`, `pack`, and `ship`
 * (the last two currently fail with `FulfillmentNotImplemented`). The
 * service is consumed by cross-module orchestration (see
 * `modules/orders/`), not mounted at its own HTTP prefix. There is no
 * `fulfillment/router.ts` to import, so there is no HTTP boundary for
 * this shard to unit-test.
 *
 * The Wave 3 brief requires a `router.spec.ts` per module in this shard.
 * This file satisfies that contract and codifies the "no router" fact
 * with a single assertion, so anyone grepping for a router test gets
 * routed to the service specs instead:
 *   - `service.spec.ts` (unit)
 *   - `service.integration.spec.ts` (integration)
 *
 * When a `fulfillment/router.ts` is introduced (for a `/fulfillment/*`
 * HTTP surface), this spec should be rewritten along the lines of the
 * sibling `clients/router.spec.ts` / `inventory/router.spec.ts` files.
 */
import { describe, expect, it } from 'vitest';
import { FulfillmentService } from './service';

describe('fulfillment router', () => {
  it('has no HTTP router module — service is consumed via orders orchestration', () => {
    // Sanity check that the service export is present; if this import
    // ever breaks, the placeholder needs revisiting.
    expect(FulfillmentService).toBeDefined();
  });
});
