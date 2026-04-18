import { Response } from 'express';
import { ShowModel, apiResponse, createShowSchema, updateShowSchema, generateUniqueSlug } from '@dizee-tickets/shared';
import { AuthenticatedRequest } from '@dizee-tickets/shared';
import { logActivity } from '../lib/activityLogger';

export async function createShow(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = createShowSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));

    const title = `${parsed.data.artist} — ${parsed.data.venue || parsed.data.city || parsed.data.perf_date}`;
    const slug = generateUniqueSlug(title);
    const show = await ShowModel.create({
      ...parsed.data,
      title,
      slug,
      organizationId: req.organizationId,
    });

    await logActivity({
      section: 'shows',
      action: 'add',
      itemId: show._id.toString(),
      itemName: show.title || show.artist,
      detail: `Created show "${show.title || show.artist}"`,
      userId: req.user?._id,
      userEmail: req.user?.email,
      userName: req.user?.name,
      orgId: req.organizationId!,
      status: 'completed',
    });

    return res.status(201).json(new apiResponse(201, 'Show created', { show }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, error.message));
  }
}

export async function getShows(req: AuthenticatedRequest, res: Response) {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const filter: Record<string, unknown> = { organizationId: req.organizationId };

    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [shows, total] = await Promise.all([
      ShowModel.find(filter)
        .sort({ perf_date: -1 })
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
    const show = await ShowModel.findOne({ _id: req.params.id, organizationId: req.organizationId });
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

    const show = await ShowModel.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      parsed.data,
      { new: true }
    );
    if (!show) return res.status(404).json(new apiResponse(404, 'Show not found'));

    await logActivity({
      section: 'shows',
      action: 'edit',
      itemId: show._id.toString(),
      itemName: show.title || show.artist,
      detail: `Updated show "${show.title || show.artist}"`,
      userId: req.user?._id,
      userEmail: req.user?.email,
      userName: req.user?.name,
      orgId: req.organizationId!,
      status: 'completed',
    });

    return res.status(200).json(new apiResponse(200, 'Show updated', { show }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function deleteShow(req: AuthenticatedRequest, res: Response) {
  try {
    const show = await ShowModel.findOneAndDelete({ _id: req.params.id, organizationId: req.organizationId });
    if (!show) return res.status(404).json(new apiResponse(404, 'Show not found'));

    await logActivity({
      section: 'shows',
      action: 'delete',
      itemId: show._id.toString(),
      itemName: show.title || show.artist,
      detail: `Deleted show "${show.title || show.artist}"`,
      userId: req.user?._id,
      userEmail: req.user?.email,
      userName: req.user?.name,
      orgId: req.organizationId!,
      status: 'completed',
    });

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
    const { syncShowFromTicketSocket } = await import('@dizee-tickets/shared');
    const result = await syncShowFromTicketSocket(req.params.id as string);
    const status = result.success ? 200 : 400;
    return res.status(status).json(new apiResponse(status, result.message));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getShowStatsOverview(req: AuthenticatedRequest, res: Response) {
  try {
    const now = new Date().toISOString().split('T')[0];
    const orgFilter = { organizationId: req.organizationId };

    const [totalShows, upcomingShows, allShows] = await Promise.all([
      ShowModel.countDocuments(orgFilter),
      ShowModel.countDocuments({ ...orgFilter, perf_date: { $gte: now } }),
      ShowModel.find(orgFilter).select('tix_sold sellable_cap').lean(),
    ]);

    const ticketsSold = allShows.reduce((s, sh) => s + (sh.tix_sold ?? 0), 0);
    const grossSales = 0;

    return res.status(200).json(new apiResponse(200, 'Overview stats', {
      totalShows,
      upcomingShows,
      ticketsSold,
      grossSales,
    }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}
