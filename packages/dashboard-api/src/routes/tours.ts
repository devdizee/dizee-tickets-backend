import { Router } from 'express';
import { requireAuth, requireOrgAccess, requireRole } from '../middleware/auth';
import { createTour, getTours, getTour, updateTour, deleteTour } from '../controllers/tours';

const router = Router();

router.use(requireAuth, requireOrgAccess);

router.post('/', requireRole('owner', 'admin', 'editor'), createTour);
router.get('/', getTours);
router.get('/:id', getTour);
router.put('/:id', requireRole('owner', 'admin', 'editor'), updateTour);
router.delete('/:id', requireRole('owner', 'admin'), deleteTour);

export default router;
