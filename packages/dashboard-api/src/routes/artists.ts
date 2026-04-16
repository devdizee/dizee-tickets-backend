import { Router } from 'express';
import { requireAuth, requireOrgAccess, requireRole } from '../middleware/auth';
import { createArtist, getArtists, getArtist, updateArtist } from '../controllers/artists';

const router = Router();

router.use(requireAuth, requireOrgAccess);

router.post('/', requireRole('owner', 'admin'), createArtist);
router.get('/', getArtists);
router.get('/:id', getArtist);
router.put('/:id', requireRole('owner', 'admin', 'editor'), updateArtist);

export default router;
