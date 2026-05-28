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
    expect(normalizeHost(' Default.Stocket.FR:443. ')).toBe(
      'default.stocket.fr',
    );
    expect(normalizeHost('Tenant.Stocket.FR, proxy.local')).toBe(
      'tenant.stocket.fr',
    );
  });

  it('recognizes platform hosts separately from tenant hosts', () => {
    expect(isPlatformHost('default.stocket.fr')).toBe(true);
    expect(isPlatformHost('localhost:3000')).toBe(true);
    expect(isTenantSubdomain('default.stocket.fr')).toBe(false);
    expect(isTenantSubdomain('localhost:3000')).toBe(false);
  });

  it('accepts exactly one DNS-safe tenant label under the base domain', () => {
    expect(getTenantSlugFromHost('tenant-1.stocket.fr')).toBe(
      'tenant-1',
    );
    expect(getTenantSlugFromHost('tenant-1.localhost:3000')).toBe('tenant-1');
    expect(isTenantSubdomain('nested.tenant.stocket.fr')).toBe(
      false,
    );
    expect(isTenantSubdomain('stocket.fr')).toBe(false);
    expect(isTenantSubdomain('Tenant.stocket.fr')).toBe(true);
  });

  it('rejects reserved tenant slugs', () => {
    expect(getTenantSlugFromHost('admin.stocket.fr')).toBeNull();
    expect(
      getTenantSlugFromHost('superadmin.stocket.fr'),
    ).toBeNull();
  });

  it('builds tenant hostnames from the runtime primary base domain', () => {
    expect(hostnameForTenantSlug('tenant-1')).toBe('tenant-1.localhost');
  });

  it('falls back to the original request URL host when no Host header is present', () => {
    const request = HttpServerRequest.fromWeb(
      new Request('https://tenant.stocket.fr/api/v1/branding'),
    );

    expect(resolveRequestHost(request)).toBe('tenant.stocket.fr');
  });

  it('prefers the Host header over the original request URL host', () => {
    const request = HttpServerRequest.fromWeb(
      new Request('https://ignored.example.com/api/v1/branding', {
        headers: { host: 'tenant.stocket.fr' },
      }),
    );

    expect(resolveRequestHost(request)).toBe('tenant.stocket.fr');
  });

  it('trusts x-forwarded-host only from trusted remote addresses', () => {
    const request = HttpServerRequest.fromWeb(
      new Request('https://ignored.example.com/api/v1/branding', {
        headers: {
          host: 'tenant.stocket.fr',
          'x-forwarded-host': 'forwarded.stocket.fr',
        },
      }),
    );

    expect(
      resolveRequestHost(request.modify({ remoteAddress: '127.0.0.1' })),
    ).toBe('forwarded.stocket.fr');
    expect(
      resolveRequestHost(request.modify({ remoteAddress: '203.0.113.10' })),
    ).toBe('tenant.stocket.fr');
  });

  it('falls back to Host when a trusted forwarded host is invalid', () => {
    const request = HttpServerRequest.fromWeb(
      new Request('https://ignored.example.com/api/v1/branding', {
        headers: {
          host: 'tenant.stocket.fr',
          'x-forwarded-host': '',
        },
      }),
    );

    expect(
      resolveRequestHost(request.modify({ remoteAddress: '127.0.0.1' })),
    ).toBe('tenant.stocket.fr');
  });

  it('validates same-origin platform and tenant origins', () => {
    expect(
      isAllowedPlatformOrTenantOrigin(
        'https://default.stocket.fr',
      ),
    ).toBe(true);
    expect(
      isAllowedPlatformOrTenantOrigin('https://tenant.stocket.fr'),
    ).toBe(true);
    expect(isAllowedPlatformOrTenantOrigin('https://example.com')).toBe(false);
  });
});
