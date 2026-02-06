import { Injectable } from '@nestjs/common';
import { BrandingRepository } from './branding.repository';
import { BrandingResponseDto } from './dto/branding-response.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';

const DEFAULT_BRANDING = {
  app_name: 'LibreStock',
  tagline: 'Inventory management system',
  logo_url: null,
  favicon_url: null,
  primary_color: '#3b82f6',
};

const POWERED_BY = {
  name: 'LibreStock',
  url: 'https://github.com/maximilianpw/librestock',
};

@Injectable()
export class BrandingService {
  constructor(private readonly repository: BrandingRepository) {}

  async get(): Promise<BrandingResponseDto> {
    const settings = await this.repository.get();

    if (!settings) {
      return {
        ...DEFAULT_BRANDING,
        powered_by: POWERED_BY,
        updated_at: new Date(),
      };
    }

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

  async update(dto: UpdateBrandingDto, userId: string): Promise<BrandingResponseDto> {
    await this.repository.upsert({
      ...dto,
      updated_by: userId,
    });

    return this.get();
  }
}
