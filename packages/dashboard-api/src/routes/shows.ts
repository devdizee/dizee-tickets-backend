import { Router } from 'express';
import { requireAuth, requireOrgAccess, requireRole } from '../middleware/auth';
import { createShow, getShows, getShow, updateShow, deleteShow, getShowStats, syncShow } from '../controllers/shows';

const router = Router();

router.use(requireAuth, requireOrgAccess);

router.post('/', requireRole('owner', 'admin', 'editor'), createShow);
router.get('/', getShows);
router.get('/:id', getShow);
router.put('/:id', requireRole('owner', 'admin', 'editor'), updateShow);
router.delete('/:id', requireRole('owner', 'admin'), deleteShow);
router.get('/:id/stats', getShowStats);
router.post('/:id/sync', requireRole('owner', 'admin'), syncShow);

export default router;
