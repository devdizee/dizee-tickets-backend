import { Router } from 'express';
import { requireAuth, requireOrgAccess } from '../middleware/auth';
import { getRadius } from '../controllers/ticketmaster';

const router = Router();

router.use(requireAuth, requireOrgAccess);

router.get('/radius', getRadius);

export default router;
