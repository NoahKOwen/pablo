// server/auth/jwt.ts
import jwt, { type SignOptions, type Secret } from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET: Secret = (process.env.JWT_SECRET || 'dev-secret-change-me') as Secret;

// Use seconds for expiresIn to keep typing simple (number is always accepted)
const JWT_EXPIRES_IN_SECONDS: number =
  process.env.JWT_EXPIRES_IN !== undefined
    ? Number(process.env.JWT_EXPIRES_IN)
    : 7 * 24 * 60 * 60; // 7 days in seconds

export interface AuthTokenPayload {
  userId: string;
  email: string;
  jwtId: string;
  iat?: number;
  exp?: number;
}

// Only need userId + email when signing
type SignTokenParams = Pick<AuthTokenPayload, 'userId' | 'email'>;

export function signToken(params: SignTokenParams): { token: string; jwtId: string } {
  // Unique ID for this JWT / session
  const jwtId = crypto.randomBytes(16).toString('hex');

  const payload: AuthTokenPayload = {
    userId: params.userId,
    email: params.email,
    jwtId,
  };

  const signOptions: SignOptions = {
    expiresIn: JWT_EXPIRES_IN_SECONDS,
  };

  const token = jwt.sign(payload, JWT_SECRET, signOptions);

  return { token, jwtId };
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch {
    return null;
  }
}
