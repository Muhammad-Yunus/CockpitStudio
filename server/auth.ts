import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from './db.ts';
import { cockpitApiKeys, cockpitUsers } from '../src/db/schema.ts';

const COOKIE_NAME = 'cockpit_session';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET environment variable must be configured (min 16 chars)');
  }
  return secret;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
  apiKey?: {
    id: string;
    userId: string;
    name: string;
    scopes: string[];
  };
}

export function asyncHandler(
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signSessionToken(user: SessionUser): string {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload;
    if (!decoded || typeof decoded.sub !== 'string') return null;
    return {
      id: decoded.sub,
      email: String(decoded.email || ''),
      name: String(decoded.name || ''),
      role: String(decoded.role || 'engineer'),
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(req: Request, res: Response, token: string): void {
  const isHttps =
    req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function generateApiKeyPair(): { rawKey: string; keyPrefix: string; keyHash: string } {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const rawKey = `cs_live_${randomBytes}`;
  const keyPrefix = rawKey.slice(0, 16);
  const keyHash = hashApiKey(rawKey);
  return { rawKey, keyPrefix, keyHash };
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export async function requireUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const cookieToken = req.cookies?.[COOKIE_NAME];
    const authHeader = req.headers.authorization;
    const bearerToken =
      authHeader && authHeader.startsWith('Bearer ') && !authHeader.startsWith('Bearer cs_live_')
        ? authHeader.slice(7).trim()
        : undefined;

    const token = cookieToken || bearerToken;
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const session = verifySessionToken(token);
    if (!session) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    const [existingUser] = await db
      .select({
        id: cockpitUsers.id,
        email: cockpitUsers.email,
        name: cockpitUsers.name,
        role: cockpitUsers.role,
      })
      .from(cockpitUsers)
      .where(eq(cockpitUsers.id, session.id))
      .limit(1);

    if (!existingUser) {
      res.status(401).json({ error: 'User account not found' });
      return;
    }

    req.user = existingUser;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireIngestAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const headerKey =
      (typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'].trim() : '') ||
      (req.headers.authorization?.startsWith('Bearer cs_live_')
        ? req.headers.authorization.slice(7).trim()
        : '');

    if (headerKey) {
      const hashed = hashApiKey(headerKey);
      const [keyRecord] = await db
        .select()
        .from(cockpitApiKeys)
        .where(and(eq(cockpitApiKeys.keyHash, hashed), eq(cockpitApiKeys.isActive, true)))
        .limit(1);

      if (!keyRecord) {
        res.status(401).json({ error: 'Invalid or revoked API key' });
        return;
      }

      await db
        .update(cockpitApiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(cockpitApiKeys.id, keyRecord.id));

      req.apiKey = {
        id: keyRecord.id,
        userId: keyRecord.userId,
        name: keyRecord.name,
        scopes: Array.isArray(keyRecord.scopes) ? keyRecord.scopes : ['ingest:write'],
      };
      next();
      return;
    }

    await requireUser(req, res, next);
  } catch (err) {
    next(err);
  }
}
