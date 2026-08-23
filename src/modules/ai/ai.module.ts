import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OllamaProvider } from '../providers/ollama.provider';
import { GeminiProvider } from '../providers/gemini.provider';
import { OpenAiProvider } from '../providers/openai.provider';
import { StaticFallbackProvider } from '../providers/static-fallback.provider';
import { AiProviderManager } from './ai-provider.manager';
import { ProviderEventEntity } from '../../database/entities/provider-event.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ProviderEventEntity]),
  ],
  providers: [
    OllamaProvider,
    GeminiProvider,
    OpenAiProvider,
    StaticFallbackProvider,
    AiProviderManager,
  ],
  exports: [AiProviderManager, OllamaProvider, GeminiProvider, OpenAiProvider, StaticFallbackProvider],
})
export class AiModule {}
