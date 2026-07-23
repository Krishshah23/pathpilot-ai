/**
 * config/db.js — MongoDB Connection via Mongoose
 *
 * WHY MONGOOSE:
 * Mongoose is an ODM (Object Document Mapper) for MongoDB. It lets us define
 * schemas and models with validation, type casting, and query helpers — rather
 * than writing raw MongoDB driver queries everywhere.
 *
 * WHY THE DNS FIX:
 * Atlas connection strings use the format mongodb+srv://... which requires an
 * SRV DNS lookup. Some Windows ISPs/networks block SRV queries, causing:
 *   "querySrv ECONNREFUSED _mongodb._tcp.cluster.mongodb.net"
 * Prepending public DNS servers (Cloudflare 1.1.1.1, Google 8.8.8.8) fixes this
 * without changing the system's default DNS for anything else.
 * Set USE_PUBLIC_DNS=false in .env to opt out.
 *
 * CONNECTION STRATEGY:
 * - We connect once at startup; Mongoose pools the connection internally.
 * - If the initial connection fails, we call process.exit(1) immediately —
 *   running a server with no database is pointless and dangerous.
 * - If the connection drops after startup, Mongoose auto-reconnects.
 *   We log a warning so it's visible in monitoring.
 *
 * strictQuery:
 * When true, Mongoose silently strips properties not defined in the schema
 * from filter objects. This prevents accidental queries using non-existent fields.
 */

import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Prepend public DNS resolvers to enable MongoDB Atlas SRV lookups on networks
 * that block SRV queries (common on Windows with ISP DNS servers).
 *
 * This is called before every connect attempt. It's idempotent — prepending
 * the same public IPs multiple times has no effect because we deduplicate.
 */
function ensureSrvCapableDns() {
  // Allow opting out if the environment explicitly says so
  if (process.env.USE_PUBLIC_DNS === 'false') return;

  try {
    const current = dns.getServers(); // e.g. ['192.168.1.1'] (ISP DNS)
    const publicDns = ['1.1.1.1', '8.8.8.8']; // Cloudflare + Google

    // Merge: public DNS first (so SRV queries succeed), then system DNS
    // (so all other lookups like localhost still work normally)
    const merged = [...publicDns, ...current.filter((s) => !publicDns.includes(s))];
    dns.setServers(merged);
  } catch {
    // Non-fatal: the system might restrict DNS changes. Fall through and try anyway.
  }
}

/**
 * Connects to MongoDB Atlas using the MONGODB_URI from the environment config.
 *
 * Should be called once at startup in index.js before starting the HTTP server.
 * Mongoose maintains a connection pool internally — no need to call this again.
 *
 * @returns {Promise<void>} Resolves when connected; calls process.exit(1) on failure.
 */
export async function connectDB() {
  // Fix potential SRV DNS issue on Windows before attempting connection
  ensureSrvCapableDns();

  // Ensure Mongoose silently strips unrecognized filter fields (security + correctness)
  mongoose.set('strictQuery', true);

  try {
    const conn = await mongoose.connect(env.mongoUri, {
      // Fail fast (10s) if Atlas is unreachable at startup
      // Without this, Mongoose can hang for 30+ seconds before timing out
      serverSelectionTimeoutMS: 10000,
    });

    // Log the host and database name (useful to confirm you hit the right Atlas cluster)
    // eslint-disable-next-line no-console
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    // Connection failed — print the reason (usually a wrong URI or network block)
    // eslint-disable-next-line no-console
    console.error(`❌ MongoDB connection failed: ${err.message}`);

    // Exit the process — there is no point running an API server without a database
    process.exit(1);
  }

  // Listen for disconnection events that happen AFTER a successful initial connect.
  // Mongoose's built-in reconnection will handle recovery; this just provides visibility.
  mongoose.connection.on('disconnected', () => {
    // eslint-disable-next-line no-console
    console.warn('⚠️  MongoDB disconnected');
  });
}
