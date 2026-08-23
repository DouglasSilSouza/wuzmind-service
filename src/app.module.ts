import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { configuration } from './modules/common/config/configuration';
import { CommonModule } from './modules/common/common.module';
import { ApiKeyGuard } from './modules/common/auth/api-key.guard';
import { HttpExceptionFilter } from './modules/common/filters/http-exception.filter';
import { AiModule } from './modules/ai/ai.module';
import { HumanBehaviorModule } from './modules/human-behavior/human-behavior.module';
import { IntentRouterModule } from './modules/intent-router/intent-router.module';
import { RecoveryModule } from './modules/recovery/recovery.module';
import { MediaClassifierModule } from './modules/media-classifier/media-classifier.module';
import { ContextModule } from './modules/context/context.module';
import { HealthModule } from './modules/health/health.module';
import { ContextEntity } from './database/entities/context.entity';
import { ProviderEventEntity } from './database/entities/provider-event.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get<string>('DATABASE_URL');
        if (dbUrl) {
          return {
            type: 'postgres',
            url: dbUrl,
            entities: [ContextEntity, ProviderEventEntity],
            synchronize: false,
            autoLoadEntities: true,
          };
        }
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USER', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'postgres'),
          database: configService.get<string>('DB_NAME', 'wuzmind'),
          entities: [ContextEntity, ProviderEventEntity],
          synchronize: false,
          autoLoadEntities: true,
        };
      },
    }),
    CommonModule,
    AiModule,
    HumanBehaviorModule,
    IntentRouterModule,
    RecoveryModule,
    MediaClassifierModule,
    ContextModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
