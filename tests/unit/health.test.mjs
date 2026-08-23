import test from 'node:test';
import assert from 'node:assert/strict';
import { HealthService } from '../../dist/modules/health/health.service.js';

test('HealthService - Returns correct health report structure', async () => {
  const mockConfig = {
    get: (key) => {
      if (key === 'OLLAMA_URL') return 'http://localhost:9999';
      if (key === 'GEMINI_API_KEY') return 'mock_gemini';
      if (key === 'OPENAI_API_KEY') return null;
      return null;
    },
  };

  const mockAiManager = {};
  const mockDataSource = {
    isInitialized: true,
    query: async () => [{ '?column?': 1 }],
  };

  const healthService = new HealthService(mockConfig, mockAiManager, mockDataSource);
  const report = await healthService.checkHealth();

  assert.equal(report.status, 'ok');
  assert.equal(report.service, 'wuzmind');
  assert.equal(report.database, 'up');
  assert.equal(report.providers.gemini, 'configured');
  assert.equal(report.providers.openai, 'not_configured');
});
