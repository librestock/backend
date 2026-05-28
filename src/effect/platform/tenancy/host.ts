import type * as HttpServerRequest from '@effect/platform/HttpServerRequest';
import { Option } from 'effect';
import { isValidTenantSlug } from '@stocket/types/common';

export { isValidTenantSlug } from '@stocket/types/common';

const DEFAULT_PRODUCTION_TENANT_BASE_DOMAIN = 'librestock.maximilian.pw';
const PRODUCTION_PLATFORM_SUBDOMAIN = 'default';
const LOCAL_PLATFORM_HOST = 'localhost';
const LOCAL_TENANT_BASE_DOMAIN = 'localhost';
const LOCAL_TENANT_PORT = '3000';
const DEFAULT_RESERVED_TENANT_SLUGS = [
  'default',
  'api',
  'deploy',
  'www',
  'admin',
  'superadmin',
  'auth',
  'assets',
] as const;

const splitListHeader = (value: string) => value.split(',')[0]?.trim() ?? '';

const stripPort = (host: string) => {
  if (host.startsWith('[')) {
    const closingBracketIndex = host.indexOf(']');
    return closingBracketIndex >= 0 ? host.slice(1, closingBracketIndex) : host;
  }

  const colonCount = (host.match(/:/g) ?? []).length;
  if (colonCount === 1) {
    return host.slice(0, host.indexOf(':'));
  }

  return host;
};

const parseReservedTenantSlugs = () =>
  new Set(
    (process.env.RESERVED_TENANT_SLUGS ?? DEFAULT_RESERVED_TENANT_SLUGS.join(','))
      .split(',')
      .map((slug) => slug.trim().toLowerCase())
      .filter(Boolean),
  );

export const normalizeHost = (value: string | null | undefined) => {
  const raw = value ? splitListHeader(value) : '';
  if (!raw) return null;

  const normalized = stripPort(raw).trim().toLowerCase().replace(/\.+$/, '');
  return normalized.length > 0 ? normalized : null;
};

const isProductionRuntime = () => process.env.NODE_ENV === 'production';

export const getProductionTenantBaseDomain = () =>
  normalizeHost(process.env.TENANT_BASE_DOMAIN) ??
  DEFAULT_PRODUCTION_TENANT_BASE_DOMAIN;

export const getProductionPlatformHost = () =>
  `${PRODUCTION_PLATFORM_SUBDOMAIN}.${getProductionTenantBaseDomain()}`;

const getPlatformHosts = () =>
  new Set([
    getProductionPlatformHost(),
    ...(isProductionRuntime() ? [] : [LOCAL_PLATFORM_HOST]),
  ]);

const getPrimaryTenantBaseDomain = () =>
  isProductionRuntime()
    ? getProductionTenantBaseDomain()
    : LOCAL_TENANT_BASE_DOMAIN;

const getTenantBaseDomains = () =>
  new Set([
    getProductionTenantBaseDomain(),
    ...(isProductionRuntime() ? [] : [LOCAL_TENANT_BASE_DOMAIN]),
  ]);

const getReservedTenantSlugs = () => parseReservedTenantSlugs();

export const isReservedTenantSlug = (slug: string) =>
  getReservedTenantSlugs().has(slug.toLowerCase());

const normalizeRemoteAddress = (remoteAddress: unknown) => {
  if (!remoteAddress) return null;
  const value = String(remoteAddress).trim().toLowerCase();
  if (value.startsWith('::ffff:')) return value.slice('::ffff:'.length);
  return value;
};

export const isTrustedForwardedHostSource = (remoteAddress: unknown) => {
  const normalized = normalizeRemoteAddress(remoteAddress);
  return (
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === 'localhost'
  );
};

const hostFromUrl = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};

export const resolveRequestHost = (
  request: HttpServerRequest.HttpServerRequest,
) => {
  const forwardedHost = request.headers['x-forwarded-host'];
  const remoteAddress = Option.getOrNull(request.remoteAddress);

  if (
    typeof forwardedHost === 'string' &&
    isTrustedForwardedHostSource(remoteAddress)
  ) {
    const normalizedForwardedHost = normalizeHost(forwardedHost);
    if (normalizedForwardedHost) return normalizedForwardedHost;
  }

  return normalizeHost(request.headers.host ?? hostFromUrl(request.originalUrl));
};

export const isPlatformHost = (host: string | null | undefined) => {
  const normalizedHost = normalizeHost(host);
  return normalizedHost ? getPlatformHosts().has(normalizedHost) : false;
};

export const getTenantSlugFromHost = (host: string | null | undefined) => {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost || isPlatformHost(normalizedHost)) return null;

  for (const tenantBaseDomain of getTenantBaseDomains()) {
    const suffix = `.${tenantBaseDomain}`;
    if (!normalizedHost.endsWith(suffix)) continue;

    const slug = normalizedHost.slice(0, -suffix.length);
    if (!slug || slug.includes('.')) return null;
    if (!isValidTenantSlug(slug)) return null;
    if (isReservedTenantSlug(slug)) return null;

    return slug;
  }

  return null;
};

export const isTenantSubdomain = (host: string | null | undefined) =>
  getTenantSlugFromHost(host) !== null;

export const hostnameForTenantSlug = (slug: string) =>
  isProductionRuntime()
    ? `${slug.toLowerCase()}.${getPrimaryTenantBaseDomain()}`
    : `${slug.toLowerCase()}.${getPrimaryTenantBaseDomain()}:${LOCAL_TENANT_PORT}`;

export const isAllowedPlatformOrTenantHost = (
  host: string | null | undefined,
) => isPlatformHost(host) || isTenantSubdomain(host);

export const isAllowedPlatformOrTenantOrigin = (
  origin: string | null | undefined,
) => {
  if (!origin) return false;

  try {
    return isAllowedPlatformOrTenantHost(new URL(origin).host);
  } catch {
    return false;
  }
};
