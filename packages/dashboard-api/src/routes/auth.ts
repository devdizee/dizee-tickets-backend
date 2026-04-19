import { Router } from 'express';
import {
  signup, login, logout, me, updateMe, deleteAccount, verifyOtpSession, verifyEmail, forgotPassword, resetPassword, protectAuth,
  checkEmail, sendOtp, loginWithOtp, signupInit, signupVerify,
} from '../controllers/auth';
import { requireAuth } from '../middleware/auth';
import { authRateLimiter } from '../middleware/security';

const router = Router();

// Site protection
router.post('/protect', authRateLimiter, protectAuth);

// OTP-based auth (primary flow)
router.get('/checkemail', authRateLimiter, checkEmail);
router.post('/send-otp', authRateLimiter, sendOtp);
router.post('/login-otp', authRateLimiter, loginWithOtp);
router.post('/signup-init', authRateLimiter, signupInit);
router.post('/signup-verify', authRateLimiter, signupVerify);

// Legacy password-based auth (kept for compatibility)
router.post('/signup', authRateLimiter, signup);
router.post('/login', authRateLimiter, login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.patch('/me', requireAuth, updateMe);
router.delete('/me', requireAuth, deleteAccount);
router.post('/verify-otp', requireAuth, verifyOtpSession);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);

export default router;
