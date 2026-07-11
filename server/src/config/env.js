import dotenv from 'dotenv';

dotenv.config();

/**
 * Centralized, validated environment configuration.
 * Import `env` anywhere instead of reading process.env directly.
 */
const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'TOKEN_SECRET'];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  // eslint-disable-next-line no-console
  console.warn(
    `⚠️  Missing env vars: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`
  );
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  mongoUri: process.env.MONGODB_URI,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  tokenSecret: process.env.TOKEN_SECRET,

  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key',

  email: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'PathPilot AI <no-reply@pathpilot.ai>',
  },

  // Adzuna job-listings API (Phase 1 — market grounding).
  // Free registration at https://developer.adzuna.com
  adzuna: {
    appId: process.env.ADZUNA_APP_ID || '',
    appKey: process.env.ADZUNA_APP_KEY || '',
  },

  // TheirStack live job search API (Phase 2 — live openings).
  // Free tier: 200 credits/month · 1 credit = 1 job returned.
  // Register at https://theirstack.com to get a key.
  theirstack: {
    apiKey: process.env.THEIRSTACK_API_KEY || '',
  },
};
