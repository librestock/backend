-- Composite unique indexes (roles_tenant_name_unique, products_tenant_sku_unique,
-- orders_tenant_order_number_unique) already cover tenant_id-only equality lookups
-- via leftmost-prefix scans, so the dedicated single-column indexes are pure
-- write amplification.
DROP INDEX IF EXISTS roles_tenant_id_idx;
DROP INDEX IF EXISTS products_tenant_id_idx;
DROP INDEX IF EXISTS orders_tenant_id_idx;
