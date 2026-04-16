import { Router } from 'express';
import { handleTicketSocketWebhook } from '../handlers/ticketsocket';
import { handleStripeWebhook } from '../handlers/stripe';

const router = Router();

router.post('/ticketsocket', handleTicketSocketWebhook);
router.post('/stripe', handleStripeWebhook);

export default router;
