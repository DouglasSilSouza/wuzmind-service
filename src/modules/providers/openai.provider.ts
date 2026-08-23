import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '../ai/ai-provider.interface';
import {
  IntentClassificationRequest,
  IntentClassificationResult,
  RecoveryRequest,
  RecoveryResult,
  MediaClassificationRequest,
  MediaClassificationResult,
} from '../ai/ai.types';
import { buildIntentClassifierPrompt } from '../ai/prompts/intent-classifier.prompt';
import { buildRecoveryPrompt } from '../ai/prompts/recovery.prompt';
import { buildMediaClassifierPrompt } from '../ai/prompts/media-classifier.prompt';

@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly name = 'OPENAI';
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
    this.baseUrl = (this.configService.get<string>('OPENAI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.timeoutMs = parseInt(this.configService.get<string>('OPENAI_REQUEST_TIMEOUT_MS') || '5000', 10);
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  private cleanJson(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed;
    }
    const match = trimmed.match(/\{([\s\S]*)\}/);
    if (match) {
      return match[0];
    }
    return raw;
  }

  private async callOpenAi(prompt: string): Promise<string> {
    if (!this.apiKey) {
      const err = new Error('OPENAI_UNAUTHORIZED');
      (err as any).code = 'OPENAI_UNAUTHORIZED';
      throw err;
    }

    const url = `${this.baseUrl}/chat/completions`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 300,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          const err = new Error('OPENAI_UNAUTHORIZED');
          (err as any).code = 'OPENAI_UNAUTHORIZED';
          throw err;
        }
        const err = new Error(`OPENAI_ERROR (${res.status})`);
        (err as any).code = 'OPENAI_ERROR';
        throw err;
      }

      const data = (await res.json()) as any;
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        const err = new Error('INVALID_PROVIDER_JSON');
        (err as any).code = 'INVALID_PROVIDER_JSON';
        throw err;
      }
      return content;
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('OPENAI_TIMEOUT');
        (timeoutErr as any).code = 'OPENAI_TIMEOUT';
        throw timeoutErr;
      }
      throw err;
    }
  }

  async classifyIntent(request: IntentClassificationRequest): Promise<IntentClassificationResult> {
    const prompt = buildIntentClassifierPrompt(request);
    const raw = await this.callOpenAi(prompt);
    let parsed: any;
    try {
      parsed = JSON.parse(this.cleanJson(raw));
    } catch {
      const err = new Error('INVALID_PROVIDER_JSON');
      (err as any).code = 'INVALID_PROVIDER_JSON';
      throw err;
    }

    return {
      intent: parsed.intent,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.92,
      entities: parsed.entities || {},
      suggestedAction: parsed.suggestedAction,
      targetFlow: parsed.targetFlow || null,
      provider: this.name,
    };
  }

  async recoverConversation(request: RecoveryRequest): Promise<RecoveryResult> {
    const prompt = buildRecoveryPrompt(request);
    const raw = await this.callOpenAi(prompt);
    let parsed: any;
    try {
      parsed = JSON.parse(this.cleanJson(raw));
    } catch {
      const err = new Error('INVALID_PROVIDER_JSON');
      (err as any).code = 'INVALID_PROVIDER_JSON';
      throw err;
    }

    return {
      action: parsed.action,
      message: parsed.message,
      matchedOption: parsed.matchedOption || null,
      intent: parsed.intent || 'AJUDA_CONTEXTO',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.92,
      provider: this.name,
    };
  }

  async classifyMedia(request: MediaClassificationRequest): Promise<MediaClassificationResult> {
    const prompt = buildMediaClassifierPrompt(request);
    const raw = await this.callOpenAi(prompt);
    let parsed: any;
    try {
      parsed = JSON.parse(this.cleanJson(raw));
    } catch {
      const err = new Error('INVALID_PROVIDER_JSON');
      (err as any).code = 'INVALID_PROVIDER_JSON';
      throw err;
    }

    return {
      classification: parsed.classification,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.90,
      suggestedAction: parsed.suggestedAction,
      provider: this.name,
    };
  }
}
