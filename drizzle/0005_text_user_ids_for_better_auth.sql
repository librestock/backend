DO $$
BEGIN
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    DROP INDEX IF EXISTS user_roles_tenant_user_role_unique;
    DROP INDEX IF EXISTS user_roles_user_id_idx;
    DROP INDEX IF EXISTS user_roles_tenant_user_id_idx;

    ALTER TABLE user_roles
      ALTER COLUMN user_id TYPE text USING user_id::text;

    CREATE UNIQUE INDEX IF NOT EXISTS user_roles_tenant_user_role_unique
      ON user_roles (tenant_id, user_id, role_id);
    CREATE INDEX IF NOT EXISTS user_roles_user_id_idx
      ON user_roles (user_id);
    CREATE INDEX IF NOT EXISTS user_roles_tenant_user_id_idx
      ON user_roles (tenant_id, user_id);
  END IF;

  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    DROP INDEX IF EXISTS audit_logs_user_id_idx;

    ALTER TABLE audit_logs
      ALTER COLUMN user_id TYPE text USING user_id::text;

    CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx
      ON audit_logs (user_id);
  END IF;
END $$;
