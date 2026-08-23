export class PromptInjectionGuard {
  private static readonly INJECTION_PATTERNS: RegExp[] = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
    /system\s*prompt/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /update\s+[a-z0-9_]+\s+set/i,
    /insert\s+into/i,
    /<script[\s>]/i,
    /javascript:/i,
    /execute\s+sql/i,
    /format\s+drive/i,
    /alter\s+table/i,
  ];

  static containsInjection(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    return this.INJECTION_PATTERNS.some((pattern) => pattern.test(text));
  }

  static sanitize(text: string): string {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/[<>\0]/g, '').trim();
  }
}
