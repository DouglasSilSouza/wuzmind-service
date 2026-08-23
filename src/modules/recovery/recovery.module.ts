import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { RecoveryService } from './recovery.service';
import { RecoveryController } from './recovery.controller';

@Module({
  imports: [AiModule],
  providers: [RecoveryService],
  controllers: [RecoveryController],
  exports: [RecoveryService],
})
export class RecoveryModule {}
