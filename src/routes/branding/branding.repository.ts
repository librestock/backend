import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrandingSettings } from './entities/branding.entity';

@Injectable()
export class BrandingRepository {
  constructor(
    @InjectRepository(BrandingSettings)
    private readonly repository: Repository<BrandingSettings>,
  ) {}

  async get(): Promise<BrandingSettings | null> {
    return this.repository.findOne({ where: { id: 1 } });
  }

  async upsert(data: Partial<BrandingSettings>): Promise<BrandingSettings> {
    const existing = await this.get();

    if (existing) {
      await this.repository.update({ id: 1 }, data);
      return this.repository.findOneOrFail({ where: { id: 1 } });
    }

    const entity = this.repository.create({ id: 1, ...data });
    return this.repository.save(entity);
  }
}
