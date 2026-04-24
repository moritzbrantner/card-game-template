import pino from 'pino';

import type { LevelWithSilent } from 'pino';

import { getEnv } from '@/src/config/env';
import type { ErrorReporter, Logger } from '@/src/observability/contracts';
import { getRequestContext } from '@/src/observability/request-context';

let baseLoggerInstance: pino.Logger | null = null;

function resolveLogLevel(): LevelWithSilent {
  try {
    return getEnv().observability.logLevel;
  } catch {
    return 'debug';
  }
}

function getBaseLogger() {
  if (!baseLoggerInstance) {
    baseLoggerInstance = pino({
      level: resolveLogLevel(),
      base: undefined,
      timestamp: pino.stdTimeFunctions.isoTime,
    });
  }

  return baseLoggerInstance;
}

function asLogger(loggerInstance: pino.Logger): Logger {
  return {
    debug: (obj, msg) => loggerInstance.debug(obj, msg),
    info: (obj, msg) => loggerInstance.info(obj, msg),
    warn: (obj, msg) => loggerInstance.warn(obj, msg),
    error: (obj, msg) => loggerInstance.error(obj, msg),
    child: (bindings) => asLogger(loggerInstance.child(bindings)),
  };
}

export const logger = {
  debug: (obj: unknown, msg?: string) => getBaseLogger().debug(obj, msg),
  info: (obj: unknown, msg?: string) => getBaseLogger().info(obj, msg),
  warn: (obj: unknown, msg?: string) => getBaseLogger().warn(obj, msg),
  error: (obj: unknown, msg?: string) => getBaseLogger().error(obj, msg),
  child: (bindings: Record<string, unknown>) =>
    asLogger(getBaseLogger().child(bindings)),
} satisfies Logger;

export function getLogger(bindings: Record<string, unknown> = {}): Logger {
  const requestContext = getRequestContext();

  return logger.child({
    ...(requestContext ?? {}),
    ...bindings,
  });
}

export const errorReporter: ErrorReporter = {
  captureException(error, context) {
    getLogger(context).error({ err: error }, 'Captured exception');
  },
};
