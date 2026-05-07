-- Aligns Better Auth-managed tables with the snake_case convention used by
-- the rest of the codebase. Safe on a fresh DB (no-op via IF EXISTS) and
-- safe on environments where Better Auth has already provisioned the
-- camelCase columns (renames in place).
--
-- Pair with the field-name overrides in src/auth.ts. Apply this migration
-- BEFORE the next process start, otherwise Better Auth's runMigrations may
-- attempt to create duplicate snake_case columns alongside the existing
-- camelCase ones.

DO $$
DECLARE
  rename RECORD;
BEGIN
  FOR rename IN
    SELECT * FROM (VALUES
      -- core auth tables
      ('user',         'emailVerified',          'email_verified'),
      ('user',         'createdAt',              'created_at'),
      ('user',         'updatedAt',              'updated_at'),
      ('user',         'banReason',              'ban_reason'),
      ('user',         'banExpires',             'ban_expires'),
      ('session',      'userId',                 'user_id'),
      ('session',      'expiresAt',              'expires_at'),
      ('session',      'createdAt',              'created_at'),
      ('session',      'updatedAt',              'updated_at'),
      ('session',      'ipAddress',              'ip_address'),
      ('session',      'userAgent',              'user_agent'),
      ('session',      'impersonatedBy',         'impersonated_by'),
      ('session',      'activeOrganizationId',   'active_organization_id'),
      ('account',      'userId',                 'user_id'),
      ('account',      'accountId',              'account_id'),
      ('account',      'providerId',             'provider_id'),
      ('account',      'accessToken',            'access_token'),
      ('account',      'refreshToken',           'refresh_token'),
      ('account',      'idToken',                'id_token'),
      ('account',      'accessTokenExpiresAt',   'access_token_expires_at'),
      ('account',      'refreshTokenExpiresAt',  'refresh_token_expires_at'),
      ('account',      'createdAt',              'created_at'),
      ('account',      'updatedAt',              'updated_at'),
      ('verification', 'expiresAt',              'expires_at'),
      ('verification', 'createdAt',              'created_at'),
      ('verification', 'updatedAt',              'updated_at'),
      -- organization plugin tables
      ('organization', 'createdAt',              'created_at'),
      ('member',       'organizationId',         'organization_id'),
      ('member',       'userId',                 'user_id'),
      ('member',       'createdAt',              'created_at'),
      ('invitation',   'organizationId',         'organization_id'),
      ('invitation',   'inviterId',              'inviter_id'),
      ('invitation',   'expiresAt',              'expires_at'),
      ('invitation',   'createdAt',              'created_at')
    ) AS t(table_name, old_col, new_col)
  LOOP
    IF to_regclass('public.' || quote_ident(rename.table_name)) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = rename.table_name
           AND column_name = rename.old_col
       )
       AND NOT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = rename.table_name
           AND column_name = rename.new_col
       )
    THEN
      EXECUTE format(
        'ALTER TABLE %I RENAME COLUMN %I TO %I',
        rename.table_name, rename.old_col, rename.new_col
      );
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public.user') IS NOT NULL THEN
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS email_verified boolean;
    UPDATE "user" SET email_verified = false WHERE email_verified IS NULL;
    ALTER TABLE "user" ALTER COLUMN email_verified SET DEFAULT false;
    ALTER TABLE "user" ALTER COLUMN email_verified SET NOT NULL;

    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    UPDATE "user" SET created_at = now() WHERE created_at IS NULL;
    ALTER TABLE "user" ALTER COLUMN created_at SET DEFAULT now();
    ALTER TABLE "user" ALTER COLUMN created_at SET NOT NULL;

    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
    UPDATE "user" SET updated_at = created_at WHERE updated_at IS NULL;
    ALTER TABLE "user" ALTER COLUMN updated_at SET DEFAULT now();
    ALTER TABLE "user" ALTER COLUMN updated_at SET NOT NULL;
  END IF;
END $$;
