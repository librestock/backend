import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrandingResponseDto } from './dto/branding-response.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { BrandingSettings } from './entities/branding.entity';
import {
  BRANDING_SETTINGS_ID,
  DEFAULT_BRANDING,
  POWERED_BY,
} from './branding.constants';
import { toBrandingResponse } from './branding.utils';

@Injectable()
export class BrandingService {
  constructor(
    @InjectRepository(BrandingSettings)
    private readonly repository: Repository<BrandingSettings>,
  ) {}

  async get(): Promise<BrandingResponseDto> {
    const settings = await this.repository.findOne({
      where: { id: BRANDING_SETTINGS_ID },
    });

    if (!settings) {
      return {
        ...DEFAULT_BRANDING,
        powered_by: POWERED_BY,
        updated_at: new Date(),
      };
    }

    return toBrandingResponse(settings);
  }

  async update(
    dto: UpdateBrandingDto,
    userId: string,
  ): Promise<BrandingResponseDto> {
    await this.repository.upsert(
      {
        id: BRANDING_SETTINGS_ID,
        ...dto,
        updated_by: userId,
      },
      ['id'],
    );

    const settings = await this.repository.findOneOrFail({
      where: { id: BRANDING_SETTINGS_ID },
    });

    return toBrandingResponse(settings);
  }
}
