const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 250;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryWithBackoff(fn, options = {}) {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const isRetryable = options.isRetryable ?? defaultIsRetryable;
  const label = options.label ?? 'external-call';

  let lastErr;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      if (attempt === maxRetries || !isRetryable(err)) {
        throw err;
      }

      const exponential = baseDelayMs * 2 ** attempt;
      const jitter = Math.random() * baseDelayMs;
      const delay = exponential + jitter;

      console.warn(
        `[retryWithBackoff] ${label} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms:`,
        err.message
      );

      await sleep(delay);
    }
  }

  throw lastErr;
}

function defaultIsRetryable(err) {
  const status = err.status || err.statusCode || err.response?.status;
  if (status) {
    return status === 429 || status >= 500;
  }
  return true;
}

export class CircuitBreaker {
  constructor({ failureThreshold = 5, cooldownMs = 30_000, label = 'circuit' } = {}) {
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this.label = label;
    this.failureCount = 0;
    this.state = 'closed';
    this.openedAt = null;
  }

  async execute(fn) {
    if (this.state === 'open') {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed < this.cooldownMs) {
        throw new Error(`[${this.label}] Circuit open - failing fast (retry in ${Math.round((this.cooldownMs - elapsed) / 1000)}s)`);
      }
      this.state = 'half-open';
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      throw err;
    }
  }

  _onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  _onFailure() {
    this.failureCount += 1;
    if (this.state === 'half-open' || this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      this.openedAt = Date.now();
      console.error(`[${this.label}] Circuit opened after ${this.failureCount} failures - cooling down ${this.cooldownMs}ms`);
    }
  }
}
