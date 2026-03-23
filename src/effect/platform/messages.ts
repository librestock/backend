import { Effect } from 'effect';

export type MessageArgs = Record<string, unknown>;

export interface LogEntry {
  readonly messageKey: string;
  readonly message?: string;
  readonly messageArgs?: MessageArgs;
}

export interface TranslatableMessage {
  readonly message: string;
  readonly messageKey: string;
  readonly messageArgs?: MessageArgs;
}

const OMITTED_ERROR_FIELDS = new Set([
  '_tag',
  'name',
  'message',
  'messageKey',
  'statusCode',
  'code',
  'stack',
]);

const toCamelCase = (value: string) =>
  value.replace(/[\s_-]+([\dA-Za-z])/g, (_: string, char: string) =>
    char.toUpperCase(),
  );

export const toMessageKey = (scope: string, key: string) => {
  const normalized = toCamelCase(key);
  return `${scope}.${normalized.charAt(0).toLowerCase()}${normalized.slice(1)}`;
};

export const extractMessageArgs = (value: unknown): MessageArgs | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const entries = Object.entries(value).filter(
    ([key]) => !OMITTED_ERROR_FIELDS.has(key),
  );
  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
};

export const makeMessageResponse = (
  messageKey: string,
  message: string,
  messageArgs?: MessageArgs,
): TranslatableMessage => ({
  message,
  messageKey,
  ...(messageArgs ? { messageArgs } : {}),
});

class Logger {
  private readonly scope: string;

  constructor(scope: string) {
    this.scope = scope;
  }

  private logWithKey(
    level: 'info' | 'warn' | 'error' | 'debug',
    messageKey: string,
    args?: MessageArgs,
  ): Effect.Effect<void> {
    const payload = {
      messageKey: `${this.scope}.${messageKey}`,
      ...args,
    };

    switch (level) {
      case 'error':
        return Effect.logError(payload);
      case 'warn':
        return Effect.logWarning(payload);
      case 'debug':
        return Effect.logDebug(payload);
      default:
        return Effect.log(payload);
    }
  }

  info(messageKey: string, args?: MessageArgs): Effect.Effect<void> {
    return this.logWithKey('info', messageKey, args);
  }

  warn(messageKey: string, args?: MessageArgs): Effect.Effect<void> {
    return this.logWithKey('warn', messageKey, args);
  }

  error(messageKey: string, args?: MessageArgs): Effect.Effect<void> {
    return this.logWithKey('error', messageKey, args);
  }

  debug(messageKey: string, args?: MessageArgs): Effect.Effect<void> {
    return this.logWithKey('debug', messageKey, args);
  }

  log(messageKey: string, args?: MessageArgs): Effect.Effect<void> {
    return this.logWithKey('info', messageKey, args);
  }
}

export const createLogger = (scope: string): Logger => new Logger(scope);
