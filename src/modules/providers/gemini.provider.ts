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
import { GeminiModelDiscoveryService } from './gemini-model-discovery.service';
import { StructuredLoggerService } from '../common/logger/structured-logger.service';

@Injectable()
export class GeminiProvider implements AiProvider {
  readonly name = 'GEMINI';
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly logger = new StructuredLoggerService(GeminiProvider.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly discoveryService: GeminiModelDiscoveryService,
  ) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.baseUrl = (this.configService.get<string>('GEMINI_BASE_URL') || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
    this.timeoutMs = parseInt(this.configService.get<string>('GEMINI_REQUEST_TIMEOUT_MS') || '6000', 10);
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    const model = await this.discoveryService.getSelectedModel();
    return Boolean(model);
  }

  async getActiveModelName(): Promise<string | null> {
    return this.discoveryService.getSelectedModel();
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

  private async callGemini(prompt: string): Promise<string> {
    if (!this.apiKey) {
      const err = new Error('GEMINI_UNAUTHORIZED');
      (err as any).code = 'GEMINI_UNAUTHORIZED';
      throw err;
    }

    const modelName = await this.discoveryService.getSelectedModel();
    if (!modelName) {
      const err = new Error('GEMINI_MODEL_NOT_FOUND');
      (err as any).code = 'GEMINI_MODEL_NOT_FOUND';
      throw err;
    }

    const cleanModel = modelName.replace(/^models\//, '');
    const url = `${this.baseUrl}/models/${cleanModel}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 300,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        this.logger.warn(`Gemini API returned status ${res.status} for model ${cleanModel}`);

        if (res.status === 404) {
          this.discoveryService.invalidateCache();
          const err = new Error(`GEMINI_MODEL_NOT_FOUND: ${errorBody.slice(0, 120)}`);
          (err as any).code = 'GEMINI_MODEL_NOT_FOUND';
          throw err;
        }

        if (res.status === 401 || res.status === 403) {
          const err = new Error('GEMINI_UNAUTHORIZED');
          (err as any).code = 'GEMINI_UNAUTHORIZED';
          throw err;
        }

        if (res.status === 429) {
          const err = new Error('GEMINI_RATE_LIMITED');
          (err as any).code = 'GEMINI_RATE_LIMITED';
          throw err;
        }

        if (res.status === 400) {
          const err = new Error(`GEMINI_BAD_REQUEST: ${errorBody.slice(0, 120)}`);
          (err as any).code = 'GEMINI_BAD_REQUEST';
          throw err;
        }

        const err = new Error(`GEMINI_SERVER_ERROR (${res.status})`);
        (err as any).code = 'GEMINI_SERVER_ERROR';
        throw err;
      }

      const data = (await res.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        const err = new Error('INVALID_PROVIDER_JSON');
        (err as any).code = 'INVALID_PROVIDER_JSON';
        throw err;
      }
      return text;
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('GEMINI_TIMEOUT');
        (timeoutErr as any).code = 'GEMINI_TIMEOUT';
        throw timeoutErr;
      }
      throw err;
    }
  }

  async classifyIntent(request: IntentClassificationRequest): Promise<IntentClassificationResult> {
    const prompt = buildIntentClassifierPrompt(request);
    const raw = await this.callGemini(prompt);
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
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.90,
      entities: parsed.entities || {},
      suggestedAction: parsed.suggestedAction,
      targetFlow: parsed.targetFlow || null,
      provider: this.name,
    };
  }

  async recoverConversation(request: RecoveryRequest): Promise<RecoveryResult> {
    const prompt = buildRecoveryPrompt(request);
    const raw = await this.callGemini(prompt);
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
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.90,
      provider: this.name,
    };
  }

  async classifyMedia(request: MediaClassificationRequest): Promise<MediaClassificationResult> {
    const prompt = buildMediaClassifierPrompt(request);
    const raw = await this.callGemini(prompt);
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
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.88,
      suggestedAction: parsed.suggestedAction,
      provider: this.name,
    };
  }
}
