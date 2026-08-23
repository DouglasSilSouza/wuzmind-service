import test from 'node:test';
import assert from 'node:assert/strict';
import { AiProviderManager } from '../../dist/modules/ai/ai-provider.manager.js';
import { StaticFallbackProvider } from '../../dist/modules/providers/static-fallback.provider.js';
import { IntentEnum } from '../../dist/modules/common/enums/intent.enum.js';
import { SuggestedActionEnum } from '../../dist/modules/common/enums/suggested-action.enum.js';

function createMockConfig(order = 'GEMINI,OPENAI,STATIC', maxRetries = '0', totalTimeout = '12000') {
  return {
    get: (key) => {
      if (key === 'AI_PROVIDER_ORDER') return order;
      if (key === 'AI_MAX_RETRIES_PER_PROVIDER') return maxRetries;
      if (key === 'AI_TOTAL_TIMEOUT_MS') return totalTimeout;
      if (key === 'AI_MIN_CONFIDENCE') return '0.65';
      return null;
    },
  };
}

test('AiProviderManager - Prioritizes Gemini when available and configured', async () => {
  const mockConfig = createMockConfig('GEMINI,OPENAI,STATIC');

  const mockGemini = {
    name: 'GEMINI',
    isAvailable: async () => true,
    classifyIntent: async () => ({
      intent: IntentEnum.REGISTRAR_GASTO,
      confidence: 0.95,
      entities: { value: 50, category: 'mercado' },
      suggestedAction: SuggestedActionEnum.START_TYPEBOT_FLOW,
      targetFlow: 'GASTOS',
      provider: 'GEMINI',
    }),
    recoverConversation: async () => ({}),
    classifyMedia: async () => ({}),
  };

  const mockOpenAi = { name: 'OPENAI', isAvailable: async () => true };
  const mockOllama = { name: 'OLLAMA', isAvailable: async () => true };
  const staticFallback = new StaticFallbackProvider();

  const manager = new AiProviderManager(
    mockConfig,
    mockGemini,
    mockOpenAi,
    mockOllama,
    staticFallback,
  );

  const result = await manager.classifyIntent({
    message: 'gastei 50 no mercado',
  });

  assert.equal(result.provider, 'GEMINI');
  assert.equal(result.intent, IntentEnum.REGISTRAR_GASTO);
  assert.equal(result.confidence, 0.95);
});

test('AiProviderManager - Failover to OpenAI when Gemini fails with 404/Timeout', async () => {
  const mockConfig = createMockConfig('GEMINI,OPENAI,STATIC');

  const mockGemini = {
    name: 'GEMINI',
    isAvailable: async () => true,
    classifyIntent: async () => {
      const err = new Error('GEMINI_MODEL_NOT_FOUND');
      err.code = 'GEMINI_MODEL_NOT_FOUND';
      throw err;
    },
    recoverConversation: async () => { throw new Error('Refused'); },
    classifyMedia: async () => { throw new Error('Refused'); },
  };

  const mockOpenAi = {
    name: 'OPENAI',
    isAvailable: async () => true,
    classifyIntent: async () => ({
      intent: IntentEnum.REGISTRAR_GASTO,
      confidence: 0.92,
      entities: { value: 30, category: 'transporte' },
      suggestedAction: SuggestedActionEnum.START_TYPEBOT_FLOW,
      targetFlow: 'GASTOS',
      provider: 'OPENAI',
    }),
    recoverConversation: async () => ({}),
    classifyMedia: async () => ({}),
  };

  const mockOllama = { name: 'OLLAMA', isAvailable: async () => true };
  const staticFallback = new StaticFallbackProvider();

  const manager = new AiProviderManager(
    mockConfig,
    mockGemini,
    mockOpenAi,
    mockOllama,
    staticFallback,
  );

  const result = await manager.classifyIntent({
    message: 'gastei 30 no uber',
  });

  assert.equal(result.provider, 'OPENAI');
  assert.equal(result.intent, IntentEnum.REGISTRAR_GASTO);
  assert.equal(result.confidence, 0.92);
});

test('AiProviderManager - Ollama is NOT called when default order is GEMINI,OPENAI,STATIC', async () => {
  const mockConfig = createMockConfig('GEMINI,OPENAI,STATIC');
  let ollamaCalled = false;

  const mockGemini = {
    name: 'GEMINI',
    isAvailable: async () => true,
    classifyIntent: async () => { throw new Error('Gemini failed'); },
    recoverConversation: async () => { throw new Error('Refused'); },
    classifyMedia: async () => { throw new Error('Refused'); },
  };

  const mockOpenAi = {
    name: 'OPENAI',
    isAvailable: async () => true,
    classifyIntent: async () => ({
      intent: IntentEnum.REGISTRAR_ENTRADA,
      confidence: 0.90,
      entities: { value: 1000 },
      suggestedAction: SuggestedActionEnum.START_TYPEBOT_FLOW,
      targetFlow: 'ENTRADAS',
      provider: 'OPENAI',
    }),
    recoverConversation: async () => ({}),
    classifyMedia: async () => ({}),
  };

  const mockOllama = {
    name: 'OLLAMA',
    isAvailable: async () => true,
    classifyIntent: async () => {
      ollamaCalled = true;
      throw new Error('Ollama should not be called');
    },
    recoverConversation: async () => { throw new Error('Refused'); },
    classifyMedia: async () => { throw new Error('Refused'); },
  };

  const staticFallback = new StaticFallbackProvider();

  const manager = new AiProviderManager(
    mockConfig,
    mockGemini,
    mockOpenAi,
    mockOllama,
    staticFallback,
  );

  const result = await manager.classifyIntent({
    message: 'recebi 1000 reais de pix',
  });

  assert.equal(result.provider, 'OPENAI');
  assert.equal(ollamaCalled, false, 'Ollama was called despite being removed from provider order');
});

test('AiProviderManager - Total Failover to StaticFallbackProvider when Gemini and OpenAI fail', async () => {
  const mockConfig = createMockConfig('GEMINI,OPENAI,STATIC');

  const failingProvider = (name) => ({
    name,
    isAvailable: async () => true,
    classifyIntent: async () => { throw new Error(`${name} 503 unavailable`); },
    recoverConversation: async () => { throw new Error('503'); },
    classifyMedia: async () => { throw new Error('503'); },
  });

  const staticFallback = new StaticFallbackProvider();

  const manager = new AiProviderManager(
    mockConfig,
    failingProvider('GEMINI'),
    failingProvider('OPENAI'),
    failingProvider('OLLAMA'),
    staticFallback,
  );

  const result = await manager.classifyIntent({
    message: 'mensagem desconhecida em caso de pane total',
  });

  assert.equal(result.provider, 'STATIC');
  assert.equal(result.intent, IntentEnum.DESCONHECIDA);
  assert.equal(result.confidence, 0);
  assert.equal(result.suggestedAction, SuggestedActionEnum.REDISPLAY_MENU);
});

test('AiProviderManager - Global deadline trips when time is exceeded', async () => {
  const mockConfig = createMockConfig('GEMINI,OPENAI,STATIC', '0', '-100'); // Expired deadline

  const mockGemini = {
    name: 'GEMINI',
    isAvailable: async () => true,
    classifyIntent: async () => { throw new Error('Should not be executed if deadline expired'); },
    recoverConversation: async () => ({}),
    classifyMedia: async () => ({}),
  };

  const staticFallback = new StaticFallbackProvider();
  const manager = new AiProviderManager(mockConfig, mockGemini, mockGemini, mockGemini, staticFallback);

  const res = await manager.classifyIntent({ message: 'teste de deadline' });
  assert.equal(res.provider, 'STATIC');
});
