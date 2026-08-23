import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { HumanBehaviorModule } from '../human-behavior/human-behavior.module';
import { IntentRouterService } from './intent-router.service';
import { IntentRouterController } from './intent-router.controller';

@Module({
  imports: [AiModule, HumanBehaviorModule],
  providers: [IntentRouterService],
  controllers: [IntentRouterController],
  exports: [IntentRouterService],
})
export class IntentRouterModule {}
