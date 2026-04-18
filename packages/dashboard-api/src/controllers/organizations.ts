import { Response } from 'express';
import {
  OrganizationModel, MembershipModel, apiResponse,
  createOrgSchema, updateOrgSchema, inviteMemberSchema,
  generateSlug, generateUniqueSlug, sendInviteEmail,
} from '@dizee-tickets/shared';
import { AuthenticatedRequest } from '@dizee-tickets/shared';
import crypto from 'crypto';

export async function createOrganization(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = createOrgSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));

    const slug = generateUniqueSlug(parsed.data.name);

    const org = await OrganizationModel.create({ ...parsed.data, slug });

    await MembershipModel.create({
      userId: req.user!._id,
      organizationId: org._id,
      role: 'owner',
      status: 'active',
    });

    return res.status(201).json(new apiResponse(201, 'Organization created', { organization: org }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, error.message));
  }
}

export async function getMyOrganizations(req: AuthenticatedRequest, res: Response) {
  try {
    const memberships = await MembershipModel.find({ userId: req.user!._id, status: 'active' }).populate('organizationId');
    const orgs = memberships.map((m) => ({ organization: m.organizationId, role: m.role, membershipId: m._id }));
    return res.status(200).json(new apiResponse(200, 'Organizations', { organizations: orgs }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getOrganization(req: AuthenticatedRequest, res: Response) {
  try {
    const org = await OrganizationModel.findById(req.params.id);
    if (!org) return res.status(404).json(new apiResponse(404, 'Organization not found'));
    return res.status(200).json(new apiResponse(200, 'Organization', { organization: org }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function updateOrganization(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = updateOrgSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));

    if (parsed.data.slug) {
      const existing = await OrganizationModel.findOne({ slug: parsed.data.slug, _id: { $ne: req.params.id } });
      if (existing) return res.status(409).json(new apiResponse(409, 'Username is already taken'));
    }

    const org = await OrganizationModel.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
    if (!org) return res.status(404).json(new apiResponse(404, 'Organization not found'));

    return res.status(200).json(new apiResponse(200, 'Organization updated', { organization: org }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function inviteMember(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = inviteMemberSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));

    const orgId = req.params.id;
    const org = await OrganizationModel.findById(orgId);
    if (!org) return res.status(404).json(new apiResponse(404, 'Organization not found'));

    const existing = await MembershipModel.findOne({ organizationId: orgId, inviteEmail: parsed.data.email.toLowerCase() });
    if (existing) return res.status(409).json(new apiResponse(409, 'User already invited'));

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    await MembershipModel.create({
      userId: req.user!._id, // placeholder — updated on accept
      organizationId: orgId,
      role: parsed.data.role,
      invitedByUserId: req.user!._id,
      inviteEmail: parsed.data.email.toLowerCase(),
      inviteToken,
      status: 'pending',
    });

    await sendInviteEmail(
      parsed.data.email,
      req.user!.name,
      org.name,
      `${frontendUrl}/invite/accept?token=${inviteToken}`
    ).catch(() => {});

    return res.status(201).json(new apiResponse(201, 'Invitation sent'));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function acceptInvite(req: AuthenticatedRequest, res: Response) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json(new apiResponse(400, 'Token is required'));

    const membership = await MembershipModel.findOne({ inviteToken: token, status: 'pending' } as any).select('+inviteToken');
    if (!membership) return res.status(404).json(new apiResponse(404, 'Invalid or expired invitation'));

    membership.userId = req.user!._id;
    membership.status = 'active';
    membership.inviteAcceptedAt = new Date();
    membership.inviteToken = undefined;
    await membership.save();

    return res.status(200).json(new apiResponse(200, 'Invitation accepted'));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getMembers(req: AuthenticatedRequest, res: Response) {
  try {
    const members = await MembershipModel.find({ organizationId: req.params.id })
      .populate('userId', 'name email avatarUrl')
      .sort({ createdAt: -1 });
    return res.status(200).json(new apiResponse(200, 'Members', { members }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function updateMemberRole(req: AuthenticatedRequest, res: Response) {
  try {
    const { role } = req.body;
    const membership = await MembershipModel.findByIdAndUpdate(req.params.memberId, { role }, { new: true });
    if (!membership) return res.status(404).json(new apiResponse(404, 'Member not found'));
    return res.status(200).json(new apiResponse(200, 'Role updated', { membership }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function removeMember(req: AuthenticatedRequest, res: Response) {
  try {
    const membership = await MembershipModel.findByIdAndUpdate(req.params.memberId, { status: 'revoked' }, { new: true });
    if (!membership) return res.status(404).json(new apiResponse(404, 'Member not found'));
    return res.status(200).json(new apiResponse(200, 'Member removed'));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}
