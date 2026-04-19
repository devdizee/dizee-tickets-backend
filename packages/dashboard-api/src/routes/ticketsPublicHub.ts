import { Router } from 'express';
import { getTicketShows, submitTicketPurchase } from '../controllers/ticketsHub';

const router = Router();

router.get('/:slug/shows', getTicketShows);
router.post('/:slug/purchase', submitTicketPurchase);

export default router;
