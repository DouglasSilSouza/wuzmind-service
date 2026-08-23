import test from 'node:test';
import assert from 'node:assert/strict';
import { AiProviderManager } from '../../dist/modules/ai/ai-provider.manager.js';
import { StaticFallbackProvider } from '../../dist/modules/providers/static-fallback.provider.js';
import { IntentEnum } from '../../dist/modules/common/enums/intent.enum.js';
import { SuggestedActionEnum } from '../../dist/modules/common/enums/suggested-action.enum.js';

function createMockConfig(order = 'OLLAMA,GEMINI,OPENAI,STATIC') {
  return {
    get: (key) => {
      if (key === 'AI_PROVIDER_ORDER') return order;
      if (key === 'AI_MAX_RETRIES_PER_PROVIDER') return '1';
      if (key === 'AI_MIN_CONFIDENCE') return '0.65';
      return null;
    },
  };
}

test('AiProviderManager - Failover from Ollama to Gemini when Ollama fails', async () => {
  const mockConfig = createMockConfig('OLLAMA,GEMINI,OPENAI,STATIC');

  const mockOllama = {
    name: 'OLLAMA',
    isAvailable: async () => true,
    classifyIntent: async () => { throw new Error('Ollama connection timeout'); },
    recoverConversation: async () => { throw new Error('Ollama timeout'); },
    classifyMedia: async () => { throw new Error('Ollama timeout'); },
  };

  const mockGemini = {
    name: 'GEMINI',
    isAvailable: async () => true,
    classifyIntent: async () => ({
      intent: IntentEnum.CONSULTAR_RELATORIO,
      confidence: 0.95,
      entities: { bank: 'NUBANK' },
      suggestedAction: SuggestedActionEnum.START_TYPEBOT_FLOW,
      targetFlow: 'RELATORIOS',
      provider: 'GEMINI',
    }),
    recoverConversation: async () => ({}),
    classifyMedia: async () => ({}),
  };

  const mockOpenAi = { name: 'OPENAI', isAvailable: async () => true };
  const staticFallback = new StaticFallbackProvider();

  const manager = new AiProviderManager(
    mockConfig,
    mockOllama,
    mockGemini,
    mockOpenAi,
    staticFallback,
  );

  const result = await manager.classifyIntent({
    message: 'quanto gastei no nubank esse mês?',
  });

  assert.equal(result.provider, 'GEMINI');
  assert.equal(result.intent, IntentEnum.CONSULTAR_RELATORIO);
  assert.equal(result.confidence, 0.95);
});

test('AiProviderManager - Total Failover to StaticFallbackProvider when all AI providers fail', async () => {
  const mockConfig = createMockConfig('OLLAMA,GEMINI,OPENAI,STATIC');

  const failingProvider = (name) => ({
    name,
    isAvailable: async () => true,
    classifyIntent: async () => { throw new Error(`${name} service unavailable 503`); },
    recoverConversation: async () => { throw new Error(`${name} 503`); },
    classifyMedia: async () => { throw new Error(`${name} 503`); },
  });

  const staticFallback = new StaticFallbackProvider();

  const manager = new AiProviderManager(
    mockConfig,
    failingProvider('OLLAMA'),
    failingProvider('GEMINI'),
    failingProvider('OPENAI'),
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

test('AiProviderManager - Circuit breaker trips after consecutive failures', async () => {
  const mockConfig = createMockConfig('OLLAMA,STATIC');
  let ollamaCallCount = 0;

  const flakyOllama = {
    name: 'OLLAMA',
    isAvailable: async () => true,
    classifyIntent: async () => {
      ollamaCallCount++;
      throw new Error('Connection refused');
    },
    recoverConversation: async () => { throw new Error('Refused'); },
    classifyMedia: async () => { throw new Error('Refused'); },
  };

  const staticFallback = new StaticFallbackProvider();
  const manager = new AiProviderManager(mockConfig, flakyOllama, flakyOllama, flakyOllama, staticFallback);

  // Calls 1, 2, 3 fail, incrementing consecutive failures to 3 and tripping the circuit breaker
  await manager.classifyIntent({ message: 'msg 1' });
  await manager.classifyIntent({ message: 'msg 2' });
  await manager.classifyIntent({ message: 'msg 3' });

  const callsBeforeCircuitOpen = ollamaCallCount;

  // Call 4 should skip Ollama immediately due to open circuit
  const res4 = await manager.classifyIntent({ message: 'msg 4' });
  assert.equal(res4.provider, 'STATIC');
  assert.equal(ollamaCallCount, callsBeforeCircuitOpen, 'Ollama should have been skipped by circuit breaker');
});
