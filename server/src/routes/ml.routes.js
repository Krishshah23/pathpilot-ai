/**
 * routes/ml.routes.js — Pass-through Proxy Router for Django ML Models
 *
 * ENDPOINTS:
 * - POST /api/ml/predict → Unified endpoint forwarding request to Django ML service
 *   (runs all 7 CatBoost/XGBoost models + SHAP TreeExplainer drivers)
 */

import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { predict } from '../controllers/ml.controller.js';

const router = Router();

router.post('/predict', protect, predict);

export default router;
