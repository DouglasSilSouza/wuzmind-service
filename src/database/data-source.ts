import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { ContextEntity } from './entities/context.entity';
import { ProviderEventEntity } from './entities/provider-event.entity';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource(
  process.env.DATABASE_URL
    ? {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: [ContextEntity, ProviderEventEntity],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: false,
        logging: !isProduction,
      }
    : {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'wuzmind',
        entities: [ContextEntity, ProviderEventEntity],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: false,
        logging: !isProduction,
      }
);
