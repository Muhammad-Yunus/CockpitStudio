import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Valid email address is required').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email address is required').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const createApiKeySchema = z.object({
  name: z.string().trim().min(2, 'Key label must be at least 2 characters').max(64),
  scopes: z
    .array(z.enum(['ingest:write', 'telemetry:read', 'signals:write']))
    .min(1)
    .default(['ingest:write', 'telemetry:read', 'signals:write']),
});

export const projectSaveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  activeTab: z.enum(['Root', 'Cluster', 'Infotainment']).default('Infotainment'),
  sceneGraph: z.record(z.string(), z.unknown()),
  attributesState: z.record(z.string(), z.unknown()),
  logicGraph: z.record(z.string(), z.unknown()),
  transitions: z.record(z.string(), z.unknown()),
  codeDocument: z.string().max(100000),
});

export const gearEnum = z.enum(['P', 'R', 'N', 'D']);

export const telemetryIngestSchema = z.object({
  projectId: z.string().uuid('projectId must be a valid UUID'),
  sourceSystem: z
    .string()
    .trim()
    .min(2, 'sourceSystem identifier is required')
    .max(64)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'sourceSystem may only contain alphanumeric characters, _, ., -'),
  vehicleId: z
    .string()
    .trim()
    .min(2, 'vehicleId is required')
    .max(64),
  speedKmh: z.number().min(0).max(450).optional(),
  powerKw: z.number().min(-300).max(1500).optional(),
  rangeKm: z.number().min(0).max(2000).optional(),
  gear: gearEnum.optional(),
  readyState: z.boolean().optional(),
  ambientTempC: z.number().min(-60).max(85).optional(),
  tripTimeLabel: z.string().trim().max(24).optional(),
  tripDistanceKm: z.number().min(0).max(50000).optional(),
  etaLabel: z.string().trim().max(24).optional(),
  leftBlinker: z.boolean().optional(),
  rightBlinker: z.boolean().optional(),
  batterySocPct: z.number().min(0).max(100).optional(),
  signals: z
    .record(z.string().min(1).max(64), z.union([z.number(), z.string().max(120), z.boolean()]))
    .optional(),
  recordedAt: z.string().datetime({ offset: true }).optional(),
});

export const telemetryBatchIngestSchema = z.object({
  projectId: z.string().uuid('projectId must be a valid UUID'),
  sourceSystem: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9_.-]+$/),
  frames: z
    .array(
      telemetryIngestSchema.omit({ projectId: true, sourceSystem: true })
    )
    .min(1, 'At least 1 telemetry frame is required')
    .max(500, 'Maximum 500 frames per batch request'),
});

export const signalIngestSchema = z.object({
  projectId: z.string().uuid('projectId must be a valid UUID'),
  sourceSystem: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9_.-]+$/),
  vehicleId: z.string().trim().min(2).max(64).default('EXTERNAL_BUS'),
  signals: z
    .record(z.string().min(1).max(64), z.union([z.number(), z.string().max(120), z.boolean()]))
    .refine((obj) => Object.keys(obj).length > 0, {
      message: 'At least one signal key-value pair is required',
    }),
  recordedAt: z.string().datetime({ offset: true }).optional(),
});

export type TelemetryIngestPayload = z.infer<typeof telemetryIngestSchema>;
export type TelemetryBatchIngestPayload = z.infer<typeof telemetryBatchIngestSchema>;
export type SignalIngestPayload = z.infer<typeof signalIngestSchema>;
