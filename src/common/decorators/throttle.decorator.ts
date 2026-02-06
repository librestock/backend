import { SetMetadata, applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/**
 * Throttle decorator presets for different endpoint sensitivity levels
 */

/**
 * Standard throttle limit for most API endpoints
 * 100 requests per minute per IP
 */
export const StandardThrottle = () => applyDecorators(Throttle({ default: { limit: 100, ttl: 60000 } }));

/**
 * Bulk operation throttle limit for resource-intensive endpoints
 * 20 requests per minute per IP
 */
export const BulkThrottle = () => applyDecorators(Throttle({ default: { limit: 20, ttl: 60000 } }));

/**
 * Authentication throttle limit for auth endpoints
 * 10 requests per minute per IP to prevent brute force
 */
export const AuthThrottle = () => applyDecorators(Throttle({ default: { limit: 10, ttl: 60000 } }));

/**
 * Skip throttling for specific endpoints (e.g., health checks)
 */
export const SkipThrottle = () => applyDecorators(SetMetadata('skipThrottle', true));
