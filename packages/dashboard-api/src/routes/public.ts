import { Router } from 'express';
import {
  getPublicTicketPage,
  verifyPublicTicketPassword,
  getPublicGuestPage,
  verifyPublicGuestPassword,
  submitPublicGuestRequest,
} from '../controllers/publicPages';

const router = Router();

router.get('/ticket-page/:orgSlug/:showSlug', getPublicTicketPage);
router.post('/ticket-page/:orgSlug/:showSlug/verify', verifyPublicTicketPassword);

router.get('/guest-page/:orgSlug/:showSlug', getPublicGuestPage);
router.post('/guest-page/:orgSlug/:showSlug/verify', verifyPublicGuestPassword);
router.post('/guest-page/:orgSlug/:showSlug/request', submitPublicGuestRequest);

export default router;
