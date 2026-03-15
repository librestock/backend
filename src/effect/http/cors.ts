import { HttpMiddleware } from '@effect/platform';

const CORS_MAX_AGE_SECONDS = 86_400;

const parseCorsOrigins = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

const createCorsMiddleware = () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';
  const origins = parseCorsOrigins(process.env.CORS_ORIGIN);

  if (isProduction && (origins.length === 0 || origins.includes('*'))) {
    throw new Error(
      'CORS_ORIGIN must be set to a specific origin in production (not "*" or empty)',
    );
  }

  if (origins.length === 0) {
    return HttpMiddleware.cors({
      allowedOrigins: (origin) =>
        typeof origin === 'string' && origin.length > 0,
      credentials: true,
      maxAge: CORS_MAX_AGE_SECONDS,
    });
  }

  if (origins.length === 1 && origins[0] === '*') {
    return HttpMiddleware.cors({
      allowedOrigins: (origin) =>
        typeof origin === 'string' && origin.length > 0,
      credentials: true,
      maxAge: CORS_MAX_AGE_SECONDS,
    });
  }

  return HttpMiddleware.cors({
    allowedOrigins: origins,
    credentials: true,
    maxAge: CORS_MAX_AGE_SECONDS,
  });
};

export const corsMiddleware = createCorsMiddleware();
