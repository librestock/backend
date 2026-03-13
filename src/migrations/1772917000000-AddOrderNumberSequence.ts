import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddOrderNumberSequence1772917000000 implements MigrationInterface {
  name = 'AddOrderNumberSequence1772917000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1 INCREMENT BY 1',
    );

    await queryRunner.query(`
      DO $$
      DECLARE max_suffix bigint;
      BEGIN
        SELECT COALESCE(MAX(((regexp_match(order_number, '([0-9]+)$'))[1])::bigint), 0)
          INTO max_suffix
          FROM orders;

        IF max_suffix < 1 THEN
          PERFORM setval('order_number_seq', 1, false);
        ELSE
          PERFORM setval('order_number_seq', max_suffix, true);
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP SEQUENCE IF EXISTS order_number_seq');
  }
}
