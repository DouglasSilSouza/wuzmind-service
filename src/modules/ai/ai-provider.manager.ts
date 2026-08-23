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
import { OllamaProvider } from '../providers/ollama.provider';
import { GeminiProvider } from '../providers/gemini.provider';
import { OpenAiProvider } from '../providers/openai.provider';
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
  private readonly minConfidence: number;
  private readonly circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private readonly logger = new StructuredLoggerService(AiProviderManager.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly ollamaProvider: OllamaProvider,
    private readonly geminiProvider: GeminiProvider,
    private readonly openAiProvider: OpenAiProvider,
    private readonly staticProvider: StaticFallbackProvider,
    @Optional()
    @InjectRepository(ProviderEventEntity)
    private readonly eventRepo?: Repository<ProviderEventEntity>,
  ) {
    this.providers.set('OLLAMA', this.ollamaProvider);
    this.providers.set('GEMINI', this.geminiProvider);
    this.providers.set('OPENAI', this.openAiProvider);
    this.providers.set('STATIC', this.staticProvider);

    const rawOrder = this.configService.get<string>('AI_PROVIDER_ORDER') || 'OLLAMA,GEMINI,OPENAI,STATIC';
    this.providerOrder = rawOrder
      .split(',')
      .map((p) => p.trim().toUpperCase())
      .filter((p) => this.providers.has(p));

    if (!this.providerOrder.includes('STATIC')) {
      this.providerOrder.push('STATIC');
    }

    this.maxRetries = parseInt(this.configService.get<string>('AI_MAX_RETRIES_PER_PROVIDER') || '1', 10);
    this.minConfidence = parseFloat(this.configService.get<string>('AI_MIN_CONFIDENCE') || '0.65');
  }

  private isCircuitOpen(providerName: string): boolean {
    if (providerName === 'STATIC') return false;
    const state = this.circuitBreakers.get(providerName);
    if (!state) return false;
    if (Date.now() < state.circuitOpenUntil) {
      return true;
    }
    return false;
  }

  private recordSuccess(providerName: string) {
    this.circuitBreakers.delete(providerName);
  }

  private recordFailure(providerName: string) {
    if (providerName === 'STATIC') return;
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

  private async logProviderEvent(
    operation: string,
    provider: string,
    status: string,
    durationMs: number,
    errorCode?: string,
    metadata?: Record<string, unknown>,
  ) {
    try {
      if (this.eventRepo) {
        const event = this.eventRepo.create({
          operation,
          provider,
          status,
          durationMs,
          errorCode: errorCode || null,
          metadata: metadata ? (this.logger.redact(metadata) as Record<string, unknown>) : {},
        });
        await this.eventRepo.save(event);
      }
    } catch (dbErr) {
      this.logger.warn(`Failed to save provider event to database: ${(dbErr as Error).message}`);
    }
  }

  public getProvidersStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    for (const name of ['ollama', 'gemini', 'openai']) {
      const upper = name.toUpperCase();
      if (this.isCircuitOpen(upper)) {
        status[name] = 'circuit_open';
      } else {
        status[name] = 'configured';
      }
    }
    return status;
  }

  async executeWithFailover<T>(
    operationName: string,
    fn: (provider: AiProvider) => Promise<T>,
    validateResult?: (result: T) => boolean,
  ): Promise<T> {
    const errors: Array<{ provider: string; error: string }> = [];

    for (const providerName of this.providerOrder) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      if (this.isCircuitOpen(providerName)) {
        this.logger.warn(`Provider ${providerName} skipped due to open circuit`);
        continue;
      }

      const available = await provider.isAvailable().catch(() => false);
      if (!available && providerName !== 'STATIC') {
        this.logger.debug(`Provider ${providerName} is not available, skipping`);
        continue;
      }

      let attempts = 0;
      while (attempts <= this.maxRetries) {
        attempts++;
        const startTime = Date.now();
        try {
          this.logger.debug(`Calling provider ${providerName} (attempt ${attempts}) for ${operationName}`);
          const result = await fn(provider);
          const duration = Date.now() - startTime;

          if (validateResult && !validateResult(result)) {
            throw new Error(`Provider ${providerName} output validation failed`);
          }

          this.recordSuccess(providerName);
          await this.logProviderEvent(operationName, providerName, 'SUCCESS', duration);
          return result;
        } catch (err: unknown) {
          const duration = Date.now() - startTime;
          const msg = (err as Error)?.message || 'Unknown error';
          this.logger.warn(`Provider ${providerName} attempt ${attempts} failed: ${msg}`);
          await this.logProviderEvent(operationName, providerName, 'FAILURE', duration, msg);

          if (attempts > this.maxRetries) {
            this.recordFailure(providerName);
            errors.push({ provider: providerName, error: msg });
          }
        }
      }
    }

    this.logger.error(`All AI providers failed for operation ${operationName}. Fallbacks exhausted.`, JSON.stringify(errors));
    return fn(this.staticProvider);
  }

  async classifyIntent(request: IntentClassificationRequest): Promise<IntentClassificationResult> {
    return this.executeWithFailover(
      'classifyIntent',
      (p) => p.classifyIntent(request),
      (res) => Boolean(res && res.intent && typeof res.confidence === 'number'),
    );
  }

  async recoverConversation(request: RecoveryRequest): Promise<RecoveryResult> {
    return this.executeWithFailover(
      'recoverConversation',
      (p) => p.recoverConversation(request),
      (res) => Boolean(res && res.action && res.message),
    );
  }

  async classifyMedia(request: MediaClassificationRequest): Promise<MediaClassificationResult> {
    return this.executeWithFailover(
      'classifyMedia',
      (p) => p.classifyMedia(request),
      (res) => Boolean(res && res.classification && res.suggestedAction),
    );
  }
}
