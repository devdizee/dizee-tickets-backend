import { Router } from 'express';
import { getGuestListShows, submitGuestListRequest } from '../controllers/guestlistHub';

const router = Router();

router.get('/:slug/shows', getGuestListShows);
router.post('/:slug/request', submitGuestListRequest);

export default router;
