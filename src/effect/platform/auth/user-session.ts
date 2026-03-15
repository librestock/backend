/**
 * Local UserSession type replacing @thallesp/nestjs-better-auth's UserSession.
 * Matches the shape returned by better-auth's getSession API.
 */
export interface UserSession {
  session: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
  user: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null;
    role?: string | string[];
  };
}
