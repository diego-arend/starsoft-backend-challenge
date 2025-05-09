import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrderItemOrderUuid1746725291167 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD COLUMN "order_uuid" VARCHAR`,
    );

    const orphanedItems = await queryRunner.query(`
      SELECT COUNT(*) FROM "order_items" WHERE "order_id" IS NULL
    `);

    if (parseInt(orphanedItems[0].count) > 0) {
      await queryRunner.query(
        `DELETE FROM "order_items" WHERE "order_id" IS NULL`,
      );
    }

    await queryRunner.query(`
      UPDATE "order_items" oi
      SET "order_uuid" = (
        SELECT "uuid" FROM "orders" o WHERE o.id = oi.order_id
      )
      WHERE oi."order_id" IS NOT NULL
    `);

    const nullUuids = await queryRunner.query(`
      SELECT COUNT(*) FROM "order_items" WHERE "order_uuid" IS NULL
    `);

    if (parseInt(nullUuids[0].count) > 0) {
      throw new Error(
        `Ainda existem ${nullUuids[0].count} registros com order_uuid NULL. A migração não pode continuar.`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE "order_items" ALTER COLUMN "order_uuid" SET NOT NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE "order_items" 
      ADD CONSTRAINT "FK_order_items_orders_uuid" 
      FOREIGN KEY ("order_uuid") 
      REFERENCES "orders"("uuid") 
      ON DELETE CASCADE
    `);

    try {
      await queryRunner.query(
        `ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "FK_order_items_order_id"`,
      );
    } catch (e) {
      await queryRunner.query(
        `ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "FK_order_items_orders_id"`,
      );
    }

    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "order_id"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD COLUMN "order_id" INTEGER`,
    );

    await queryRunner.query(`
      UPDATE "order_items" oi
      SET "order_id" = (
        SELECT "id" FROM "orders" o WHERE o.uuid = oi.order_uuid
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "order_items" ALTER COLUMN "order_id" SET NOT NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE "order_items" 
      ADD CONSTRAINT "FK_order_items_order_id" 
      FOREIGN KEY ("order_id") 
      REFERENCES "orders"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_orders_uuid"`,
    );

    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "order_uuid"`,
    );
  }
}
