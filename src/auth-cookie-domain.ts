import { isIP } from 'node:net';

export interface CrossSubDomainCookieConfig {
  enabled: true;
  domain: string;
}

const stripLeadingDot = (value: string): string => value.replace(/^\.+/, '');

const parseHostname = (value: string | undefined): string | undefined => {
  if (!value) return undefined;

  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return stripLeadingDot(hostname.replace(/^\[(.*)\]$/, '$1'));
  } catch {
    return undefined;
  }
};

const isShareableCookieHost = (hostname: string): boolean =>
  hostname !== 'localhost' && hostname.includes('.') && isIP(hostname) === 0;

const getSharedSuffix = (
  firstHostname: string,
  secondHostname: string,
): string | undefined => {
  if (
    !isShareableCookieHost(firstHostname) ||
    !isShareableCookieHost(secondHostname)
  ) {
    return undefined;
  }

  const firstParts = firstHostname.split('.').reverse();
  const secondParts = secondHostname.split('.').reverse();
  const sharedParts: string[] = [];

  for (let index = 0; index < firstParts.length; index += 1) {
    const firstPart = firstParts[index];
    if (!firstPart || firstPart !== secondParts[index]) break;
    sharedParts.push(firstPart);
  }

  if (sharedParts.length < 2) return undefined;
  return sharedParts.reverse().join('.');
};

export const deriveSharedCookieDomain = (
  authBaseUrl: string | undefined,
  frontendOrigins: readonly string[],
): string | undefined => {
  const authHostname = parseHostname(authBaseUrl);
  if (!authHostname) return undefined;

  for (const frontendOrigin of frontendOrigins) {
    const frontendHostname = parseHostname(frontendOrigin);
    if (!frontendHostname) continue;

    const sharedSuffix = getSharedSuffix(authHostname, frontendHostname);
    if (sharedSuffix) return sharedSuffix;
  }

  return undefined;
};

export const getCrossSubDomainCookieConfig = ({
  authBaseUrl,
  frontendOrigins,
  cookieDomain,
}: {
  authBaseUrl: string | undefined;
  frontendOrigins: readonly string[];
  cookieDomain: string | undefined;
}): CrossSubDomainCookieConfig | undefined => {
  const explicitDomain = cookieDomain?.trim();
  const domain = explicitDomain
    ? stripLeadingDot(explicitDomain.toLowerCase())
    : deriveSharedCookieDomain(authBaseUrl, frontendOrigins);

  return domain ? { enabled: true, domain } : undefined;
};
