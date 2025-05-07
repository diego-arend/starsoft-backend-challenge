import { MigrationInterface, QueryRunner } from "typeorm";

export class ReconciliationRecordElasticsearch1746644024424 implements MigrationInterface {
    name = 'ReconciliationRecordElasticsearch1746644024424'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."order_reconciliation_operationtype_enum" AS ENUM('INDEX', 'UPDATE', 'DELETE')`);
        await queryRunner.query(`CREATE TYPE "public"."order_reconciliation_status_enum" AS ENUM('PENDING', 'PROCESSED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "order_reconciliation" ("id" SERIAL NOT NULL, "orderUuid" uuid NOT NULL, "operationType" "public"."order_reconciliation_operationtype_enum" NOT NULL, "status" "public"."order_reconciliation_status_enum" NOT NULL DEFAULT 'PENDING', "errorMessage" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b508315a9bfcceccc6c5210a920" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_edfd102bfa350dd9a8d54a99b7" ON "order_reconciliation" ("orderUuid") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_edfd102bfa350dd9a8d54a99b7"`);
        await queryRunner.query(`DROP TABLE "order_reconciliation"`);
        await queryRunner.query(`DROP TYPE "public"."order_reconciliation_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."order_reconciliation_operationtype_enum"`);
    }

}
