import { Router } from 'express';
import { signup, login, logout, me, verifyEmail, forgotPassword, resetPassword, protectAuth } from '../controllers/auth';
import { requireAuth } from '../middleware/auth';
import { authRateLimiter } from '../middleware/security';

const router = Router();

router.post('/protect', authRateLimiter, protectAuth);
router.post('/signup', authRateLimiter, signup);
router.post('/login', authRateLimiter, login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);

export default router;
