import test from 'node:test';
import assert from 'node:assert/strict';
import { StructuredLoggerService } from '../../dist/modules/common/logger/structured-logger.service.js';

test('StructuredLoggerService - Redact sensitive credentials in objects and strings', () => {
  const logger = new StructuredLoggerService('TestContext');

  const sensitiveObj = {
    apiKey: 'secret_12345',
    token: 'jwt_abc_xyz',
    password: 'supersecretpass',
    phone: '5511999999999',
    safeField: 'normal value',
  };

  const redacted = logger.redact(sensitiveObj);
  assert.equal(redacted.apiKey, '[REDACTED]');
  assert.equal(redacted.token, '[REDACTED]');
  assert.equal(redacted.password, '[REDACTED]');
  assert.equal(redacted.safeField, 'normal value');
  assert.equal(redacted.phone, '5511999999999');
});
