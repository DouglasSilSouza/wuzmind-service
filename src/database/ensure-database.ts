import { Client } from 'pg';
import { StructuredLoggerService } from '../modules/common/logger/structured-logger.service';

export async function ensureDatabase(): Promise<void> {
  const logger = new StructuredLoggerService('DatabaseBootstrap');
  const dbUrl = process.env.DATABASE_URL;
  let targetDb = process.env.DB_NAME || 'wuzmind';
  let maintenanceUrl = '';

  let clientConfig: any;

  if (dbUrl) {
    try {
      const url = new URL(dbUrl);
      targetDb = url.pathname.replace(/^\//, '') || 'wuzmind';
      url.pathname = '/postgres';
      maintenanceUrl = url.toString();
      clientConfig = { connectionString: maintenanceUrl };
    } catch {
      clientConfig = { connectionString: dbUrl };
    }
  } else {
    clientConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: 'postgres',
    };
  }

  const client = new Client(clientConfig);
  try {
    await client.connect();
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb]);
    if (res.rowCount === 0) {
      logger.log(`Database "${targetDb}" does not exist. Creating automatically...`);
      // Escape targetDb name safely
      const safeDbName = targetDb.replace(/[^a-zA-Z0-9_]/g, '');
      await client.query(`CREATE DATABASE "${safeDbName}"`);
      logger.log(`Database "${safeDbName}" created successfully!`);
    } else {
      logger.debug(`Database "${targetDb}" already exists.`);
    }
  } catch (err: unknown) {
    logger.warn(`Could not auto-create database "${targetDb}": ${(err as Error).message}`);
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
