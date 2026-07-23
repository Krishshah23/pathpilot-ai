/**
 * services/ai.service.js — Thin HTTP Client for Django ML Service
 *
 * ARCHITECTURAL ROLE:
 * This module is the SINGLE gateway between the Node.js Express backend and
 * the Django REST Framework Machine Learning microservice running on port 8000.
 *
 * CRITICAL RULE:
 * Feature controllers or other services must NEVER call `axios` directly to reach Django.
 * All Node-to-Django IPC (Inter-Process Communication) must go through `aiService`.
 *
 * SECURITY & AUTHENTICATION:
 * The Django microservice rejects any request that lacks a valid `X-Internal-Key` header
 * matching `INTERNAL_API_KEY` in environment config. This prevents external clients
 * (e.g. browser or unauthorized API callers) from bypassing Node.js authentication.
 *
 * ERROR TRANSLATION:
 * Transports errors (500s from Django or network failures) into clean Express `ApiError` instances:
 * - Django HTTP response error (4xx/5xx) -> Bad Gateway (502)
 * - Connection refused / timeout / network drop -> Service Unavailable (503)
 */

import axios from 'axios';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Pre-configured Axios instance dedicated to Django ML service communication
const aiClient = axios.create({
  baseURL: `${env.aiServiceUrl}/api`,
  timeout: 15000, // 15s timeout to prevent hanging Node threads if Django ML training/inference lags
  headers: { 'X-Internal-Key': env.internalApiKey },
});

/**
 * Generic request executor wrapping Axios calls to Django.
 * Translates low-level network errors and HTTP error statuses into structured ApiErrors.
 *
 * @param {'get'|'post'|'put'|'delete'} method - HTTP method
 * @param {string} url - Relative endpoint URL under /api
 * @param {object} [data] - Request payload for POST/PUT
 * @returns {Promise<any>} Response body data returned by Django
 */
async function call(method, url, data) {
  try {
    const res = await aiClient.request({ method, url, data });
    return res.data;
  } catch (err) {
    // If Django returned a response with non-2xx status code
    if (err.response) {
      throw new ApiError(502, `AI service error: ${err.response.data?.message || err.response.status}`);
    }
    // If connection timed out or socket refused connection (Django service offline)
    throw new ApiError(503, 'AI service is unavailable');
  }
}

/**
 * Public service methods wrapping Django DRF endpoints.
 */
export const aiService = {
  /** Liveness check endpoint (GET /api/health/) */
  health: () => call('get', '/health/'),

  /** Rule-based resume sectioner & skill extractor (POST /api/resume/parse/) */
  parseResume: (payload) => call('post', '/resume/parse/', payload),

  /** Compares candidate skills against authoritative role requirements (POST /api/skills/gap/) */
  skillGap: (payload) => call('post', '/skills/gap/', payload),

  /** Calculates baseline career readiness heuristic (POST /api/readiness/predict/) */
  predictReadiness: (payload) => call('post', '/readiness/predict/', payload),

  /** Generates deterministic week-by-week learning roadmap (POST /api/roadmap/recommend/) */
  recommendRoadmap: (payload) => call('post', '/roadmap/recommend/', payload),

  /** Unified inference endpoint running all 7 ML models + SHAP tree explanations (POST /api/predict/) */
  predict: (payload) => call('post', '/predict/', payload),
};
