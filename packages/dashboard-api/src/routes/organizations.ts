import { Router } from 'express';
import { requireAuth, requireOrgAccess, requireRole } from '../middleware/auth';
import {
  createOrganization, getMyOrganizations, getOrganization, updateOrganization,
  inviteMember, acceptInvite, getMembers, updateMemberRole, removeMember,
} from '../controllers/organizations';

const router = Router();

router.post('/', requireAuth, createOrganization);
router.get('/mine', requireAuth, getMyOrganizations);
router.get('/:id', requireAuth, getOrganization);
router.put('/:id', requireAuth, requireOrgAccess, requireRole('owner', 'admin'), updateOrganization);

router.post('/:id/invite', requireAuth, requireOrgAccess, requireRole('owner', 'admin'), inviteMember);
router.post('/invite/accept', requireAuth, acceptInvite);
router.get('/:id/members', requireAuth, requireOrgAccess, getMembers);
router.put('/:id/members/:memberId/role', requireAuth, requireOrgAccess, requireRole('owner', 'admin'), updateMemberRole);
router.delete('/:id/members/:memberId', requireAuth, requireOrgAccess, requireRole('owner', 'admin'), removeMember);

export default router;
