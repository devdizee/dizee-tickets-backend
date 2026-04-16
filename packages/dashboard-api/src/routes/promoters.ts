import { Router } from 'express';
import { requireAuth, requireOrgAccess, requireRole } from '../middleware/auth';
import { createPromoter, getPromoters, getPromoter, updatePromoter } from '../controllers/promoters';

const router = Router();

router.use(requireAuth, requireOrgAccess);

router.post('/', requireRole('owner', 'admin'), createPromoter);
router.get('/', getPromoters);
router.get('/:id', getPromoter);
router.put('/:id', requireRole('owner', 'admin', 'editor'), updatePromoter);

export default router;
