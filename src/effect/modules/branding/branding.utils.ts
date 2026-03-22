import type { BrandingResponseDto } from '@librestock/types/branding';
import type { brandingSettings } from '../../platform/db/schema';
import { POWERED_BY } from './branding.constants';

type BrandingSettings = typeof brandingSettings.$inferSelect;

export function toBrandingResponse(
  settings: BrandingSettings,
): BrandingResponseDto {
  return {
    app_name: settings.app_name,
    tagline: settings.tagline,
    logo_url: settings.logo_url,
    favicon_url: settings.favicon_url,
    primary_color: settings.primary_color,
    powered_by: POWERED_BY,
    updated_at: settings.updated_at,
  };
}
