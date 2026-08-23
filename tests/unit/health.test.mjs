import test from 'node:test';
import assert from 'node:assert/strict';
import { HealthService } from '../../dist/modules/health/health.service.js';

test('HealthService - Returns correct health report structure without Ollama requirement', async () => {
  const mockConfig = {
    get: (key) => {
      if (key === 'GEMINI_API_KEY') return 'mock_gemini_key';
      if (key === 'OPENAI_API_KEY') return 'mock_openai_key';
      return null;
    },
  };

  const mockDiscovery = {
    getSelectedModel: async () => 'gemini-2.5-flash',
  };

  const mockDataSource = {
    isInitialized: true,
    query: async () => [{ '?column?': 1 }],
  };

  const healthService = new HealthService(mockConfig, mockDiscovery, mockDataSource);
  const report = await healthService.checkHealth();

  assert.equal(report.status, 'ok');
  assert.equal(report.service, 'wuzmind');
  assert.equal(report.database, 'up');
  assert.equal(report.providers.gemini.status, 'up');
  assert.equal(report.providers.gemini.selectedModel, 'gemini-2.5-flash');
  assert.equal(report.providers.openai.status, 'configured');
  assert.equal(report.providers.static.status, 'up');
  assert.equal(report.providers.ollama, undefined, 'Ollama should not be part of the operational health check');
});
