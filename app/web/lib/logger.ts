import pino, { type Logger } from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  redact: {
    paths: ['meta.query', 'meta.content', 'meta.email', '*.password'],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export type ServiceName =
  | 'api-upload'
  | 'api-documents'
  | 'api-chat'
  | 'api-webhook-clerk';

export interface RequestContext {
  service: ServiceName;
  traceId: string;
  userId: string;
}

export function requestLogger(ctx: RequestContext): Logger {
  return logger.child(ctx);
}

export async function timed<T>(
  log: Logger,
  event: string,
  meta: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  log.info({ event: `${event}.start`, meta }, `${event}.start`);
  try {
    const result = await fn();
    log.info(
      {
        event: `${event}.complete`,
        durationMs: Math.round(performance.now() - start),
        meta,
      },
      `${event}.complete`,
    );
    return result;
  } catch (err) {
    log.error(
      {
        event: `${event}.error`,
        durationMs: Math.round(performance.now() - start),
        meta,
        err: serializeError(err),
      },
      `${event}.error`,
    );
    throw err;
  }
}

export function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      message: err.message,
      name: err.name,
      stack: err.stack,
      ...('code' in err && typeof err.code === 'string' ? { code: err.code } : {}),
      ...('retryable' in err && typeof err.retryable === 'boolean'
        ? { retryable: err.retryable }
        : {}),
    };
  }
  return { message: String(err) };
}

export const ANON_USER = 'anonymous';
