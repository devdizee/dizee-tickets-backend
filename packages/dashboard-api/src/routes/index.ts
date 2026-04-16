import { Router } from 'express';
import authRoutes from './auth';
import orgRoutes from './organizations';
import showRoutes from './shows';
import tourRoutes from './tours';
import ticketLinkRoutes from './ticketLinks';
import guestListRoutes from './guestList';
import fanRoutes from './fans';
import artistRoutes from './artists';
import promoterRoutes from './promoters';
import venueRoutes from './venues';

const router = Router();

router.use('/auth', authRoutes);
router.use('/orgs', orgRoutes);
router.use('/shows', showRoutes);
router.use('/tours', tourRoutes);
router.use('/ticket-links', ticketLinkRoutes);
router.use('/guest-lists', guestListRoutes);
router.use('/fans', fanRoutes);
router.use('/artists', artistRoutes);
router.use('/promoters', promoterRoutes);
router.use('/venues', venueRoutes);

export default router;
