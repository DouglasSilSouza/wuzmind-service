import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiKeyGuard } from '../../dist/modules/common/auth/api-key.guard.js';

test('ApiKeyGuard - Validates x-wuzmind-api-key header', () => {
  const mockConfig = {
    get: (key) => (key === 'WUZMIND_API_KEY' ? 'valid_super_secret_key' : null),
  };

  const mockReflector = {
    getAllAndOverride: () => false,
  };

  const guard = new ApiKeyGuard(mockConfig, mockReflector);

  const makeContext = (headers) => ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  });

  assert.throws(() => {
    guard.canActivate(makeContext({}));
  }, /Invalid or missing x-wuzmind-api-key/);

  assert.throws(() => {
    guard.canActivate(makeContext({ 'x-wuzmind-api-key': 'wrong_key' }));
  }, /Invalid or missing x-wuzmind-api-key/);

  const validResult = guard.canActivate(makeContext({ 'x-wuzmind-api-key': 'valid_super_secret_key' }));
  assert.equal(validResult, true);
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
