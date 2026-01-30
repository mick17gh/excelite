import type { ValidationResult } from '../types';

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(previous|above|all|prior)\s+instructions/i,
  /disregard\s+.*\s+instructions/i,
  /you\s+are\s+now\s+/i,
  /pretend\s+(you|to\s+be)/i,
  /act\s+as\s+(if|a)/i,
  /forget\s+(everything|all|your)/i,
  /new\s+instructions?:/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /<\|system\|>/i,
  /###\s*(system|instruction)/i,
  /do\s+not\s+follow\s+/i,
  /override\s+(your|the)\s+/i,
];

const SQL_INJECTION_PATTERNS: RegExp[] = [
  /;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|CREATE|GRANT)/i,
  /UNION\s+(ALL\s+)?SELECT/i,
  /--\s*$/m,
  /\/\*[\s\S]*?\*\//,
  /'\s*OR\s+'?1'?\s*=\s*'?1/i,
  /'\s*OR\s+''='/i,
  /EXEC(\s+|\()/i,
  /xp_cmdshell/i,
];

const SENSITIVE_DATA_PATTERNS: RegExp[] = [
  /password/i,
  /api[_\s]?key/i,
  /secret/i,
  /access[_\s]?token/i,
  /refresh[_\s]?token/i,
  /private[_\s]?key/i,
  /credential/i,
];

const MAX_INPUT_LENGTH = 2000;
const MAX_WORDS = 500;

export class InputGuardrails {
  validate(input: string): ValidationResult {
    // Length check
    if (input.length > MAX_INPUT_LENGTH) {
      return {
        valid: false,
        reason: 'Input exceeds maximum length',
        blocked: true,
      };
    }

    const wordCount = input.split(/\s+/).length;
    if (wordCount > MAX_WORDS) {
      return {
        valid: false,
        reason: 'Input exceeds maximum word count',
        blocked: true,
      };
    }

    // Prompt injection check
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        return {
          valid: false,
          reason: 'Potential prompt injection detected',
          blocked: true,
        };
      }
    }

    // SQL injection check
    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        return {
          valid: false,
          reason: 'Potential SQL injection detected',
          blocked: true,
        };
      }
    }

    // Sanitize the input
    const sanitizedInput = this.sanitize(input);

    return {
      valid: true,
      blocked: false,
      sanitizedInput,
    };
  }

  private sanitize(input: string): string {
    let sanitized = input;

    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Remove potential markdown injection
    sanitized = sanitized.replace(/```/g, '');

    return sanitized;
  }

  containsSensitiveRequest(input: string): boolean {
    return SENSITIVE_DATA_PATTERNS.some((pattern) => pattern.test(input));
  }
}

export class OutputGuardrails {
  sanitize(response: string): string {
    let sanitized = response;

    // Remove any accidentally leaked schema info
    sanitized = sanitized.replace(/table\s+["'`]?\w+["'`]?/gi, '[table]');
    sanitized = sanitized.replace(/column\s+["'`]?\w+["'`]?/gi, '[field]');

    // Remove SQL queries that might have leaked
    sanitized = sanitized.replace(
      /SELECT\s+[\w\s,*]+\s+FROM\s+\w+/gi,
      '[query]'
    );
    sanitized = sanitized.replace(
      /INSERT\s+INTO\s+\w+/gi,
      '[query]'
    );
    sanitized = sanitized.replace(
      /UPDATE\s+\w+\s+SET/gi,
      '[query]'
    );
    sanitized = sanitized.replace(
      /DELETE\s+FROM\s+\w+/gi,
      '[query]'
    );

    // Remove potential file paths
    sanitized = sanitized.replace(/\/[\w\/\-_.]+\.(ts|js|json|env|sql)/gi, '[file]');

    // Remove API keys or tokens that might leak
    sanitized = sanitized.replace(/sk-[a-zA-Z0-9]{20,}/g, '[api_key]');
    sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9\-_.]+/gi, 'Bearer [token]');

    return sanitized;
  }

  validateResponse(response: string): ValidationResult {
    // Check for sensitive data in response
    for (const pattern of SENSITIVE_DATA_PATTERNS) {
      if (pattern.test(response)) {
        return {
          valid: false,
          reason: 'Response may contain sensitive information',
          blocked: false, // Don't block, just flag
          sanitizedInput: this.sanitize(response),
        };
      }
    }

    return {
      valid: true,
      blocked: false,
      sanitizedInput: response,
    };
  }
}

export const inputGuardrails = new InputGuardrails();
export const outputGuardrails = new OutputGuardrails();
