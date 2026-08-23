import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiKeyGuard } from '../../dist/modules/common/auth/api-key.guard.js';

test('ApiKeyGuard - Validates API key from multiple headers', () => {
  const mockConfig = {
    get: (key) => (key === 'WUZMIND_API_KEY' ? 'valid_super_secret_key' : null),
  };

  const mockReflector = {
    getAllAndOverride: () => false,
  };

  const guard = new ApiKeyGuard(mockConfig, mockReflector);

  const makeContext = (headers, query = {}) => ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ headers, query, method: 'POST', url: '/v1/recovery' }),
    }),
  });

  assert.throws(() => {
    guard.canActivate(makeContext({}));
  }, /Invalid or missing API key/);

  assert.throws(() => {
    guard.canActivate(makeContext({ 'x-wuzmind-api-key': 'wrong_key' }));
  }, /Invalid or missing API key/);

  // Supports x-wuzmind-api-key
  assert.equal(guard.canActivate(makeContext({ 'x-wuzmind-api-key': 'valid_super_secret_key' })), true);

  // Supports x-api-key
  assert.equal(guard.canActivate(makeContext({ 'x-api-key': 'valid_super_secret_key' })), true);

  // Supports Authorization Bearer
  assert.equal(guard.canActivate(makeContext({ authorization: 'Bearer valid_super_secret_key' })), true);

  // Supports query parameter
  assert.equal(guard.canActivate(makeContext({}, { apiKey: 'valid_super_secret_key' })), true);
});

test('ApiKeyGuard - Allows Public endpoints without key', () => {
  const mockConfig = { get: () => 'valid_key' };
  const mockReflector = { getAllAndOverride: () => true };

  const guard = new ApiKeyGuard(mockConfig, mockReflector);
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
  };

  assert.equal(guard.canActivate(context), true);
});
