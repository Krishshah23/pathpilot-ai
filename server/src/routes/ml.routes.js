import { Router } from 'express';
import { predict } from '../controllers/ml.controller.js';

const router = Router();

// POST /api/ml/predict — unified ML predictions from all 7 trained models
router.post('/predict', predict);

export default router;
