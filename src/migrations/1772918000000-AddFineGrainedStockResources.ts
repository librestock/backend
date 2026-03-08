import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFineGrainedStockResources1772918000000
implements MigrationInterface {
    name = 'AddFineGrainedStockResources1772918000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          INSERT INTO "role_permissions" ("role_id", "resource", "permission")
          SELECT rp."role_id", target."resource", rp."permission"
          FROM "role_permissions" rp
          CROSS JOIN (
            VALUES
              ('orders'),
              ('clients'),
              ('suppliers'),
              ('stockMovements')
          ) AS target("resource")
          WHERE rp."resource" = 'stock'
          ON CONFLICT ("role_id", "resource", "permission") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          DELETE FROM "role_permissions" target
          USING "role_permissions" stock
          WHERE stock."resource" = 'stock'
            AND target."role_id" = stock."role_id"
            AND target."permission" = stock."permission"
            AND target."resource" IN ('orders', 'clients', 'suppliers', 'stockMovements')
        `);
    }

}
