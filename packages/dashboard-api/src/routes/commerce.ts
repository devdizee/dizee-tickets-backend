import { Router } from 'express';
import { requireAuth, requireOrgAccess, requireRole } from '../middleware/auth';
import {
  listMerch,
  getMerch,
  createMerch,
  updateMerch,
  deleteMerch,
} from '../controllers/commerce';

const router = Router();

router.use(requireAuth, requireOrgAccess);

router.get('/', listMerch);
router.get('/:id', getMerch);
router.post('/', requireRole('owner', 'admin', 'editor'), createMerch);
router.patch('/:id', requireRole('owner', 'admin', 'editor'), updateMerch);
router.delete('/:id', requireRole('owner', 'admin'), deleteMerch);

export default router;
