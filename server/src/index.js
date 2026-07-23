/**
 * index.js — Application Bootstrap (Entry Point)
 *
 * This is the FIRST FILE that runs when you start the server with `npm run dev`.
 * Its only job is to:
 *   1. Connect to MongoDB
 *   2. Create and configure the Express app
 *   3. Start the HTTP server listening on a port
 *   4. Start the weekly cron job for market data
 *   5. Set up graceful shutdown handlers
 *
 * WHY IS THIS SEPARATE FROM app.js?
 * `createApp()` in app.js returns a configured Express application WITHOUT
 * opening a port. This separation makes the app testable:
 *   - In tests: import createApp() and use supertest without opening a real port
 *   - In prod:  index.js calls createApp() then .listen() to open the port
 *
 * STARTUP ORDER (important!):
 *   connectDB() must complete BEFORE app.listen()
 *   because controllers will query MongoDB the instant the first request arrives.
 *   If we listen before connecting, early requests will get "MongooseError: not connected".
 *
 * GRACEFUL SHUTDOWN:
 * When the process receives SIGINT (Ctrl+C) or SIGTERM (Docker/Kubernetes stop),
 * we close the HTTP server before exiting. This:
 *   - Allows in-flight requests to complete (server.close() waits for them)
 *   - Prevents forceful port closure which could corrupt ongoing DB writes
 *   - Is required by container orchestrators (Kubernetes, Render, Railway)
 */

import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { startJobMarketCron } from './services/jobMarketCron.js';

/**
 * Main bootstrap function. Called immediately at the bottom of this file.
 * Uses async/await so we can await DB connection before starting the server.
 */
async function bootstrap() {
  // Step 1: Connect to MongoDB Atlas.
  // Will exit with code 1 if connection fails (see config/db.js for details).
  await connectDB();

  // Step 2: Build the Express application (configure middleware, routes, error handlers).
  // See app.js for the full Express configuration.
  const app = createApp();

  // Step 3: Start the HTTP server.
  // app.listen() binds to the port and starts accepting connections.
  // The callback fires once the port is successfully bound and ready.
  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 PathPilot API running on http://localhost:${env.port} [${env.nodeEnv}]`);
  });

  // Step 4: Start the weekly Adzuna job-market data refresh cron job.
  // This runs independently in the background on a schedule (see jobMarketCron.js).
  // It populates the jobmarketsnapshots collection used by the Market Intelligence panel.
  startJobMarketCron();

  // Step 5: Register graceful shutdown handlers.
  // These intercept process termination signals so we can clean up before exiting.
  const shutdown = (signal) => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received. Closing server...`);

    // server.close() stops accepting new connections and waits for existing
    // request handlers to finish before calling the callback and exiting.
    server.close(() => process.exit(0));
  };

  // SIGINT: sent when user presses Ctrl+C in the terminal
  process.on('SIGINT', () => shutdown('SIGINT'));

  // SIGTERM: sent by Docker, Kubernetes, or Render.com when stopping the container
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Call bootstrap() and handle any uncaught startup errors.
// If bootstrap throws (e.g. DB connection failed and didn't exit), we catch it here,
// log it, and exit with a non-zero code to signal failure to the OS / container runtime.
bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});
