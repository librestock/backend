import { Test, type TestingModule } from '@nestjs/testing';
import { BrandingService } from './branding.service';
import { BrandingRepository } from './branding.repository';
import { type BrandingSettings } from './entities/branding.entity';

describe('BrandingService', () => {
  let service: BrandingService;
  let repository: jest.Mocked<BrandingRepository>;

  const mockBrandingSettings: BrandingSettings = {
    id: 1,
    app_name: 'My Inventory',
    tagline: 'Custom tagline',
    logo_url: 'https://example.com/logo.png',
    favicon_url: 'https://example.com/favicon.ico',
    primary_color: '#ff5733',
    updated_at: new Date('2024-06-15'),
    updated_by: 'user_123',
  };

  beforeEach(async () => {
    const mockRepository = {
      get: jest.fn(),
      upsert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandingService,
        {
          provide: BrandingRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BrandingService>(BrandingService);
    repository = module.get(BrandingRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return current branding settings', async () => {
      repository.get.mockResolvedValue(mockBrandingSettings);

      const result = await service.get();

      expect(result.app_name).toBe('My Inventory');
      expect(result.tagline).toBe('Custom tagline');
      expect(result.logo_url).toBe('https://example.com/logo.png');
      expect(result.favicon_url).toBe('https://example.com/favicon.ico');
      expect(result.primary_color).toBe('#ff5733');
      expect(result.updated_at).toEqual(new Date('2024-06-15'));
    });

    it('should always include powered_by attribution', async () => {
      repository.get.mockResolvedValue(mockBrandingSettings);

      const result = await service.get();

      expect(result.powered_by).toEqual({
        name: 'LibreStock',
        url: 'https://github.com/maximilianpw/librestock',
      });
    });

    it('should return default branding when no settings exist', async () => {
      repository.get.mockResolvedValue(null);

      const result = await service.get();

      expect(result.app_name).toBe('LibreStock');
      expect(result.tagline).toBe('Inventory management system');
      expect(result.logo_url).toBeNull();
      expect(result.favicon_url).toBeNull();
      expect(result.primary_color).toBe('#3b82f6');
      expect(result.powered_by.name).toBe('LibreStock');
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should handle settings with null optional fields', async () => {
      const settingsWithNulls: BrandingSettings = {
        ...mockBrandingSettings,
        logo_url: null,
        favicon_url: null,
      };
      repository.get.mockResolvedValue(settingsWithNulls);

      const result = await service.get();

      expect(result.logo_url).toBeNull();
      expect(result.favicon_url).toBeNull();
      expect(result.app_name).toBe('My Inventory');
    });
  });

  describe('update', () => {
    it('should update branding settings and return updated result', async () => {
      const updateDto = {
        app_name: 'Updated App',
        primary_color: '#00ff00',
      };

      const updatedSettings: BrandingSettings = {
        ...mockBrandingSettings,
        app_name: 'Updated App',
        primary_color: '#00ff00',
      };

      repository.upsert.mockResolvedValue(updatedSettings);
      repository.get.mockResolvedValue(updatedSettings);

      const result = await service.update(updateDto, 'user_456');

      expect(repository.upsert).toHaveBeenCalledWith({
        app_name: 'Updated App',
        primary_color: '#00ff00',
        updated_by: 'user_456',
      });
      expect(result.app_name).toBe('Updated App');
      expect(result.primary_color).toBe('#00ff00');
    });

    it('should pass userId as updated_by', async () => {
      repository.upsert.mockResolvedValue(mockBrandingSettings);
      repository.get.mockResolvedValue(mockBrandingSettings);

      await service.update({ tagline: 'New tagline' }, 'admin-user');

      expect(repository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_by: 'admin-user',
        }),
      );
    });

    it('should update only provided fields', async () => {
      repository.upsert.mockResolvedValue(mockBrandingSettings);
      repository.get.mockResolvedValue(mockBrandingSettings);

      await service.update({ tagline: 'Only tagline' }, 'user_123');

      expect(repository.upsert).toHaveBeenCalledWith({
        tagline: 'Only tagline',
        updated_by: 'user_123',
      });
    });

    it('should allow setting optional fields to null', async () => {
      const updatedSettings: BrandingSettings = {
        ...mockBrandingSettings,
        logo_url: null,
      };
      repository.upsert.mockResolvedValue(updatedSettings);
      repository.get.mockResolvedValue(updatedSettings);

      const result = await service.update(
        { logo_url: null },
        'user_123',
      );

      expect(repository.upsert).toHaveBeenCalledWith({
        logo_url: null,
        updated_by: 'user_123',
      });
      expect(result.logo_url).toBeNull();
    });

    it('should call get() after upsert to return fresh data', async () => {
      repository.upsert.mockResolvedValue(mockBrandingSettings);
      repository.get.mockResolvedValue(mockBrandingSettings);

      await service.update({ app_name: 'Test' }, 'user_123');

      expect(repository.upsert).toHaveBeenCalledTimes(1);
      expect(repository.get).toHaveBeenCalledTimes(1);
    });
  });
});
