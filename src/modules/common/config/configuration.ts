export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl?: string;
  dbHost?: string;
  dbPort?: number;
  dbName?: string;
  dbUser?: string;
  dbPassword?: string;
  wuzmindApiKey: string;
  aiProviderOrder: string[];
  aiTotalTimeoutMs: number;
  aiMaxRetriesPerProvider: number;
  aiMinConfidence: number;
  geminiApiKey?: string;
  geminiModel?: string;
  geminiModelCandidates: string[];
  geminiModelsCacheTtlMs: number;
  geminiDiscoveryTimeoutMs: number;
  geminiRequestTimeoutMs: number;
  geminiBaseUrl: string;
  openaiApiKey?: string;
  openaiModel: string;
  openaiRequestTimeoutMs: number;
  openaiBaseUrl: string;
  ollamaUrl: string;
  ollamaPrimaryModel: string;
  ollamaFallbackModel: string;
  logLevel: string;
}

export const configuration = (): AppConfig => {
  const rawOrder = process.env.AI_PROVIDER_ORDER || 'GEMINI,OPENAI,STATIC';
  const aiProviderOrder = rawOrder
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const rawCandidates = process.env.GEMINI_MODEL_CANDIDATES || 'gemini-2.5-flash,gemini-2.5-flash-lite,gemini-1.5-flash,gemini-2.0-flash';
  const geminiModelCandidates = rawCandidates.split(',').map((c) => c.trim()).filter(Boolean);

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    databaseUrl: process.env.DATABASE_URL,
    dbHost: process.env.DB_HOST,
    dbPort: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    dbName: process.env.DB_NAME || 'wuzmind',
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,
    wuzmindApiKey: process.env.WUZMIND_API_KEY || '',
    aiProviderOrder: aiProviderOrder.length > 0 ? aiProviderOrder : ['GEMINI', 'OPENAI', 'STATIC'],
    aiTotalTimeoutMs: parseInt(process.env.AI_TOTAL_TIMEOUT_MS || '12000', 10),
    aiMaxRetriesPerProvider: parseInt(process.env.AI_MAX_RETRIES_PER_PROVIDER || '0', 10),
    aiMinConfidence: parseFloat(process.env.AI_MIN_CONFIDENCE || '0.65'),
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL,
    geminiModelCandidates,
    geminiModelsCacheTtlMs: parseInt(process.env.GEMINI_MODELS_CACHE_TTL_MS || '3600000', 10),
    geminiDiscoveryTimeoutMs: parseInt(process.env.GEMINI_DISCOVERY_TIMEOUT_MS || '5000', 10),
    geminiRequestTimeoutMs: parseInt(process.env.GEMINI_REQUEST_TIMEOUT_MS || '6000', 10),
    geminiBaseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    openaiRequestTimeoutMs: parseInt(process.env.OPENAI_REQUEST_TIMEOUT_MS || '5000', 10),
    openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    ollamaUrl: process.env.OLLAMA_URL || 'http://ollama:11434',
    ollamaPrimaryModel: process.env.OLLAMA_PRIMARY_MODEL || 'qwen2.5:3b',
    ollamaFallbackModel: process.env.OLLAMA_FALLBACK_MODEL || 'llama3.2:3b',
    logLevel: process.env.LOG_LEVEL || 'info',
  };
};
