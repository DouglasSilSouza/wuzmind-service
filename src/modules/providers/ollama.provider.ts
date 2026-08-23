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
export class OllamaProvider implements AiProvider {
  readonly name = 'OLLAMA';
  private readonly baseUrl: string;
  private readonly primaryModel: string;
  private readonly fallbackModel: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = (this.configService.get<string>('OLLAMA_URL') || 'http://ollama:11434').replace(/\/+$/, '');
    this.primaryModel = this.configService.get<string>('OLLAMA_PRIMARY_MODEL') || 'qwen2.5:3b';
    this.fallbackModel = this.configService.get<string>('OLLAMA_FALLBACK_MODEL') || 'llama3.2:3b';
    this.timeoutMs = parseInt(this.configService.get<string>('AI_REQUEST_TIMEOUT_MS') || '3000', 10);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1000);
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(id);
      return res.ok;
    } catch {
      return false;
    }
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

  private async callModel(prompt: string, model: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          format: 'json',
          keep_alive: '24h',
          options: {
            temperature: 0.1,
            num_predict: 150,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Ollama returned status ${response.status}`);
      }

      const data = (await response.json()) as { response?: string };
      if (!data.response) {
        throw new Error('INVALID_PROVIDER_JSON');
      }
      return data.response;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  private async executeWithFallback(prompt: string): Promise<{ raw: string; usedModel: string }> {
    try {
      const raw = await this.callModel(prompt, this.primaryModel);
      return { raw, usedModel: this.primaryModel };
    } catch {
      const raw = await this.callModel(prompt, this.fallbackModel);
      return { raw, usedModel: this.fallbackModel };
    }
  }

  async classifyIntent(request: IntentClassificationRequest): Promise<IntentClassificationResult> {
    const prompt = buildIntentClassifierPrompt(request);
    const { raw } = await this.executeWithFallback(prompt);
    const parsed = JSON.parse(this.cleanJson(raw));
    return {
      intent: parsed.intent,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
      entities: parsed.entities || {},
      suggestedAction: parsed.suggestedAction,
      targetFlow: parsed.targetFlow || null,
      provider: this.name,
    };
  }

  async recoverConversation(request: RecoveryRequest): Promise<RecoveryResult> {
    const prompt = buildRecoveryPrompt(request);
    const { raw } = await this.executeWithFallback(prompt);
    const parsed = JSON.parse(this.cleanJson(raw));
    return {
      action: parsed.action,
      message: parsed.message,
      matchedOption: parsed.matchedOption || null,
      intent: parsed.intent || 'AJUDA_CONTEXTO',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
      provider: this.name,
    };
  }

  async classifyMedia(request: MediaClassificationRequest): Promise<MediaClassificationResult> {
    const prompt = buildMediaClassifierPrompt(request);
    const { raw } = await this.executeWithFallback(prompt);
    const parsed = JSON.parse(this.cleanJson(raw));
    return {
      classification: parsed.classification,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
      suggestedAction: parsed.suggestedAction,
      provider: this.name,
    };
  }
}
