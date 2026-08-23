import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterProviderEventsErrorCodeToText1730000002000 implements MigrationInterface {
  name = 'AlterProviderEventsErrorCodeToText1730000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wuzmind_provider_events"
      ALTER COLUMN "error_code" TYPE text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wuzmind_provider_events"
      ALTER COLUMN "error_code" TYPE character varying(100);
    `);
  }
}
