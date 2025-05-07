import { MigrationInterface, QueryRunner } from "typeorm";

export class Order1746572445007 implements MigrationInterface {
    name = 'Order1746572445007'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "order_items" ("id" SERIAL NOT NULL, "uuid" character varying NOT NULL, "productId" character varying NOT NULL, "productName" character varying NOT NULL, "price" integer NOT NULL, "quantity" integer NOT NULL, "subtotal" integer NOT NULL, "order_id" integer NOT NULL, CONSTRAINT "UQ_66de9f73b0054b185580ba2ca5c" UNIQUE ("uuid"), CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'processing', 'shipped', 'delivered', 'canceled')`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" SERIAL NOT NULL, "uuid" character varying NOT NULL, "customerId" character varying NOT NULL, "status" "public"."orders_status_enum" NOT NULL DEFAULT 'pending', "total" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_04a64e7c04376e27182f8c0fa17" UNIQUE ("uuid"), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_145532db85752b29c57d2b7b1f1"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`DROP TABLE "order_items"`);
    }

}
