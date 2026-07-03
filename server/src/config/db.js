import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Some networks/ISPs (common on Windows) run a DNS resolver that refuses the
 * SRV lookups required by `mongodb+srv://`, causing `querySrv ECONNREFUSED`.
 * We prepend public resolvers (Cloudflare, Google) so the Atlas lookup works,
 * while keeping the system resolvers as fallback for everything else.
 * Opt out with USE_PUBLIC_DNS=false if your network requires internal DNS.
 */
function ensureSrvCapableDns() {
  if (process.env.USE_PUBLIC_DNS === 'false') return;
  try {
    const current = dns.getServers();
    const publicDns = ['1.1.1.1', '8.8.8.8'];
    const merged = [...publicDns, ...current.filter((s) => !publicDns.includes(s))];
    dns.setServers(merged);
  } catch {
    /* non-fatal: fall back to system DNS */
  }
}

/**
 * Connect to MongoDB (Atlas). Retries are handled by the driver; we fail fast
 * on the initial connection so misconfiguration surfaces immediately.
 */
export async function connectDB() {
  ensureSrvCapableDns();
  mongoose.set('strictQuery', true);

  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    // eslint-disable-next-line no-console
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`❌ MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    // eslint-disable-next-line no-console
    console.warn('⚠️  MongoDB disconnected');
  });
}
