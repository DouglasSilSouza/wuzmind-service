import test from 'node:test';
import assert from 'node:assert/strict';
import { GeminiModelDiscoveryService } from '../../dist/modules/providers/gemini-model-discovery.service.js';

test('GeminiModelDiscoveryService - Discovers only models supporting generateContent', async () => {
  const mockConfig = {
    get: (key) => {
      if (key === 'GEMINI_API_KEY') return 'test_key_123';
      if (key === 'GEMINI_BASE_URL') return 'https://mock.google.api';
      if (key === 'GEMINI_MODEL_CANDIDATES') return 'gemini-2.5-flash,gemini-2.5-flash-lite';
      return null;
    },
  };

  const discovery = new GeminiModelDiscoveryService(mockConfig);

  // Mock global fetch
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.ok(url.includes('test_key_123'));
    return {
      ok: true,
      json: async () => ({
        models: [
          { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] }, // should be ignored
          { name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
        ],
      }),
    };
  };

  try {
    const models = await discovery.discoverModels(true);
    assert.deepEqual(models, ['gemini-2.5-flash', 'gemini-2.5-flash-lite']);

    const selected = await discovery.getSelectedModel();
    assert.equal(selected, 'gemini-2.5-flash');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GeminiModelDiscoveryService - GEMINI_MODEL configured but not authorized falls back to candidates', async () => {
  const mockConfig = {
    get: (key) => {
      if (key === 'GEMINI_API_KEY') return 'test_key_123';
      if (key === 'GEMINI_MODEL') return 'gemini-99.9-invalid';
      if (key === 'GEMINI_MODEL_CANDIDATES') return 'gemini-2.5-flash-lite,gemini-2.5-flash';
      return null;
    },
  };

  const discovery = new GeminiModelDiscoveryService(mockConfig);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      models: [
        { name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
      ],
    }),
  });

  try {
    const selected = await discovery.getSelectedModel();
    assert.equal(selected, 'gemini-2.5-flash-lite');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GeminiModelDiscoveryService - Invalidate cache resets selection and forces re-discovery', async () => {
  const mockConfig = {
    get: (key) => {
      if (key === 'GEMINI_API_KEY') return 'test_key_123';
      return null;
    },
  };

  const discovery = new GeminiModelDiscoveryService(mockConfig);

  let fetchCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCount++;
    return {
      ok: true,
      json: async () => ({
        models: [
          { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
        ],
      }),
    };
  };

  try {
    await discovery.getSelectedModel();
    assert.equal(fetchCount, 1);

    // Second call uses cache
    await discovery.getSelectedModel();
    assert.equal(fetchCount, 1);

    // Invalidate
    discovery.invalidateCache();
    await discovery.getSelectedModel();
    assert.equal(fetchCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
