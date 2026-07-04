import axios from 'axios';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/*
  Thin client for the Django ML service. This is the ONLY module that talks to
  Django — feature controllers call these functions, never axios directly, so
  the integration (base URL, auth header, error handling) lives in one place.
*/

const aiClient = axios.create({
  baseURL: `${env.aiServiceUrl}/api`,
  timeout: 15000,
  headers: { 'X-Internal-Key': env.internalApiKey },
});

/** Wraps a Django call, translating transport/HTTP errors into ApiErrors. */
async function call(method, url, data) {
  try {
    const res = await aiClient.request({ method, url, data });
    return res.data;
  } catch (err) {
    if (err.response) {
      throw new ApiError(502, `AI service error: ${err.response.data?.message || err.response.status}`);
    }
    throw new ApiError(503, 'AI service is unavailable');
  }
}

export const aiService = {
  health: () => call('get', '/health/'),
  parseResume: (payload) => call('post', '/resume/parse/', payload),
  skillGap: (payload) => call('post', '/skills/gap/', payload),
  predictReadiness: (payload) => call('post', '/readiness/predict/', payload),
  recommendRoadmap: (payload) => call('post', '/roadmap/recommend/', payload),
  predict: (payload) => call('post', '/predict/', payload),
};
