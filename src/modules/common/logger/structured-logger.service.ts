import { Injectable, LoggerService } from '@nestjs/common';

const SENSITIVE_PATTERNS = [
  /api[-_]?key/i,
  /token/i,
  /password/i,
  /secret/i,
  /authorization/i,
  /x-wuzmind-api-key/i,
  /cookie/i,
  /bearer/i,
];

@Injectable()
export class StructuredLoggerService implements LoggerService {
  private contextName: string;

  constructor(context?: string) {
    this.contextName = context || 'WuzMind';
  }

  setContext(context: string) {
    this.contextName = context;
  }

  public redact(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
      let redacted = obj;
      for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.test(redacted)) {
          redacted = redacted.replace(/(["']?[a-zA-Z0-9_-]*(?:api[-_]?key|token|password|secret|authorization|key)["']?\s*[:=]\s*["']?)([^"'\s,}{]+)(["']?)/gi, '$1[REDACTED]$3');
        }
      }
      return redacted;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.redact(item));
    }
    if (typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const isSensitive = SENSITIVE_PATTERNS.some((p) => p.test(key));
        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.redact(value);
        }
      }
      return sanitized;
    }
    return obj;
  }

  private formatMessage(level: string, message: unknown, context?: string, meta?: unknown) {
    const timestamp = new Date().toISOString();
    const activeContext = context || this.contextName;
    const sanitizedMsg = this.redact(message);
    const sanitizedMeta = meta ? this.redact(meta) : undefined;

    const payload: Record<string, unknown> = {
      timestamp,
      level,
      context: activeContext,
      message: sanitizedMsg,
    };
    if (sanitizedMeta !== undefined) {
      payload.meta = sanitizedMeta;
    }
    return JSON.stringify(payload);
  }

  log(message: unknown, context?: string) {
    console.log(this.formatMessage('INFO', message, context));
  }

  error(message: unknown, trace?: string, context?: string) {
    console.error(this.formatMessage('ERROR', message, context, { trace }));
  }

  warn(message: unknown, context?: string) {
    console.warn(this.formatMessage('WARN', message, context));
  }

  debug(message: unknown, context?: string) {
    if (process.env.LOG_LEVEL === 'debug') {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  verbose(message: unknown, context?: string) {
    if (process.env.LOG_LEVEL === 'verbose' || process.env.LOG_LEVEL === 'debug') {
      console.log(this.formatMessage('VERBOSE', message, context));
    }
  }
}
