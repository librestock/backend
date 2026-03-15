import { Layer } from 'effect';
import { BrandingService, makeBrandingService } from './service';

export const brandingLayer = Layer.effect(BrandingService, makeBrandingService);
