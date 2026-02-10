import type {
  CanActivate,
  DynamicModule,
  ExecutionContext,
} from '@nestjs/common';

export interface UserSession {
  user: {
    id: string;
    name?: string;
    email?: string;
    image?: string | null;
    createdAt?: string | Date;
    updatedAt?: string | Date;
  };
  session?: {
    id?: string;
    createdAt?: string | Date;
    expiresAt?: string | Date;
  };
}

export class AuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}

export class AuthModule {
  static forRoot(_options: unknown): DynamicModule {
    return {
      module: AuthModule,
      providers: [AuthGuard],
      exports: [AuthGuard],
    };
  }
}

export function AllowAnonymous(): ClassDecorator & MethodDecorator {
  return () => undefined;
}

export function Session(): ParameterDecorator {
  return () => undefined;
}
