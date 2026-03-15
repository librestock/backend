import { Layer } from 'effect';
import { AuthService, makeAuthService } from './service';

export const authLayer = Layer.effect(AuthService, makeAuthService);
