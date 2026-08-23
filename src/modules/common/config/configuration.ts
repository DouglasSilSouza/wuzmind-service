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
  aiRequestTimeoutMs: number;
  aiMaxRetriesPerProvider: number;
  aiMinConfidence: number;
  ollamaUrl: string;
  ollamaPrimaryModel: string;
  ollamaFallbackModel: string;
  geminiApiKey?: string;
  geminiModel?: string;
  geminiBaseUrl: string;
  openaiApiKey?: string;
  openaiModel?: string;
  openaiBaseUrl: string;
  logLevel: string;
}

export const configuration = (): AppConfig => {
  const rawOrder = process.env.AI_PROVIDER_ORDER || 'OLLAMA,GEMINI,OPENAI,STATIC';
  const aiProviderOrder = rawOrder
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

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
    aiProviderOrder: aiProviderOrder.length > 0 ? aiProviderOrder : ['OLLAMA', 'GEMINI', 'OPENAI', 'STATIC'],
    aiRequestTimeoutMs: parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '8000', 10),
    aiMaxRetriesPerProvider: parseInt(process.env.AI_MAX_RETRIES_PER_PROVIDER || '1', 10),
    aiMinConfidence: parseFloat(process.env.AI_MIN_CONFIDENCE || '0.65'),
    ollamaUrl: process.env.OLLAMA_URL || 'http://ollama:11434',
    ollamaPrimaryModel: process.env.OLLAMA_PRIMARY_MODEL || 'qwen3:4b',
    ollamaFallbackModel: process.env.OLLAMA_FALLBACK_MODEL || 'llama3.2:3b',
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL,
    geminiBaseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL,
    openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    logLevel: process.env.LOG_LEVEL || 'info',
  };
};
