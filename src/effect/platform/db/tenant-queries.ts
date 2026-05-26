import { and, eq, isNotNull } from 'drizzle-orm';
import type { DrizzleDb } from '../drizzle';
import { members, organizations, tenantDomains } from './schema';

export interface TenantRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

const tenantSelection = {
  id: organizations.id,
  name: organizations.name,
  slug: organizations.slug,
};

export const findTenantMembership = (
  db: DrizzleDb,
  userId: string,
  organizationId: string,
) =>
  db
    .select(tenantSelection)
    .from(organizations)
    .innerJoin(members, eq(members.organization_id, organizations.id))
    .where(
      and(eq(organizations.id, organizationId), eq(members.user_id, userId)),
    )
    .limit(1);

export const findTenantByHostname = (db: DrizzleDb, hostname: string) =>
  db
    .select(tenantSelection)
    .from(organizations)
    .innerJoin(tenantDomains, eq(tenantDomains.tenant_id, organizations.id))
    .where(
      and(
        eq(tenantDomains.hostname, hostname),
        isNotNull(tenantDomains.verified_at),
      ),
    )
    .limit(1);

export const findTenantBySlug = (db: DrizzleDb, slug: string) =>
  db
    .select(tenantSelection)
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

export const findSingleTenantMembership = (db: DrizzleDb, userId: string) =>
  db
    .select(tenantSelection)
    .from(organizations)
    .innerJoin(members, eq(members.organization_id, organizations.id))
    .where(eq(members.user_id, userId))
    .orderBy(organizations.created_at)
    .limit(2);
