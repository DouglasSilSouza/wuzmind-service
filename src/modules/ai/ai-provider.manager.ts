import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiProvider } from './ai-provider.interface';
import {
  IntentClassificationRequest,
  IntentClassificationResult,
  RecoveryRequest,
  RecoveryResult,
  MediaClassificationRequest,
  MediaClassificationResult,
} from './ai.types';
import { GeminiProvider } from '../providers/gemini.provider';
import { OpenAiProvider } from '../providers/openai.provider';
import { OllamaProvider } from '../providers/ollama.provider';
import { StaticFallbackProvider } from '../providers/static-fallback.provider';
import { StructuredLoggerService } from '../common/logger/structured-logger.service';
import { ProviderEventEntity } from '../../database/entities/provider-event.entity';

interface CircuitBreakerState {
  consecutiveFailures: number;
  circuitOpenUntil: number;
}

@Injectable()
export class AiProviderManager {
  private readonly providers: Map<string, AiProvider> = new Map();
  private readonly providerOrder: string[];
  private readonly maxRetries: number;
  private readonly totalTimeoutMs: number;
  private readonly minConfidence: number;
  private readonly circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private readonly logger = new StructuredLoggerService(AiProviderManager.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiProvider: GeminiProvider,
    private readonly openAiProvider: OpenAiProvider,
    private readonly ollamaProvider: OllamaProvider,
    private readonly staticProvider: StaticFallbackProvider,
    @Optional()
    @InjectRepository(ProviderEventEntity)
    private readonly eventRepo?: Repository<ProviderEventEntity>,
  ) {
    this.providers.set('GEMINI', this.geminiProvider);
    this.providers.set('OPENAI', this.openAiProvider);
    this.providers.set('OLLAMA', this.ollamaProvider);
    this.providers.set('STATIC', this.staticProvider);

    const rawOrder = this.configService.get<string>('AI_PROVIDER_ORDER') || 'GEMINI,OPENAI,STATIC';
    this.providerOrder = rawOrder
      .split(',')
      .map((p) => p.trim().toUpperCase())
      .filter((p) => this.providers.has(p));

    this.maxRetries = parseInt(this.configService.get<string>('AI_MAX_RETRIES_PER_PROVIDER') || '0', 10);
    this.totalTimeoutMs = parseInt(this.configService.get<string>('AI_TOTAL_TIMEOUT_MS') || '12000', 10);
    this.minConfidence = parseFloat(this.configService.get<string>('AI_MIN_CONFIDENCE') || '0.65');
  }

  private isCircuitOpen(providerName: string): boolean {
    const state = this.circuitBreakers.get(providerName);
    if (!state) return false;
    if (Date.now() < state.circuitOpenUntil) {
      return true;
    }
    this.circuitBreakers.delete(providerName);
    return false;
  }

  private recordSuccess(providerName: string) {
    this.circuitBreakers.delete(providerName);
  }

  private recordFailure(providerName: string) {
    const state = this.circuitBreakers.get(providerName) || {
      consecutiveFailures: 0,
      circuitOpenUntil: 0,
    };
    state.consecutiveFailures += 1;
    if (state.consecutiveFailures >= 3) {
      state.circuitOpenUntil = Date.now() + 30000;
      this.logger.warn(`Circuit breaker tripped for provider ${providerName} for 30 seconds`);
    }
    this.circuitBreakers.set(providerName, state);
  }

  private extractShortErrorCode(err: any): string {
    if (err?.code && typeof err.code === 'string') return err.code;
    const msg = String(err?.message || err || '');
    if (msg.includes('GEMINI_MODEL_NOT_FOUND')) return 'GEMINI_MODEL_NOT_FOUND';
    if (msg.includes('GEMINI_UNAUTHORIZED') || msg.includes('401') || msg.includes('403')) return 'GEMINI_UNAUTHORIZED';
    if (msg.includes('GEMINI_RATE_LIMITED') || msg.includes('429')) return 'GEMINI_RATE_LIMITED';
    if (msg.includes('GEMINI_TIMEOUT')) return 'GEMINI_TIMEOUT';
    if (msg.includes('GEMINI_BAD_REQUEST')) return 'GEMINI_BAD_REQUEST';
    if (msg.includes('OPENAI_TIMEOUT')) return 'OPENAI_TIMEOUT';
    if (msg.includes('OPENAI_UNAUTHORIZED')) return 'OPENAI_UNAUTHORIZED';
    if (msg.includes('INVALID_PROVIDER_JSON')) return 'INVALID_PROVIDER_JSON';
    if (msg.includes('DEADLINE_EXCEEDED')) return 'DEADLINE_EXCEEDED';
    return msg.slice(0, 50).toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  }

  private async logProviderEvent(
    operation: string,
    provider: string,
    status: 'SUCCESS' | 'FAILURE' | 'CIRCUIT_OPEN',
    durationMs: number,
    correlationId?: string,
    errorCode?: string,
    metadata: Record<string, unknown> = {},
  ) {
    try {
      if (this.eventRepo) {
        await this.eventRepo.save({
          correlationId: correlationId || null,
          operation,
          provider,
          model: (metadata.model as string) || null,
          status,
          durationMs,
          errorCode: errorCode || null,
          metadata,
        });
      }
    } catch {
      // Non-blocking telemetry
    }
  }

  async executeWithFailover<T>(
    operation: string,
    runner: (provider: AiProvider) => Promise<T>,
    correlationId?: string,
  ): Promise<T> {
    const deadline = Date.now() + this.totalTimeoutMs;

    for (const providerName of this.providerOrder) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        this.logger.warn(`[DEADLINE_EXCEEDED] Global deadline reached (${this.totalTimeoutMs}ms). Returning static provider.`);
        await this.logProviderEvent(operation, 'STATIC', 'SUCCESS', 0, correlationId, 'DEADLINE_EXCEEDED');
        return runner(this.staticProvider);
      }

      const provider = this.providers.get(providerName);
      if (!provider) continue;

      if (this.isCircuitOpen(providerName)) {
        this.logger.warn(`Provider ${providerName} skipped due to open circuit`);
        await this.logProviderEvent(operation, providerName, 'CIRCUIT_OPEN', 0, correlationId);
        continue;
      }

      const isAvailable = await provider.isAvailable();
      if (!isAvailable && providerName !== 'STATIC') {
        continue;
      }

      let providerSucceeded = false;
      for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
        if (Date.now() >= deadline) {
          break;
        }

        const start = Date.now();
        try {
          const result = await runner(provider);
          const duration = Date.now() - start;
          this.recordSuccess(providerName);
          await this.logProviderEvent(operation, providerName, 'SUCCESS', duration, correlationId);
          providerSucceeded = true;
          return result;
        } catch (err: any) {
          const duration = Date.now() - start;
          const shortCode = this.extractShortErrorCode(err);
          this.logger.warn(`Provider ${providerName} attempt ${attempt} failed with code ${shortCode}`);
          await this.logProviderEvent(operation, providerName, 'FAILURE', duration, correlationId, shortCode, {
            errorSummary: String(err?.message || '').slice(0, 200),
          });
        }
      }

      if (!providerSucceeded) {
        this.recordFailure(providerName);
      }
    }

    this.logger.warn(`All configured providers in order (${this.providerOrder.join(', ')}) failed. Falling back to static provider.`);
    return runner(this.staticProvider);
  }

  async classifyIntent(request: IntentClassificationRequest): Promise<IntentClassificationResult> {
    return this.executeWithFailover('classifyIntent', (p) => p.classifyIntent(request), request.phone);
  }

  async recoverConversation(request: RecoveryRequest): Promise<RecoveryResult> {
    return this.executeWithFailover('recoverConversation', (p) => p.recoverConversation(request), request.phone);
  }

  async classifyMedia(request: MediaClassificationRequest): Promise<MediaClassificationResult> {
    return this.executeWithFailover('classifyMedia', (p) => p.classifyMedia(request), request.phone);
  }
}
