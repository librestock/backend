import { describe, expect, it } from 'vitest';
import {
  getTenantSlugFromHost,
  hostnameForTenantSlug,
  isAllowedPlatformOrTenantOrigin,
  isPlatformHost,
  isTenantSubdomain,
  normalizeHost,
} from './host';

describe('platform host helpers', () => {
  it('normalizes host casing, ports, lists, and trailing dots', () => {
    expect(normalizeHost(' Default.LibreStock.Maximilian.PW:443. ')).toBe(
      'default.librestock.maximilian.pw',
    );
    expect(normalizeHost('Tenant.Librestock.Maximilian.PW, proxy.local')).toBe(
      'tenant.librestock.maximilian.pw',
    );
  });

  it('recognizes platform hosts separately from tenant hosts', () => {
    expect(isPlatformHost('default.librestock.maximilian.pw')).toBe(true);
    expect(isPlatformHost('localhost:3000')).toBe(true);
    expect(isTenantSubdomain('default.librestock.maximilian.pw')).toBe(false);
    expect(isTenantSubdomain('localhost:3000')).toBe(false);
  });

  it('accepts exactly one DNS-safe tenant label under the base domain', () => {
    expect(getTenantSlugFromHost('tenant-1.librestock.maximilian.pw')).toBe(
      'tenant-1',
    );
    expect(getTenantSlugFromHost('tenant-1.localhost:3000')).toBe('tenant-1');
    expect(isTenantSubdomain('nested.tenant.librestock.maximilian.pw')).toBe(
      false,
    );
    expect(isTenantSubdomain('librestock.maximilian.pw')).toBe(false);
    expect(isTenantSubdomain('Tenant.librestock.maximilian.pw')).toBe(true);
  });

  it('rejects reserved tenant slugs', () => {
    expect(getTenantSlugFromHost('admin.librestock.maximilian.pw')).toBeNull();
    expect(
      getTenantSlugFromHost('superadmin.librestock.maximilian.pw'),
    ).toBeNull();
  });

  it('builds tenant hostnames from the runtime primary base domain', () => {
    expect(hostnameForTenantSlug('tenant-1')).toBe('tenant-1.localhost');
  });

  it('validates same-origin platform and tenant origins', () => {
    expect(
      isAllowedPlatformOrTenantOrigin(
        'https://default.librestock.maximilian.pw',
      ),
    ).toBe(true);
    expect(
      isAllowedPlatformOrTenantOrigin('https://tenant.librestock.maximilian.pw'),
    ).toBe(true);
    expect(isAllowedPlatformOrTenantOrigin('https://example.com')).toBe(false);
  });
});
