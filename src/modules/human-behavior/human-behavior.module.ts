import { Module } from '@nestjs/common';
import { HumanBehaviorService } from './human-behavior.service';
import { HumanBehaviorController } from './human-behavior.controller';

@Module({
  providers: [HumanBehaviorService],
  controllers: [HumanBehaviorController],
  exports: [HumanBehaviorService],
})
export class HumanBehaviorModule {}
