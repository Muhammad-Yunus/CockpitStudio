import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import dotenv from 'dotenv';
import { verifyDatabaseConnection } from './server/db.ts';
import { authRouter } from './server/routes/auth.ts';
import { projectsRouter } from './server/routes/projects.ts';
import { ingestRouter } from './server/routes/ingest.ts';

dotenv.config({ override: true });

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  // Security headers for production
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  app.get('/api/health', async (_req, res) => {
    const dbOk = await verifyDatabaseConnection();
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? 'ok' : 'degraded',
      database: dbOk ? 'connected' : 'unreachable',
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/v1', ingestRouter);

  // Centralized API error handler (prevents unhandled promise rejections / crashes)
  app.use(
    (
      err: Error & { status?: number; type?: string },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (err.type === 'entity.parse.failed') {
        res.status(400).json({ error: 'Malformed JSON request body' });
        return;
      }
      console.error('Server error:', err);
      res.status(err.status || 500).json({
        error:
          process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message || 'Internal server error',
      });
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath, { maxAge: '1d' }));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CockpitStudio server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CockpitStudio server:', err);
  process.exit(1);
});
