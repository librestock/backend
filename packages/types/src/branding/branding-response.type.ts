import type { PoweredByDto } from './powered-by.type'

export interface BrandingResponseDto {
  app_name: string
  tagline: string
  logo_url: string | null
  favicon_url: string | null
  primary_color: string
  powered_by: PoweredByDto
  updated_at: string | Date
}
