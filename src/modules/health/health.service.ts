import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { GeminiModelDiscoveryService } from '../providers/gemini-model-discovery.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly geminiDiscovery: GeminiModelDiscoveryService,
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

    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    let geminiStatus = 'not_configured';
    let selectedGeminiModel: string | null = null;

    if (geminiKey) {
      try {
        selectedGeminiModel = await this.geminiDiscovery.getSelectedModel();
        geminiStatus = selectedGeminiModel ? 'up' : 'degraded';
      } catch {
        geminiStatus = 'degraded';
      }
    }

    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');

    return {
      status: 'ok',
      service: 'wuzmind',
      providers: {
        gemini: {
          status: geminiStatus,
          selectedModel: selectedGeminiModel || 'none',
        },
        openai: {
          status: openaiKey ? 'configured' : 'not_configured',
        },
        static: {
          status: 'up',
        },
      },
      database: databaseStatus,
    };
  }
}
