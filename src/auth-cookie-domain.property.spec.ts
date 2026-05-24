import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  deriveSharedCookieDomain,
  getCrossSubDomainCookieConfig,
} from './auth-cookie-domain';

const letters = [...'abcdefghijklmnopqrstuvwxyz'];
const labelChars = [...'abcdefghijklmnopqrstuvwxyz0123456789'];

const labelArbitrary = fc
  .tuple(
    fc.constantFrom(...letters),
    fc.array(fc.constantFrom(...labelChars), { maxLength: 8 }),
  )
  .map(([first, rest]) => `${first}${rest.join('')}`);

const domainArbitrary = fc
  .tuple(labelArbitrary, labelArbitrary)
  .map(([name, tld]) => `${name}.${tld}`);

describe('cross-subdomain cookie config properties', () => {
  it('normalizes explicit cookie domains without consulting derived origins', () => {
    fc.assert(
      fc.property(
        domainArbitrary,
        fc.integer({ min: 0, max: 3 }),
        (domain, dots) => {
          const explicitDomain = `${'.'.repeat(dots)}${domain.toUpperCase()}`;

          expect(
            getCrossSubDomainCookieConfig({
              authBaseUrl: undefined,
              frontendOrigins: [],
              cookieDomain: explicitDomain,
            }),
          ).toEqual({ enabled: true, domain });
        },
      ),
    );
  });

  it('derives the shared parent domain for sibling subdomains', () => {
    fc.assert(
      fc.property(domainArbitrary, (baseDomain) => {
        expect(
          deriveSharedCookieDomain(`https://auth.${baseDomain}`, [
            `https://app.${baseDomain}`,
          ]),
        ).toBe(baseDomain);
      }),
    );
  });

  it('only derives domains that are suffixes of both shareable hosts', () => {
    fc.assert(
      fc.property(
        domainArbitrary,
        labelArbitrary,
        labelArbitrary,
        (baseDomain, authLabel, appLabel) => {
          const authHost = `${authLabel}.${baseDomain}`;
          const appHost = `${appLabel}.${baseDomain}`;
          const derived = deriveSharedCookieDomain(`https://${authHost}`, [
            `https://${appHost}:3000`,
          ]);

          expect(derived).toBeDefined();
          expect(authHost.endsWith(derived as string)).toBe(true);
          expect(appHost.endsWith(derived as string)).toBe(true);
          expect((derived as string).split('.').length).toBeGreaterThanOrEqual(
            2,
          );
        },
      ),
    );
  });

  it('does not derive a domain for localhost, IPs, or unrelated hosts', () => {
    expect(
      deriveSharedCookieDomain('http://localhost:3000', [
        'http://app.localhost:5173',
      ]),
    ).toBeUndefined();
    expect(
      deriveSharedCookieDomain('http://127.0.0.1:3000', [
        'http://127.0.0.1:5173',
      ]),
    ).toBeUndefined();
    expect(
      deriveSharedCookieDomain('https://auth.example.com', [
        'https://app.example.org',
      ]),
    ).toBeUndefined();
  });
});
