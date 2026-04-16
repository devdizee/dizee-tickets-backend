import { Request, Response } from 'express';
import { GuestListModel, GuestRequestModel, apiResponse, submitGuestRequestSchema } from '@dizee-tickets/shared';

export async function submitGuestRequest(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const guestList = await GuestListModel.findOne({ slug, enabled: true });
    if (!guestList) return res.status(404).json(new apiResponse(404, 'Guest list not found or closed'));

    if (guestList.closeAt && new Date() > guestList.closeAt) {
      return res.status(400).json(new apiResponse(400, 'Guest list is closed'));
    }

    if (guestList.capacity) {
      const currentCount = await GuestRequestModel.aggregate([
        { $match: { guestListId: guestList._id, status: { $in: ['pending', 'approved'] } } },
        { $group: { _id: null, total: { $sum: '$guestCount' } } },
      ]);
      if (currentCount[0]?.total >= guestList.capacity) {
        return res.status(400).json(new apiResponse(400, 'Guest list is full'));
      }
    }

    const parsed = submitGuestRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));

    const status = guestList.requireApproval ? 'pending' : 'approved';
    const request = await GuestRequestModel.create({
      ...parsed.data,
      guestListId: guestList._id,
      showId: guestList.showId,
      status,
      approvedAt: status === 'approved' ? new Date() : undefined,
    });

    return res.status(201).json(new apiResponse(201, status === 'approved' ? 'You\'re on the guest list!' : 'Request submitted for approval', { request }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getPublicGuestList(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const guestList = await GuestListModel.findOne({ slug, enabled: true }).populate({
      path: 'showId',
      select: 'title date doorsTime showTime slug',
      populate: { path: 'venueId', select: 'name city' },
    });
    if (!guestList) return res.status(404).json(new apiResponse(404, 'Guest list not found'));

    const isClosed = guestList.closeAt ? new Date() > guestList.closeAt : false;

    return res.status(200).json(new apiResponse(200, 'Guest list', {
      guestList: { slug: guestList.slug, requireApproval: guestList.requireApproval, isClosed },
      show: guestList.showId,
    }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}
