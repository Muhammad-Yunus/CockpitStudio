import {
  pgTable,
  uuid,
  text,
  boolean,
  doublePrecision,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export const cockpitUsers = pgTable('cockpit_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().default('engineer'),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const cockpitApiKeys = pgTable(
  'cockpit_api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => cockpitUsers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    keyHash: text('key_hash').notNull().unique(),
    scopes: jsonb('scopes').$type<string[]>().notNull().default(['ingest:write', 'telemetry:read']),
    isActive: boolean('is_active').notNull().default(true),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('cockpit_api_keys_user_idx').on(table.userId)]
);

export const cockpitProjects = pgTable(
  'cockpit_projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => cockpitUsers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    activeTab: text('active_tab').notNull().default('Infotainment'),
    sceneGraph: jsonb('scene_graph').$type<Record<string, unknown>>().notNull(),
    attributesState: jsonb('attributes_state').$type<Record<string, unknown>>().notNull(),
    logicGraph: jsonb('logic_graph').$type<Record<string, unknown>>().notNull(),
    transitions: jsonb('transitions').$type<Record<string, unknown>>().notNull(),
    codeDocument: text('code_document').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('cockpit_projects_owner_idx').on(table.ownerId)]
);

export const cockpitTelemetryStreams = pgTable(
  'cockpit_telemetry_streams',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => cockpitProjects.id, { onDelete: 'cascade' }),
    sourceSystem: text('source_system').notNull(),
    vehicleId: text('vehicle_id').notNull(),
    speedKmh: doublePrecision('speed_kmh'),
    powerKw: doublePrecision('power_kw'),
    rangeKm: doublePrecision('range_km'),
    gear: text('gear'),
    readyState: boolean('ready_state'),
    ambientTempC: doublePrecision('ambient_temp_c'),
    tripTimeLabel: text('trip_time_label'),
    tripDistanceKm: doublePrecision('trip_distance_km'),
    etaLabel: text('eta_label'),
    leftBlinker: boolean('left_blinker'),
    rightBlinker: boolean('right_blinker'),
    batterySocPct: doublePrecision('battery_soc_pct'),
    signals: jsonb('signals').$type<Record<string, string | number | boolean>>(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('cockpit_telemetry_project_time_idx').on(table.projectId, table.ingestedAt),
    index('cockpit_telemetry_vehicle_idx').on(table.vehicleId),
  ]
);

export const cockpitIngestLogs = pgTable(
  'cockpit_ingest_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => cockpitProjects.id, { onDelete: 'cascade' }),
    apiKeyId: uuid('api_key_id').references(() => cockpitApiKeys.id, { onDelete: 'set null' }),
    sourceSystem: text('source_system').notNull(),
    status: text('status').notNull(),
    recordCount: integer('record_count').notNull().default(1),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('cockpit_ingest_logs_project_idx').on(table.projectId, table.createdAt)]
);
