import { Router } from 'express';
import { requireAuth, requireOrgAccess } from '../middleware/auth';
import {
  listActivity,
  createActivity,
  updateActivityStatus,
  getActivityProgress,
} from '../controllers/activity';

const router = Router();

router.use(requireAuth, requireOrgAccess);

router.get('/', listActivity);
router.post('/', createActivity);
router.get('/progress', getActivityProgress);
router.put('/:id/status', updateActivityStatus);

export default router;
