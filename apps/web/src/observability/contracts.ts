export interface Logger {
  debug: (obj: unknown, msg?: string) => void;
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
  child: (bindings: Record<string, unknown>) => Logger;
}

export interface ErrorReporter {
  captureException: (error: unknown, context?: Record<string, unknown>) => void | Promise<void>;
}

export type RequestContext = {
  requestId: string;
  method?: string;
  pathname?: string;
  actorId?: string | null;
};

export type HealthCheckResult = {
  name: string;
  status: 'pass' | 'fail';
  detail?: string;
  metadata?: Record<string, unknown>;
};

export interface HealthCheck {
  name: string;
  check: () => Promise<HealthCheckResult> | HealthCheckResult;
}
