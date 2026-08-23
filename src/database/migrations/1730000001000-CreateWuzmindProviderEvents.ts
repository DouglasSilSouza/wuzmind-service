import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWuzmindProviderEvents1730000001000 implements MigrationInterface {
  name = 'CreateWuzmindProviderEvents1730000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wuzmind_provider_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "correlation_id" character varying(100),
        "operation" character varying(50) NOT NULL,
        "provider" character varying(50) NOT NULL,
        "model" character varying(100),
        "status" character varying(30) NOT NULL,
        "duration_ms" integer NOT NULL,
        "error_code" character varying(100),
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wuzmind_provider_events_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_wuzmind_provider_events_corr" ON "wuzmind_provider_events" ("correlation_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wuzmind_provider_events_corr";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wuzmind_provider_events";`);
  }
}
