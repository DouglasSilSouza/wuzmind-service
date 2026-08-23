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
import { StructuredLoggerService } from '../common/logger/structured-logger.service';

@Injectable()
export class GeminiProvider implements AiProvider {
  readonly name = 'GEMINI';
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly logger = new StructuredLoggerService(GeminiProvider.name);

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const rawModel = this.configService.get<string>('GEMINI_MODEL') || 'gemini-1.5-flash';
    this.model = rawModel.replace(/^models\//, '');
    this.baseUrl = (this.configService.get<string>('GEMINI_BASE_URL') || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
    this.timeoutMs = parseInt(this.configService.get<string>('AI_REQUEST_TIMEOUT_MS') || '3000', 10);
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

  private async callGeminiModel(prompt: string, modelName: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured');
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
            maxOutputTokens: 200,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        throw new Error(`Gemini API returned status ${res.status} for model ${cleanModel}: ${errorBody}`);
      }

      const data = (await res.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Gemini response missing expected content parts');
      }
      return text;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  private async callGeminiWithFallback(prompt: string): Promise<string> {
    try {
      return await this.callGeminiModel(prompt, this.model);
    } catch (err: any) {
      const fallbackModel = this.model === 'gemini-1.5-flash' ? 'gemini-2.0-flash' : 'gemini-1.5-flash';
      this.logger.warn(`Gemini primary model ${this.model} failed (${err.message}). Trying fallback ${fallbackModel}...`);
      return await this.callGeminiModel(prompt, fallbackModel);
    }
  }

  async classifyIntent(request: IntentClassificationRequest): Promise<IntentClassificationResult> {
    const prompt = buildIntentClassifierPrompt(request);
    const raw = await this.callGeminiWithFallback(prompt);
    const parsed = JSON.parse(this.cleanJson(raw));
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
    const raw = await this.callGeminiWithFallback(prompt);
    const parsed = JSON.parse(this.cleanJson(raw));
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
    const raw = await this.callGeminiWithFallback(prompt);
    const parsed = JSON.parse(this.cleanJson(raw));
    return {
      classification: parsed.classification,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.88,
      suggestedAction: parsed.suggestedAction,
      provider: this.name,
    };
  }
}
