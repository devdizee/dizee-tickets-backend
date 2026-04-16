import { Router } from 'express';
import { requireAuth, requireOrgAccess, requireRole } from '../middleware/auth';
import { createVenue, getVenues, getVenue, updateVenue } from '../controllers/venues';

const router = Router();

router.use(requireAuth, requireOrgAccess);

router.post('/', requireRole('owner', 'admin', 'editor'), createVenue);
router.get('/', getVenues);
router.get('/:id', getVenue);
router.put('/:id', requireRole('owner', 'admin', 'editor'), updateVenue);

export default router;
