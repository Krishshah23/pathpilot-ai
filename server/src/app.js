import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';

import path from 'node:path';
import fs from 'node:fs';
import { protect } from './middleware/auth.middleware.js';
import { ApiError } from './utils/ApiError.js';

/**
 * Builds and configures the Express application. Kept separate from the server
 * bootstrap (index.js) so it can be imported in tests without opening a port.
 */
export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (!env.isProd) app.use(morgan('dev'));

  // Serve avatars statically
  app.use('/uploads/avatars', express.static('uploads/avatars'));

  // Secure resumes under access control check
  app.get('/uploads/resumes/:filename', protect, (req, res, next) => {
    try {
      const { filename } = req.params;
      const fileUserId = filename.split('-')[0];

      if (req.user.role !== 'admin' && req.user._id.toString() !== fileUserId) {
        throw ApiError.forbidden('You are not authorized to access this file');
      }

      const absPath = path.resolve(process.cwd(), 'uploads', 'resumes', filename);
      if (!fs.existsSync(absPath)) {
        throw ApiError.notFound('Resume file not found');
      }

      return res.sendFile(absPath);
    } catch (err) {
      next(err);
    }
  });

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
