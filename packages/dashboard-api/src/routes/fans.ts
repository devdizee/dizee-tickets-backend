import { Router } from 'express';
import { requireAuth, requireOrgAccess } from '../middleware/auth';
import { getFans, getFan, exportFans } from '../controllers/fans';

const router = Router();

router.use(requireAuth, requireOrgAccess);

router.get('/', getFans);
router.get('/export', exportFans);
router.get('/:id', getFan);

export default router;
