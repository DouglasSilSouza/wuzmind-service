import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { MediaClassifierService } from './media-classifier.service';
import { MediaClassifierController } from './media-classifier.controller';

@Module({
  imports: [AiModule],
  providers: [MediaClassifierService],
  controllers: [MediaClassifierController],
  exports: [MediaClassifierService],
})
export class MediaClassifierModule {}
