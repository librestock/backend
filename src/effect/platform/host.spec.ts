import { HttpServerRequest } from '@effect/platform';
import { describe, expect, it } from 'vitest';
import {
  getTenantSlugFromHost,
  hostnameForTenantSlug,
  isAllowedPlatformOrTenantOrigin,
  isPlatformHost,
  isTenantSubdomain,
  normalizeHost,
  resolveRequestHost,
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

  it('falls back to the original request URL host when no Host header is present', () => {
    const request = HttpServerRequest.fromWeb(
      new Request('https://tenant.librestock.maximilian.pw/api/v1/branding'),
    );

    expect(resolveRequestHost(request)).toBe('tenant.librestock.maximilian.pw');
  });

  it('prefers the Host header over the original request URL host', () => {
    const request = HttpServerRequest.fromWeb(
      new Request('https://ignored.example.com/api/v1/branding', {
        headers: { host: 'tenant.librestock.maximilian.pw' },
      }),
    );

    expect(resolveRequestHost(request)).toBe('tenant.librestock.maximilian.pw');
  });

  it('trusts x-forwarded-host only from trusted remote addresses', () => {
    const request = HttpServerRequest.fromWeb(
      new Request('https://ignored.example.com/api/v1/branding', {
        headers: {
          host: 'tenant.librestock.maximilian.pw',
          'x-forwarded-host': 'forwarded.librestock.maximilian.pw',
        },
      }),
    );

    expect(
      resolveRequestHost(request.modify({ remoteAddress: '127.0.0.1' })),
    ).toBe('forwarded.librestock.maximilian.pw');
    expect(
      resolveRequestHost(request.modify({ remoteAddress: '203.0.113.10' })),
    ).toBe('tenant.librestock.maximilian.pw');
  });

  it('falls back to Host when a trusted forwarded host is invalid', () => {
    const request = HttpServerRequest.fromWeb(
      new Request('https://ignored.example.com/api/v1/branding', {
        headers: {
          host: 'tenant.librestock.maximilian.pw',
          'x-forwarded-host': '',
        },
      }),
    );

    expect(
      resolveRequestHost(request.modify({ remoteAddress: '127.0.0.1' })),
    ).toBe('tenant.librestock.maximilian.pw');
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
