import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AiProviderManager } from '../ai/ai-provider.manager';

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly aiProviderManager: AiProviderManager,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  async checkHealth() {
    let databaseStatus = 'down';
    try {
      if (this.dataSource && this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        databaseStatus = 'up';
      }
    } catch {
      databaseStatus = 'down';
    }

    let ollamaStatus = 'down';
    try {
      const ollamaUrl = this.configService.get<string>('OLLAMA_URL') || 'http://ollama:11434';
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${ollamaUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) {
        ollamaStatus = 'up';
      }
    } catch {
      ollamaStatus = 'down';
    }

    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');

    return {
      status: 'ok',
      service: 'wuzmind',
      providers: {
        ollama: ollamaStatus,
        gemini: geminiKey ? 'configured' : 'not_configured',
        openai: openaiKey ? 'configured' : 'not_configured',
      },
      database: databaseStatus,
    };
  }
}
