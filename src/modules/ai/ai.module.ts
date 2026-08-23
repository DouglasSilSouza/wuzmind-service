import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderEventEntity } from '../../database/entities/provider-event.entity';
import { GeminiModelDiscoveryService } from '../providers/gemini-model-discovery.service';
import { GeminiProvider } from '../providers/gemini.provider';
import { OpenAiProvider } from '../providers/openai.provider';
import { OllamaProvider } from '../providers/ollama.provider';
import { StaticFallbackProvider } from '../providers/static-fallback.provider';
import { AiProviderManager } from './ai-provider.manager';

@Module({
  imports: [TypeOrmModule.forFeature([ProviderEventEntity])],
  providers: [
    GeminiModelDiscoveryService,
    GeminiProvider,
    OpenAiProvider,
    OllamaProvider,
    StaticFallbackProvider,
    AiProviderManager,
  ],
  exports: [
    GeminiModelDiscoveryService,
    GeminiProvider,
    OpenAiProvider,
    OllamaProvider,
    StaticFallbackProvider,
    AiProviderManager,
  ],
})
export class AiModule {}
