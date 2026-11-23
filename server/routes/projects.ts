import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db.ts';
import { cockpitProjects } from '../../src/db/schema.ts';
import { projectSaveSchema } from '../../src/shared/schemas.ts';
import { asyncHandler, requireUser } from '../auth.ts';

export const projectsRouter = Router();

projectsRouter.use(requireUser);

projectsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const projects = await db
      .select()
      .from(cockpitProjects)
      .where(eq(cockpitProjects.ownerId, req.user!.id))
      .orderBy(desc(cockpitProjects.updatedAt));

    res.json({ projects });
  })
);

projectsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const projectId = String(req.params.id);
    if (!/^[0-9a-f-]{36}$/i.test(projectId)) {
      res.status(400).json({ error: 'Invalid project ID format' });
      return;
    }

    const [project] = await db
      .select()
      .from(cockpitProjects)
      .where(and(eq(cockpitProjects.id, projectId), eq(cockpitProjects.ownerId, req.user!.id)))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ project });
  })
);

projectsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = projectSaveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid project payload',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const data = parsed.data;
    const [created] = await db
      .insert(cockpitProjects)
      .values({
        ownerId: req.user!.id,
        name: data.name,
        activeTab: data.activeTab,
        sceneGraph: data.sceneGraph,
        attributesState: data.attributesState,
        logicGraph: data.logicGraph,
        transitions: data.transitions,
        codeDocument: data.codeDocument,
      })
      .returning();

    res.status(201).json({ project: created });
  })
);

projectsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const projectId = String(req.params.id);
    if (!/^[0-9a-f-]{36}$/i.test(projectId)) {
      res.status(400).json({ error: 'Invalid project ID format' });
      return;
    }

    const parsed = projectSaveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid project payload',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const data = parsed.data;
    const [updated] = await db
      .update(cockpitProjects)
      .set({
        name: data.name,
        activeTab: data.activeTab,
        sceneGraph: data.sceneGraph,
        attributesState: data.attributesState,
        logicGraph: data.logicGraph,
        transitions: data.transitions,
        codeDocument: data.codeDocument,
        updatedAt: new Date(),
      })
      .where(and(eq(cockpitProjects.id, projectId), eq(cockpitProjects.ownerId, req.user!.id)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ project: updated });
  })
);

projectsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const projectId = String(req.params.id);
    if (!/^[0-9a-f-]{36}$/i.test(projectId)) {
      res.status(400).json({ error: 'Invalid project ID format' });
      return;
    }

    const deleted = await db
      .delete(cockpitProjects)
      .where(and(eq(cockpitProjects.id, projectId), eq(cockpitProjects.ownerId, req.user!.id)))
      .returning({ id: cockpitProjects.id });

    if (deleted.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ ok: true, id: projectId });
  })
);
