import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db.ts';
import { cockpitUsers, cockpitApiKeys } from '../../src/db/schema.ts';
import { registerSchema, loginSchema, createApiKeySchema } from '../../src/shared/schemas.ts';
import {
  asyncHandler,
  hashPassword,
  verifyPassword,
  signSessionToken,
  setSessionCookie,
  clearSessionCookie,
  requireUser,
  generateApiKeyPair,
} from '../auth.ts';

export const authRouter = Router();

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { name, email, password } = parsed.data;
    const existing = await db
      .select({ id: cockpitUsers.id })
      .from(cockpitUsers)
      .where(eq(cockpitUsers.email, email))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(cockpitUsers)
      .values({
        name,
        email,
        passwordHash,
        role: 'engineer',
      })
      .returning({
        id: cockpitUsers.id,
        email: cockpitUsers.email,
        name: cockpitUsers.name,
        role: cockpitUsers.role,
        createdAt: cockpitUsers.createdAt,
      });

    const token = signSessionToken(created);
    setSessionCookie(req, res, token);
    res.status(201).json({ user: created });
  })
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password } = parsed.data;
    const [user] = await db
      .select()
      .from(cockpitUsers)
      .where(eq(cockpitUsers.email, email))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const token = signSessionToken(safeUser);
    setSessionCookie(req, res, token);
    res.json({ user: safeUser });
  })
);

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get(
  '/me',
  requireUser,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

authRouter.get(
  '/keys',
  requireUser,
  asyncHandler(async (req, res) => {
    const keys = await db
      .select({
        id: cockpitApiKeys.id,
        name: cockpitApiKeys.name,
        keyPrefix: cockpitApiKeys.keyPrefix,
        scopes: cockpitApiKeys.scopes,
        isActive: cockpitApiKeys.isActive,
        lastUsedAt: cockpitApiKeys.lastUsedAt,
        createdAt: cockpitApiKeys.createdAt,
      })
      .from(cockpitApiKeys)
      .where(eq(cockpitApiKeys.userId, req.user!.id))
      .orderBy(desc(cockpitApiKeys.createdAt));

    res.json({ keys });
  })
);

authRouter.post(
  '/keys',
  requireUser,
  asyncHandler(async (req, res) => {
    const parsed = createApiKeySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { rawKey, keyPrefix, keyHash } = generateApiKeyPair();
    const [created] = await db
      .insert(cockpitApiKeys)
      .values({
        userId: req.user!.id,
        name: parsed.data.name,
        keyPrefix,
        keyHash,
        scopes: parsed.data.scopes,
      })
      .returning({
        id: cockpitApiKeys.id,
        name: cockpitApiKeys.name,
        keyPrefix: cockpitApiKeys.keyPrefix,
        scopes: cockpitApiKeys.scopes,
        isActive: cockpitApiKeys.isActive,
        createdAt: cockpitApiKeys.createdAt,
      });

    res.status(201).json({
      key: created,
      plainTextKey: rawKey,
      notice: 'Store this key securely now. It will not be displayed again.',
    });
  })
);

authRouter.delete(
  '/keys/:id',
  requireUser,
  asyncHandler(async (req, res) => {
    const keyId = String(req.params.id);
    if (!/^[0-9a-f-]{36}$/i.test(keyId)) {
      res.status(400).json({ error: 'Invalid key ID format' });
      return;
    }
    const deleted = await db
      .delete(cockpitApiKeys)
      .where(and(eq(cockpitApiKeys.id, keyId), eq(cockpitApiKeys.userId, req.user!.id)))
      .returning({ id: cockpitApiKeys.id });

    if (deleted.length === 0) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }

    res.json({ ok: true, id: keyId });
  })
);
