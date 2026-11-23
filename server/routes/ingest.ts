import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db.ts';
import {
  cockpitProjects,
  cockpitTelemetryStreams,
  cockpitIngestLogs,
} from '../../src/db/schema.ts';
import {
  telemetryIngestSchema,
  telemetryBatchIngestSchema,
  signalIngestSchema,
} from '../../src/shared/schemas.ts';
import { asyncHandler, requireIngestAuth, type AuthenticatedRequest } from '../auth.ts';

export const ingestRouter = Router();

function getActorUserId(req: AuthenticatedRequest): string | null {
  if (req.apiKey) return req.apiKey.userId;
  if (req.user) return req.user.id;
  return null;
}

async function verifyProjectOwnership(projectId: string, userId: string): Promise<boolean> {
  const [proj] = await db
    .select({ id: cockpitProjects.id })
    .from(cockpitProjects)
    .where(and(eq(cockpitProjects.id, projectId), eq(cockpitProjects.ownerId, userId)))
    .limit(1);
  return Boolean(proj);
}

ingestRouter.get('/ingest/schema', (_req, res) => {
  res.json({
    service: 'CockpitStudio External Telemetry Ingest API',
    version: 'v1',
    authentication: {
      methods: ['x-api-key: cs_live_<token>', 'Authorization: Bearer cs_live_<token>'],
      sessionFallback: 'Authenticated CockpitStudio session cookie',
    },
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/ingest/telemetry',
        description: 'Ingest a single validated vehicle / HMI telemetry frame into PostgreSQL.',
      },
      {
        method: 'POST',
        path: '/api/v1/ingest/batch',
        description: 'Ingest up to 500 validated telemetry frames atomically in one transaction.',
      },
      {
        method: 'POST',
        path: '/api/v1/ingest/signals',
        description: 'Ingest named key-value HMI Logic Editor signals (numbers, strings, booleans).',
      },
    ],
  });
});

ingestRouter.post(
  '/ingest/telemetry',
  requireIngestAuth,
  asyncHandler(async (req, res) => {
    const userId = getActorUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (req.apiKey && !req.apiKey.scopes.includes('ingest:write')) {
      res.status(403).json({ error: 'API key missing required ingest:write scope' });
      return;
    }

    const parsed = telemetryIngestSchema.safeParse(req.body);
    if (!parsed.success) {
      const rawProjectId = typeof req.body?.projectId === 'string' ? req.body.projectId : null;
      if (rawProjectId && /^[0-9a-f-]{36}$/i.test(rawProjectId)) {
        const owns = await verifyProjectOwnership(rawProjectId, userId);
        if (owns) {
          await db.insert(cockpitIngestLogs).values({
            projectId: rawProjectId,
            apiKeyId: req.apiKey?.id ?? null,
            sourceSystem:
              typeof req.body?.sourceSystem === 'string' ? req.body.sourceSystem : 'unknown',
            status: 'rejected',
            recordCount: 1,
            errorMessage: JSON.stringify(parsed.error.flatten().fieldErrors),
          });
        }
      }

      res.status(400).json({
        error: 'Schema validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const data = parsed.data;
    const owns = await verifyProjectOwnership(data.projectId, userId);
    if (!owns) {
      res.status(404).json({ error: 'Target projectId not found or not accessible' });
      return;
    }

    const [inserted] = await db.transaction(async (tx) => {
      const rows = await tx
        .insert(cockpitTelemetryStreams)
        .values({
          projectId: data.projectId,
          sourceSystem: data.sourceSystem,
          vehicleId: data.vehicleId,
          speedKmh: data.speedKmh ?? null,
          powerKw: data.powerKw ?? null,
          rangeKm: data.rangeKm ?? null,
          gear: data.gear ?? null,
          readyState: data.readyState ?? null,
          ambientTempC: data.ambientTempC ?? null,
          tripTimeLabel: data.tripTimeLabel ?? null,
          tripDistanceKm: data.tripDistanceKm ?? null,
          etaLabel: data.etaLabel ?? null,
          leftBlinker: data.leftBlinker ?? null,
          rightBlinker: data.rightBlinker ?? null,
          batterySocPct: data.batterySocPct ?? null,
          signals: data.signals ?? null,
          recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
        })
        .returning();

      await tx.insert(cockpitIngestLogs).values({
        projectId: data.projectId,
        apiKeyId: req.apiKey?.id ?? null,
        sourceSystem: data.sourceSystem,
        status: 'accepted',
        recordCount: 1,
      });

      return rows;
    });

    res.status(201).json({
      accepted: true,
      frame: inserted,
    });
  })
);

ingestRouter.post(
  '/ingest/batch',
  requireIngestAuth,
  asyncHandler(async (req, res) => {
    const userId = getActorUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (req.apiKey && !req.apiKey.scopes.includes('ingest:write')) {
      res.status(403).json({ error: 'API key missing required ingest:write scope' });
      return;
    }

    const parsed = telemetryBatchIngestSchema.safeParse(req.body);
    if (!parsed.success) {
      const rawProjectId = typeof req.body?.projectId === 'string' ? req.body.projectId : null;
      if (rawProjectId && /^[0-9a-f-]{36}$/i.test(rawProjectId)) {
        const owns = await verifyProjectOwnership(rawProjectId, userId);
        if (owns) {
          await db.insert(cockpitIngestLogs).values({
            projectId: rawProjectId,
            apiKeyId: req.apiKey?.id ?? null,
            sourceSystem:
              typeof req.body?.sourceSystem === 'string' ? req.body.sourceSystem : 'unknown',
            status: 'rejected',
            recordCount: Array.isArray(req.body?.frames) ? req.body.frames.length : 1,
            errorMessage: JSON.stringify(parsed.error.flatten().fieldErrors),
          });
        }
      }

      res.status(400).json({
        error: 'Batch schema validation failed',
        details: parsed.error.flatten(),
      });
      return;
    }

    const { projectId, sourceSystem, frames } = parsed.data;
    const owns = await verifyProjectOwnership(projectId, userId);
    if (!owns) {
      res.status(404).json({ error: 'Target projectId not found or not accessible' });
      return;
    }

    const inserted = await db.transaction(async (tx) => {
      const rows = await tx
        .insert(cockpitTelemetryStreams)
        .values(
          frames.map((frame) => ({
            projectId,
            sourceSystem,
            vehicleId: frame.vehicleId,
            speedKmh: frame.speedKmh ?? null,
            powerKw: frame.powerKw ?? null,
            rangeKm: frame.rangeKm ?? null,
            gear: frame.gear ?? null,
            readyState: frame.readyState ?? null,
            ambientTempC: frame.ambientTempC ?? null,
            tripTimeLabel: frame.tripTimeLabel ?? null,
            tripDistanceKm: frame.tripDistanceKm ?? null,
            etaLabel: frame.etaLabel ?? null,
            leftBlinker: frame.leftBlinker ?? null,
            rightBlinker: frame.rightBlinker ?? null,
            batterySocPct: frame.batterySocPct ?? null,
            signals: frame.signals ?? null,
            recordedAt: frame.recordedAt ? new Date(frame.recordedAt) : new Date(),
          }))
        )
        .returning({ id: cockpitTelemetryStreams.id, ingestedAt: cockpitTelemetryStreams.ingestedAt });

      await tx.insert(cockpitIngestLogs).values({
        projectId,
        apiKeyId: req.apiKey?.id ?? null,
        sourceSystem,
        status: 'accepted',
        recordCount: rows.length,
      });

      return rows;
    });

    res.status(201).json({
      accepted: true,
      ingestedCount: inserted.length,
      latestId: inserted[inserted.length - 1]?.id ?? null,
    });
  })
);

ingestRouter.post(
  '/ingest/signals',
  requireIngestAuth,
  asyncHandler(async (req, res) => {
    const userId = getActorUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (
      req.apiKey &&
      !req.apiKey.scopes.includes('signals:write') &&
      !req.apiKey.scopes.includes('ingest:write')
    ) {
      res.status(403).json({ error: 'API key missing required signals:write scope' });
      return;
    }

    const parsed = signalIngestSchema.safeParse(req.body);
    if (!parsed.success) {
      const rawProjectId = typeof req.body?.projectId === 'string' ? req.body.projectId : null;
      if (rawProjectId && /^[0-9a-f-]{36}$/i.test(rawProjectId)) {
        const owns = await verifyProjectOwnership(rawProjectId, userId);
        if (owns) {
          await db.insert(cockpitIngestLogs).values({
            projectId: rawProjectId,
            apiKeyId: req.apiKey?.id ?? null,
            sourceSystem:
              typeof req.body?.sourceSystem === 'string' ? req.body.sourceSystem : 'unknown',
            status: 'rejected',
            recordCount: 1,
            errorMessage: JSON.stringify(parsed.error.flatten().fieldErrors),
          });
        }
      }

      res.status(400).json({
        error: 'Signal schema validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const data = parsed.data;
    const owns = await verifyProjectOwnership(data.projectId, userId);
    if (!owns) {
      res.status(404).json({ error: 'Target projectId not found or not accessible' });
      return;
    }

    const [inserted] = await db.transaction(async (tx) => {
      const rows = await tx
        .insert(cockpitTelemetryStreams)
        .values({
          projectId: data.projectId,
          sourceSystem: data.sourceSystem,
          vehicleId: data.vehicleId,
          speedKmh:
            typeof data.signals['Speed value'] === 'number' ? data.signals['Speed value'] : null,
          leftBlinker:
            typeof data.signals['Left Blinker'] === 'boolean' ? data.signals['Left Blinker'] : null,
          rightBlinker:
            typeof data.signals['Right Blinker'] === 'boolean'
              ? data.signals['Right Blinker']
              : null,
          signals: data.signals,
          recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
        })
        .returning();

      await tx.insert(cockpitIngestLogs).values({
        projectId: data.projectId,
        apiKeyId: req.apiKey?.id ?? null,
        sourceSystem: data.sourceSystem,
        status: 'accepted',
        recordCount: 1,
      });

      return rows;
    });

    res.status(201).json({
      accepted: true,
      frame: inserted,
    });
  })
);

ingestRouter.get(
  '/telemetry/latest',
  requireIngestAuth,
  asyncHandler(async (req, res) => {
    const userId = getActorUserId(req);
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : '';
    if (!userId || !projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
      res.status(400).json({ error: 'Valid projectId query parameter is required' });
      return;
    }

    const owns = await verifyProjectOwnership(projectId, userId);
    if (!owns) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const [latest] = await db
      .select()
      .from(cockpitTelemetryStreams)
      .where(eq(cockpitTelemetryStreams.projectId, projectId))
      .orderBy(desc(cockpitTelemetryStreams.ingestedAt))
      .limit(1);

    res.json({ frame: latest ?? null });
  })
);

ingestRouter.get(
  '/telemetry/history',
  requireIngestAuth,
  asyncHandler(async (req, res) => {
    const userId = getActorUserId(req);
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : '';
    const limit = Math.min(Math.max(Number(req.query.limit || 25), 1), 100);

    if (!userId || !projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
      res.status(400).json({ error: 'Valid projectId query parameter is required' });
      return;
    }

    const owns = await verifyProjectOwnership(projectId, userId);
    if (!owns) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const frames = await db
      .select()
      .from(cockpitTelemetryStreams)
      .where(eq(cockpitTelemetryStreams.projectId, projectId))
      .orderBy(desc(cockpitTelemetryStreams.ingestedAt))
      .limit(limit);

    res.json({ frames });
  })
);

ingestRouter.get(
  '/ingest/logs',
  requireIngestAuth,
  asyncHandler(async (req, res) => {
    const userId = getActorUserId(req);
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : '';

    if (!userId || !projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
      res.status(400).json({ error: 'Valid projectId query parameter is required' });
      return;
    }

    const owns = await verifyProjectOwnership(projectId, userId);
    if (!owns) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const logs = await db
      .select()
      .from(cockpitIngestLogs)
      .where(eq(cockpitIngestLogs.projectId, projectId))
      .orderBy(desc(cockpitIngestLogs.createdAt))
      .limit(50);

    res.json({ logs });
  })
);
