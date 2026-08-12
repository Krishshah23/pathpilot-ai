/**
 * models/ApiCreditUsage.js — External API Monthly Credit Usage & Quota Ledger
 *
 * ARCHITECTURAL ROLE:
 * Tracks and enforces strict credit budget limits for external paid/metered APIs (such as TheirStack).
 * Ensures that background cron tasks or frequent page reloads never exceed the monthly free-tier
 * budget (e.g. 200 credits/month, 8 credits per request = max 25 calls/month).
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const logEntrySchema = new Schema(
  {
    role: { type: String, default: '' },
    country: { type: String, default: 'IN' },
    creditsConsumed: { type: Number, default: 8 },
    source: { type: String, enum: ['user_request', 'cron', 'admin', 'other'], default: 'user_request' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const apiCreditUsageSchema = new Schema(
  {
    // Month identifier string in format 'YYYY-MM' (e.g. '2026-08')
    monthKey: {
      type: String,
      required: true,
      index: true,
    },

    // Name of the external provider (e.g. 'theirstack')
    provider: {
      type: String,
      required: true,
      enum: ['theirstack', 'adzuna', 'gemini'],
      default: 'theirstack',
      index: true,
    },

    // Total successful API calls executed in this month
    requestsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total credits consumed in this month (e.g. requestsCount * 8)
    creditsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    // When the most recent external API call was made
    lastRequestAt: {
      type: Date,
      default: null,
    },

    // Recent activity log entries (capped at last 50 for diagnostic audits)
    recentLogs: {
      type: [logEntrySchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Compound unique index ensuring one usage record per provider per month
apiCreditUsageSchema.index({ monthKey: 1, provider: 1 }, { unique: true });

/** Helper to generate current month key e.g. '2026-08' */
export function getCurrentMonthKey() {
  const d = new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Returns current monthly usage summary for a provider.
 * @param {string} provider
 * @param {number} monthlyLimit
 */
apiCreditUsageSchema.statics.getMonthlyUsage = async function (provider = 'theirstack', monthlyLimit = 200) {
  const monthKey = getCurrentMonthKey();
  const record = await this.findOne({ monthKey, provider }).lean();

  const creditsUsed = record?.creditsUsed || 0;
  const requestsCount = record?.requestsCount || 0;
  const remainingCredits = Math.max(0, monthlyLimit - creditsUsed);

  return {
    monthKey,
    provider,
    requestsCount,
    creditsUsed,
    monthlyLimit,
    remainingCredits,
    isQuotaExhausted: creditsUsed >= monthlyLimit,
    lastRequestAt: record?.lastRequestAt || null,
  };
};

/**
 * Checks if a requested credit consumption is permissible within budget.
 * @param {string} provider
 * @param {number} cost
 * @param {number} monthlyLimit
 * @returns {Promise<{ allowed: boolean, remaining: number, currentUsed: number }>}
 */
apiCreditUsageSchema.statics.canConsume = async function (provider = 'theirstack', cost = 8, monthlyLimit = 200) {
  const usage = await this.getMonthlyUsage(provider, monthlyLimit);
  const allowed = usage.creditsUsed + cost <= monthlyLimit;
  return {
    allowed,
    remaining: usage.remainingCredits,
    currentUsed: usage.creditsUsed,
    monthKey: usage.monthKey,
  };
};

/**
 * Atomically records an API credit consumption.
 * @param {string} provider
 * @param {number} cost
 * @param {object} [meta]
 */
apiCreditUsageSchema.statics.recordConsumption = async function (
  provider = 'theirstack',
  cost = 8,
  meta = {}
) {
  const monthKey = getCurrentMonthKey();
  const now = new Date();

  const logEntry = {
    role: meta.role || '',
    country: meta.country || 'IN',
    creditsConsumed: cost,
    source: meta.source || 'user_request',
    timestamp: now,
  };

  return this.findOneAndUpdate(
    { monthKey, provider },
    {
      $inc: { requestsCount: 1, creditsUsed: cost },
      $set: { lastRequestAt: now },
      $push: {
        recentLogs: {
          $each: [logEntry],
          $slice: -50, // keep latest 50 logs
        },
      },
    },
    { upsert: true, new: true }
  );
};

export const ApiCreditUsage = mongoose.model('ApiCreditUsage', apiCreditUsageSchema);
