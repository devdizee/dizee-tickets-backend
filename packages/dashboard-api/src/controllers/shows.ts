import { Response } from 'express';
import { ShowModel, apiResponse, createShowSchema, updateShowSchema, generateUniqueSlug, syncShowFromTicketSocket } from '@dizee-tickets/shared';
import { AuthenticatedRequest } from '@dizee-tickets/shared';

export async function createShow(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = createShowSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));

    const slug = generateUniqueSlug(parsed.data.title);
    const show = await ShowModel.create({
      ...parsed.data,
      slug,
      organizationId: req.organizationId,
      date: new Date(parsed.data.date),
    });

    return res.status(201).json(new apiResponse(201, 'Show created', { show }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, error.message));
  }
}

export async function getShows(req: AuthenticatedRequest, res: Response) {
  try {
    const { page = 1, limit = 50, status, artistId, promoterId, venueId, tourId } = req.query;
    const filter: Record<string, unknown> = { organizationId: req.organizationId };

    if (status) filter.status = status;
    if (artistId) filter.artistId = artistId;
    if (promoterId) filter.promoterId = promoterId;
    if (venueId) filter.venueId = venueId;
    if (tourId) filter.tourId = tourId;

    const skip = (Number(page) - 1) * Number(limit);
    const [shows, total] = await Promise.all([
      ShowModel.find(filter)
        .populate('artistId', 'name slug imageUrl')
        .populate('promoterId', 'name slug')
        .populate('venueId', 'name city capacity')
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ShowModel.countDocuments(filter),
    ]);

    return res.status(200).json(new apiResponse(200, 'Shows', {
      shows,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getShow(req: AuthenticatedRequest, res: Response) {
  try {
    const show = await ShowModel.findOne({ _id: req.params.id, organizationId: req.organizationId })
      .populate('artistId')
      .populate('promoterId')
      .populate('venueId')
      .populate('tourId');
    if (!show) return res.status(404).json(new apiResponse(404, 'Show not found'));
    return res.status(200).json(new apiResponse(200, 'Show', { show }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function updateShow(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = updateShowSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.date) updateData.date = new Date(parsed.data.date);

    const show = await ShowModel.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      updateData,
      { new: true }
    );
    if (!show) return res.status(404).json(new apiResponse(404, 'Show not found'));
    return res.status(200).json(new apiResponse(200, 'Show updated', { show }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function deleteShow(req: AuthenticatedRequest, res: Response) {
  try {
    const show = await ShowModel.findOneAndDelete({ _id: req.params.id, organizationId: req.organizationId });
    if (!show) return res.status(404).json(new apiResponse(404, 'Show not found'));
    return res.status(200).json(new apiResponse(200, 'Show deleted'));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getShowStats(req: AuthenticatedRequest, res: Response) {
  try {
    const show = await ShowModel.findOne({ _id: req.params.id, organizationId: req.organizationId });
    if (!show) return res.status(404).json(new apiResponse(404, 'Show not found'));

    const { TicketLinkModel, TicketOrderModel, GuestRequestModel } = await import('@dizee-tickets/shared');

    const [links, orderAgg, guestCounts] = await Promise.all([
      TicketLinkModel.find({ showId: show._id }).select('name type clicks orders ticketsSold grossSales status'),
      TicketOrderModel.aggregate([
        { $match: { showId: show._id } },
        { $group: { _id: null, totalOrders: { $sum: 1 }, totalQuantity: { $sum: '$quantity' }, totalGross: { $sum: '$grossAmount' } } },
      ]),
      GuestRequestModel.aggregate([
        { $match: { showId: show._id } },
        { $group: { _id: '$status', count: { $sum: 1 }, totalGuests: { $sum: '$guestCount' } } },
      ]),
    ]);

    return res.status(200).json(new apiResponse(200, 'Show stats', {
      show,
      ticketLinks: links,
      orders: orderAgg[0] || { totalOrders: 0, totalQuantity: 0, totalGross: 0 },
      guestList: guestCounts,
    }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function syncShow(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await syncShowFromTicketSocket(req.params.id);
    const status = result.success ? 200 : 400;
    return res.status(status).json(new apiResponse(status, result.message));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}
