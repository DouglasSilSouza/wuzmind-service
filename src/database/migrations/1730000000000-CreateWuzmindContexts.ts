import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWuzmindContexts1730000000000 implements MigrationInterface {
  name = 'CreateWuzmindContexts1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wuzmind_contexts" (
        "id" SERIAL NOT NULL,
        "phone" character varying(30) NOT NULL,
        "current_state" character varying(100),
        "last_intent" character varying(100),
        "last_typebot_group" character varying(100),
        "waiting_for" character varying(100),
        "last_bank" character varying(100),
        "last_month" character varying(30),
        "last_flow" character varying(100),
        "session_status" character varying(30) NOT NULL DEFAULT 'ACTIVE',
        "context_data" jsonb NOT NULL DEFAULT '{}',
        "last_activity_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wuzmind_contexts_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_wuzmind_contexts_phone" ON "wuzmind_contexts" ("phone");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wuzmind_contexts_phone";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wuzmind_contexts";`);
  }
}
