import { Router } from 'express';
import { submitWaitlist } from '../controllers/waitlist';
import { authRateLimiter } from '../middleware/security';

const router = Router();

router.post('/submit', authRateLimiter, submitWaitlist);

export default router;
