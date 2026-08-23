import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StructuredLoggerService } from './logger/structured-logger.service';
import { ApiKeyGuard } from './auth/api-key.guard';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [StructuredLoggerService, ApiKeyGuard],
  exports: [StructuredLoggerService, ApiKeyGuard],
})
export class CommonModule {}
