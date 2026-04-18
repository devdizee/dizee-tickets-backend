import { Router } from 'express';
import { requireAuth, requireOrgAccess } from '../middleware/auth';
import { chatWithAI } from '../controllers/ai';

const router = Router();

router.use(requireAuth, requireOrgAccess);

router.post('/chat', chatWithAI);

export default router;
