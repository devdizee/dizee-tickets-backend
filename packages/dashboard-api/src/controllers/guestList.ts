import { Response } from 'express';
import { GuestListModel, GuestRequestModel, apiResponse, createGuestListSchema, updateGuestListSchema, generateUniqueSlug, sendGuestListApprovalEmail } from '@dizee-tickets/shared';
import { AuthenticatedRequest } from '@dizee-tickets/shared';

export async function createGuestList(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = createGuestListSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));

    const existing = await GuestListModel.findOne({ showId: parsed.data.showId });
    if (existing) return res.status(409).json(new apiResponse(409, 'Guest list already exists for this show'));

    const slug = generateUniqueSlug('guestlist');
    const guestList = await GuestListModel.create({
      ...parsed.data,
      slug,
      organizationId: req.organizationId,
    });

    return res.status(201).json(new apiResponse(201, 'Guest list created', { guestList }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getGuestList(req: AuthenticatedRequest, res: Response) {
  try {
    const guestList = await GuestListModel.findOne({ showId: req.params.showId, organizationId: req.organizationId });
    if (!guestList) return res.status(404).json(new apiResponse(404, 'Guest list not found'));

    const requests = await GuestRequestModel.find({ guestListId: guestList._id }).sort({ createdAt: -1 });
    const stats = await GuestRequestModel.aggregate([
      { $match: { guestListId: guestList._id } },
      { $group: { _id: '$status', count: { $sum: 1 }, totalGuests: { $sum: '$guestCount' } } },
    ]);

    return res.status(200).json(new apiResponse(200, 'Guest list', { guestList, requests, stats }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function updateGuestList(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = updateGuestListSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));

    const guestList = await GuestListModel.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      parsed.data,
      { new: true }
    );
    if (!guestList) return res.status(404).json(new apiResponse(404, 'Guest list not found'));
    return res.status(200).json(new apiResponse(200, 'Guest list updated', { guestList }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function approveGuestRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const request = await GuestRequestModel.findByIdAndUpdate(
      req.params.requestId,
      { status: 'approved', approvedByUserId: req.user!._id, approvedAt: new Date() },
      { new: true }
    );
    if (!request) return res.status(404).json(new apiResponse(404, 'Guest request not found'));

    if (request.email) {
      const { ShowModel } = await import('@dizee-tickets/shared');
      const show = await ShowModel.findById(request.showId);
      if (show) {
        await sendGuestListApprovalEmail(
          request.email,
          request.name,
          show.title,
          show.date.toLocaleDateString()
        ).catch(() => {});
      }
    }

    return res.status(200).json(new apiResponse(200, 'Guest request approved', { request }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function rejectGuestRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const request = await GuestRequestModel.findByIdAndUpdate(
      req.params.requestId,
      { status: 'rejected' },
      { new: true }
    );
    if (!request) return res.status(404).json(new apiResponse(404, 'Guest request not found'));
    return res.status(200).json(new apiResponse(200, 'Guest request rejected', { request }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function exportGuestList(req: AuthenticatedRequest, res: Response) {
  try {
    const requests = await GuestRequestModel.find({ showId: req.params.showId, status: 'approved' }).sort({ name: 1 });
    const csv = ['Name,Email,Phone,Company,Guest Count,Notes,Status,Approved At']
      .concat(requests.map((r) => `"${r.name}","${r.email || ''}","${r.phone || ''}","${r.company || ''}",${r.guestCount},"${r.notes || ''}",${r.status},"${r.approvedAt?.toISOString() || ''}"`))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=guest-list-${req.params.showId}.csv`);
    return res.send(csv);
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}
