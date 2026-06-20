import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production',
);

const SALT_ROUNDS = 10;
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateSessionToken = async (
  userId: string,
  email: string,
): Promise<string> => {
  const token = await new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .setJti(uuidv4())
    .sign(JWT_SECRET);

  return token;
};

export const verifySessionToken = async (
  token: string,
): Promise<{ userId: string; email: string } | null> => {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
};

export const generateResetToken = (): string => {
  return uuidv4();
};

export const generateVerificationToken = (): string => {
  return uuidv4();
};

export const getSessionExpiry = (): string => {
  const expiry = new Date(Date.now() + SESSION_DURATION);
  return expiry.toISOString();
};
