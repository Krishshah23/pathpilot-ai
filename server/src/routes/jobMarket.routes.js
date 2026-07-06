import { Router } from 'express';
import { getMarketData, getMarketSalary, triggerRefresh } from '../controllers/jobMarket.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = Router();

// All job-market routes require authentication.
router.use(protect);

// Any authenticated user can query market data.
router.get('/:role', getMarketData);
router.get('/:role/salary', getMarketSalary);

// Only admins can force a refresh (the cron handles regular updates).
router.post('/refresh', authorize('admin'), triggerRefresh);

export default router;
