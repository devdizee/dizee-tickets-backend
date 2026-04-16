import { Router } from 'express';
import { requireAuth, requireOrgAccess, requireRole } from '../middleware/auth';
import { createTicketLink, getTicketLinks, getTicketLink, updateTicketLink, getTicketLinkStats } from '../controllers/ticketLinks';

const router = Router();

router.use(requireAuth, requireOrgAccess);

router.post('/', requireRole('owner', 'admin', 'editor'), createTicketLink);
router.get('/', getTicketLinks);
router.get('/:id', getTicketLink);
router.put('/:id', requireRole('owner', 'admin', 'editor'), updateTicketLink);
router.get('/:id/stats', getTicketLinkStats);

export default router;
