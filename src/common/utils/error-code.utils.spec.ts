import { ErrorCode } from '@librestock/types/common'
import {
  extractErrorCodeFromResponse,
  inferErrorCodeFromMessage,
  resolveErrorCode,
} from './error-code.utils';

describe('error-code utils', () => {
  describe('extractErrorCodeFromResponse', () => {
    it('returns explicit code when response payload includes a valid code', () => {
      expect(
        extractErrorCodeFromResponse({
          code: ErrorCode.PRODUCT_NOT_FOUND,
          message: 'Product not found',
        }),
      ).toBe(ErrorCode.PRODUCT_NOT_FOUND);
    });

    it('returns undefined when payload code is invalid', () => {
      expect(
        extractErrorCodeFromResponse({
          code: 'NOT_A_REAL_CODE',
          message: 'Oops',
        }),
      ).toBeUndefined();
    });
  });

  describe('inferErrorCodeFromMessage', () => {
    it('maps known business messages to domain-specific codes', () => {
      expect(
        inferErrorCodeFromMessage(
          'Quantity adjustment failed. The resulting quantity would be negative.',
        ),
      ).toBe(ErrorCode.INVENTORY_NEGATIVE_QUANTITY);
    });

    it('returns undefined for unknown message patterns', () => {
      expect(inferErrorCodeFromMessage('Some random message')).toBeUndefined();
    });
  });

  describe('resolveErrorCode', () => {
    it('prefers explicit exception payload code over inferred/default mappings', () => {
      expect(
        resolveErrorCode(
          400,
          { code: ErrorCode.PRODUCT_SKU_DUPLICATE },
          'A product with this SKU already exists',
        ),
      ).toBe(ErrorCode.PRODUCT_SKU_DUPLICATE);
    });

    it('falls back to status defaults when message has no known pattern', () => {
      expect(resolveErrorCode(403, {}, 'Forbidden')).toBe(ErrorCode.FORBIDDEN);
      expect(resolveErrorCode(500, null, 'Unexpected crash')).toBe(
        ErrorCode.INTERNAL_SERVER_ERROR,
      );
    });
  });
});
