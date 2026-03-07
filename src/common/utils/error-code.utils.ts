import { ErrorCode } from '@librestock/types/common'

const ERROR_CODE_VALUES = new Set<string>(Object.values(ErrorCode));

const DEFAULT_STATUS_ERROR_CODES: Record<number, ErrorCode> = {
  400: ErrorCode.BAD_REQUEST,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  429: ErrorCode.RATE_LIMIT_EXCEEDED,
  500: ErrorCode.INTERNAL_SERVER_ERROR,
};

const MESSAGE_ERROR_CODE_PATTERNS: ReadonlyArray<readonly [RegExp, ErrorCode]> = [
  [/a product with this sku already exists/i, ErrorCode.PRODUCT_SKU_DUPLICATE],
  [/product not found/i, ErrorCode.PRODUCT_NOT_FOUND],
  [/quantity adjustment.*negative/i, ErrorCode.INVENTORY_NEGATIVE_QUANTITY],
  [/inventory for this product at .*already exists/i, ErrorCode.INVENTORY_DUPLICATE_LOCATION],
  [/cannot transition from /i, ErrorCode.ORDER_INVALID_TRANSITION],
  [/insufficient permissions/i, ErrorCode.PERMISSION_DENIED],
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && ERROR_CODE_VALUES.has(value);
}

export function extractErrorCodeFromResponse(response: unknown): ErrorCode | undefined {
  if (!isRecord(response)) {
    return undefined;
  }

  const code = response.code;
  if (isErrorCode(code)) {
    return code;
  }

  return undefined;
}

export function inferErrorCodeFromMessage(message: string): ErrorCode | undefined {
  for (const [pattern, code] of MESSAGE_ERROR_CODE_PATTERNS) {
    if (pattern.test(message)) {
      return code;
    }
  }

  return undefined;
}

export function resolveErrorCode(
  status: number,
  exceptionResponse: unknown,
  message: string,
): ErrorCode {
  const explicitCode = extractErrorCodeFromResponse(exceptionResponse);
  if (explicitCode) {
    return explicitCode;
  }

  const inferredCode = inferErrorCodeFromMessage(message);
  if (inferredCode) {
    return inferredCode;
  }

  return DEFAULT_STATUS_ERROR_CODES[status] ?? ErrorCode.INTERNAL_SERVER_ERROR;
}
