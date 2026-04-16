import { Router } from 'express';
import { requireAuth, requireOrgAccess, requireRole } from '../middleware/auth';
import { createGuestList, getGuestList, updateGuestList, approveGuestRequest, rejectGuestRequest, exportGuestList } from '../controllers/guestList';

const router = Router();

router.use(requireAuth, requireOrgAccess);

router.post('/', requireRole('owner', 'admin', 'editor'), createGuestList);
router.get('/show/:showId', getGuestList);
router.put('/:id', requireRole('owner', 'admin', 'editor'), updateGuestList);
router.post('/requests/:requestId/approve', requireRole('owner', 'admin', 'editor'), approveGuestRequest);
router.post('/requests/:requestId/reject', requireRole('owner', 'admin', 'editor'), rejectGuestRequest);
router.get('/show/:showId/export', exportGuestList);

export default router;
