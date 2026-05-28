import { describe, expect, it } from 'vitest';
import {
  deriveSharedCookieDomain,
  getCrossSubDomainCookieConfig,
} from './auth-cookie-domain';

describe('auth cookie domain', () => {
  it('derives the shared parent domain for sibling production subdomains', () => {
    expect(
      deriveSharedCookieDomain('https://api.stocket.fr', [
        'https://stocket.fr',
      ]),
    ).toBe('stocket.fr');
  });

  it('uses an explicit cookie domain when configured', () => {
    expect(
      getCrossSubDomainCookieConfig({
        authBaseUrl: 'https://api.example.com',
        frontendOrigins: ['https://app.example.com'],
        cookieDomain: '.example.com',
      }),
    ).toEqual({ enabled: true, domain: 'example.com' });
  });

  it('does not enable cross-subdomain cookies for localhost', () => {
    expect(
      getCrossSubDomainCookieConfig({
        authBaseUrl: 'http://localhost:4000',
        frontendOrigins: ['http://localhost:3000'],
        cookieDomain: undefined,
      }),
    ).toBeUndefined();
  });

  it('does not enable cross-subdomain cookies for unrelated hosts', () => {
    expect(
      deriveSharedCookieDomain('https://api.example.com', [
        'https://app.example.net',
      ]),
    ).toBeUndefined();
  });
});
