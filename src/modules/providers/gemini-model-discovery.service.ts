import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLoggerService } from '../common/logger/structured-logger.service';

export interface GeminiModelInfo {
  name: string;
  version?: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods: string[];
}

@Injectable()
export class GeminiModelDiscoveryService {
  private readonly logger = new StructuredLoggerService(GeminiModelDiscoveryService.name);
  private cachedModels: string[] | null = null;
  private selectedModelCache: string | null = null;
  private cacheExpiresAt = 0;

  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly configuredModel?: string;
  private readonly candidates: string[];
  private readonly cacheTtlMs: number;
  private readonly discoveryTimeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.baseUrl = (this.configService.get<string>('GEMINI_BASE_URL') || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
    this.configuredModel = this.configService.get<string>('GEMINI_MODEL');
    const rawCandidates = this.configService.get<string>('GEMINI_MODEL_CANDIDATES') || 'gemini-2.5-flash,gemini-2.5-flash-lite,gemini-1.5-flash,gemini-2.0-flash';
    this.candidates = rawCandidates.split(',').map((c) => c.trim()).filter(Boolean);
    this.cacheTtlMs = parseInt(this.configService.get<string>('GEMINI_MODELS_CACHE_TTL_MS') || '3600000', 10);
    this.discoveryTimeoutMs = parseInt(this.configService.get<string>('GEMINI_DISCOVERY_TIMEOUT_MS') || '5000', 10);
  }

  invalidateCache(): void {
    this.cachedModels = null;
    this.selectedModelCache = null;
    this.cacheExpiresAt = 0;
    this.logger.warn('[GEMINI_CACHE_INVALIDATED] Gemini model discovery cache invalidated');
  }

  async discoverModels(forceRefresh = false): Promise<string[]> {
    if (!this.apiKey) {
      return [];
    }

    if (!forceRefresh && this.cachedModels && Date.now() < this.cacheExpiresAt) {
      return this.cachedModels;
    }

    const url = `${this.baseUrl}/models?key=${encodeURIComponent(this.apiKey)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.discoveryTimeoutMs);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        this.logger.warn(`[GEMINI_DISCOVERY_FAILED] Failed to discover Gemini models (status ${res.status}): ${errBody}`);
        return this.cachedModels || [];
      }

      const data = (await res.json()) as { models?: GeminiModelInfo[] };
      const rawModels = data.models || [];
      
      const generateContentModels = rawModels
        .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m) => m.name.replace(/^models\//, ''));

      this.cachedModels = generateContentModels;
      this.cacheExpiresAt = Date.now() + this.cacheTtlMs;

      this.logger.log(`[GEMINI_MODELS_DISCOVERED] Discovered ${generateContentModels.length} generateContent models: ${generateContentModels.join(', ')}`);
      return generateContentModels;
    } catch (err: any) {
      clearTimeout(timer);
      this.logger.warn(`[GEMINI_DISCOVERY_FAILED] Failed to discover Gemini models: ${err.message}`);
      return this.cachedModels || [];
    }
  }

  async getSelectedModel(): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }

    if (this.selectedModelCache && this.cachedModels && Date.now() < this.cacheExpiresAt) {
      return this.selectedModelCache;
    }

    const authorizedModels = await this.discoverModels();
    if (!authorizedModels || authorizedModels.length === 0) {
      this.selectedModelCache = null;
      return null;
    }

    // Policy 1: Explicitly configured GEMINI_MODEL
    if (this.configuredModel) {
      const cleanConfigured = this.configuredModel.replace(/^models\//, '').trim();
      if (authorizedModels.includes(cleanConfigured)) {
        this.selectedModelCache = cleanConfigured;
        this.logger.log(`[GEMINI_MODEL_SELECTED] Selected configured Gemini model: ${cleanConfigured}`);
        return cleanConfigured;
      }
      this.logger.warn(`[GEMINI_MODEL_REJECTED] Configured model ${cleanConfigured} not found in authorized list (${authorizedModels.join(', ')})`);
    }

    // Policy 2: Check candidate list in order
    for (const candidate of this.candidates) {
      const cleanCandidate = candidate.replace(/^models\//, '').trim();
      if (authorizedModels.includes(cleanCandidate)) {
        this.selectedModelCache = cleanCandidate;
        this.logger.log(`[GEMINI_MODEL_SELECTED] Selected Gemini candidate model: ${cleanCandidate}`);
        return cleanCandidate;
      }
      this.logger.debug(`[GEMINI_MODEL_REJECTED] Candidate model ${cleanCandidate} not authorized`);
    }

    // Policy 3: Pick best matching Flash model or first authorized model
    const flashModel = authorizedModels.find((m) => m.toLowerCase().includes('flash'));
    const fallbackModel = flashModel || authorizedModels[0];

    if (fallbackModel) {
      this.selectedModelCache = fallbackModel;
      this.logger.log(`[GEMINI_MODEL_SELECTED] Selected authorized Gemini fallback model: ${fallbackModel}`);
      return fallbackModel;
    }

    this.selectedModelCache = null;
    return null;
  }
}
