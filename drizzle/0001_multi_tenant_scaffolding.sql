CREATE TABLE IF NOT EXISTS "organization" (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  logo text,
  metadata text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_slug_unique
  ON "organization" (slug);

CREATE TABLE IF NOT EXISTS "member" (
  id text PRIMARY KEY,
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS member_user_organization_unique
  ON "member" (user_id, organization_id);
CREATE INDEX IF NOT EXISTS member_user_id_idx ON "member" (user_id);
CREATE INDEX IF NOT EXISTS member_organization_id_idx ON "member" (organization_id);

DO $$
BEGIN
  IF to_regclass('public.organization') IS NOT NULL THEN
    ALTER TABLE "organization"
      ALTER COLUMN id TYPE uuid USING id::uuid;
  END IF;

  IF to_regclass('public.member') IS NOT NULL THEN
    ALTER TABLE "member"
      ALTER COLUMN organization_id TYPE uuid USING organization_id::uuid,
      ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
  END IF;
END $$;

INSERT INTO "organization" (id, name, slug, logo, metadata, created_at)
VALUES ('00000000-0000-4000-8000-000000000001'::uuid, 'LibreStock', 'librestock', NULL, NULL, now())
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name,
  slug = excluded.slug;

DO $$
BEGIN
  IF to_regclass('public.user') IS NOT NULL THEN
    INSERT INTO "member" (id, organization_id, user_id, role, created_at)
    SELECT gen_random_uuid()::text, '00000000-0000-4000-8000-000000000001'::uuid, u.id::uuid, 'member', now()
    FROM "user" u
    ON CONFLICT (user_id, organization_id) DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'roles',
    'user_roles',
    'categories',
    'locations',
    'areas',
    'suppliers',
    'products',
    'supplier_products',
    'clients',
    'orders',
    'inventory',
    'stock_movements',
    'audit_logs',
    'branding_settings'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT %L',
        table_name,
        '00000000-0000-4000-8000-000000000001'
      );
      EXECUTE format(
        'UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL',
        table_name,
        '00000000-0000-4000-8000-000000000001'
      );
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT %L',
        table_name,
        '00000000-0000-4000-8000-000000000001'
      );
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL',
        table_name
      );
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public.session') IS NOT NULL THEN
    ALTER TABLE "session" ADD COLUMN IF NOT EXISTS active_organization_id text;
    UPDATE "session"
    SET active_organization_id = '00000000-0000-4000-8000-000000000001'
    WHERE active_organization_id IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.member') IS NOT NULL
     AND to_regclass('public.organization') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'member_organization_id_fk'
     ) THEN
    ALTER TABLE "member"
      ADD CONSTRAINT member_organization_id_fk
      FOREIGN KEY (organization_id)
      REFERENCES "organization"(id)
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.member') IS NOT NULL
     AND to_regclass('public.user') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'member_user_id_fk'
     ) THEN
    ALTER TABLE "member"
      ADD CONSTRAINT member_user_id_fk
      FOREIGN KEY (user_id)
      REFERENCES "user"(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.roles') IS NOT NULL THEN
    ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_unique;
    DROP INDEX IF EXISTS roles_name_unique;
    CREATE UNIQUE INDEX IF NOT EXISTS roles_tenant_name_unique
      ON roles (tenant_id, name);
    CREATE INDEX IF NOT EXISTS roles_tenant_id_idx ON roles (tenant_id);
  END IF;

  IF to_regclass('public.user_roles') IS NOT NULL THEN
    DROP INDEX IF EXISTS user_roles_user_role_unique;
    CREATE UNIQUE INDEX IF NOT EXISTS user_roles_tenant_user_role_unique
      ON user_roles (tenant_id, user_id, role_id);
    CREATE INDEX IF NOT EXISTS user_roles_tenant_user_id_idx
      ON user_roles (tenant_id, user_id);
  END IF;

  IF to_regclass('public.products') IS NOT NULL THEN
    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_unique;
    DROP INDEX IF EXISTS products_sku_unique;
    CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_sku_unique
      ON products (tenant_id, sku);
    CREATE INDEX IF NOT EXISTS products_tenant_id_idx ON products (tenant_id);
  END IF;

  IF to_regclass('public.clients') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS clients_tenant_id_idx ON clients (tenant_id);
  END IF;

  IF to_regclass('public.orders') IS NOT NULL THEN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_number_unique;
    DROP INDEX IF EXISTS orders_order_number_unique;
    CREATE UNIQUE INDEX IF NOT EXISTS orders_tenant_order_number_unique
      ON orders (tenant_id, order_number);
    CREATE INDEX IF NOT EXISTS orders_tenant_id_idx ON orders (tenant_id);
  END IF;

  IF to_regclass('public.inventory') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS inventory_tenant_id_idx ON inventory (tenant_id);
  END IF;

  IF to_regclass('public.stock_movements') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS stock_movements_tenant_id_idx
      ON stock_movements (tenant_id);
  END IF;

  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS audit_logs_tenant_id_idx ON audit_logs (tenant_id);
  END IF;
END $$;

DO $$
DECLARE
  existing_primary_key_name text;
BEGIN
  IF to_regclass('public.branding_settings') IS NOT NULL THEN
    SELECT con.conname
    INTO existing_primary_key_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'branding_settings'
      AND con.contype = 'p'
    LIMIT 1;

    IF existing_primary_key_name IS NOT NULL
       AND existing_primary_key_name <> 'branding_settings_tenant_id_id_pk' THEN
      EXECUTE format(
        'ALTER TABLE %I.%I DROP CONSTRAINT %I',
        'public',
        'branding_settings',
        existing_primary_key_name
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = 'branding_settings'
        AND con.conname = 'branding_settings_tenant_id_id_pk'
        AND con.contype = 'p'
    ) THEN
      ALTER TABLE branding_settings
        ADD CONSTRAINT branding_settings_tenant_id_id_pk PRIMARY KEY (tenant_id, id);
    END IF;
  END IF;
END $$;
