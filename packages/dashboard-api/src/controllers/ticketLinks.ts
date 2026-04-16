import { Response } from 'express';
import { TicketLinkModel, TicketClickModel, apiResponse, createTicketLinkSchema, updateTicketLinkSchema, generateUniqueSlug, generateShortCode } from '@dizee-tickets/shared';
import { AuthenticatedRequest } from '@dizee-tickets/shared';

export async function createTicketLink(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = createTicketLinkSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));

    const slug = generateUniqueSlug(parsed.data.name);
    const shortCode = generateShortCode();

    const link = await TicketLinkModel.create({
      ...parsed.data,
      slug,
      shortCode,
      organizationId: req.organizationId,
      createdByUserId: req.user!._id,
    });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    return res.status(201).json(new apiResponse(201, 'Ticket link created', {
      ticketLink: link,
      shortUrl: `${baseUrl}/l/${shortCode}`,
    }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, error.message));
  }
}

export async function getTicketLinks(req: AuthenticatedRequest, res: Response) {
  try {
    const filter: Record<string, unknown> = { organizationId: req.organizationId };
    if (req.query.showId) filter.showId = req.query.showId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;

    const links = await TicketLinkModel.find(filter)
      .populate('showId', 'title slug date venueId')
      .sort({ createdAt: -1 });

    return res.status(200).json(new apiResponse(200, 'Ticket links', { ticketLinks: links }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getTicketLink(req: AuthenticatedRequest, res: Response) {
  try {
    const link = await TicketLinkModel.findOne({ _id: req.params.id, organizationId: req.organizationId })
      .populate('showId');
    if (!link) return res.status(404).json(new apiResponse(404, 'Ticket link not found'));
    return res.status(200).json(new apiResponse(200, 'Ticket link', { ticketLink: link }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function updateTicketLink(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = updateTicketLinkSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));

    const link = await TicketLinkModel.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      parsed.data,
      { new: true }
    );
    if (!link) return res.status(404).json(new apiResponse(404, 'Ticket link not found'));
    return res.status(200).json(new apiResponse(200, 'Ticket link updated', { ticketLink: link }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getTicketLinkStats(req: AuthenticatedRequest, res: Response) {
  try {
    const link = await TicketLinkModel.findOne({ _id: req.params.id, organizationId: req.organizationId });
    if (!link) return res.status(404).json(new apiResponse(404, 'Ticket link not found'));

    const clicksByDay = await TicketClickModel.aggregate([
      { $match: { ticketLinkId: link._id } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]);

    const clicksByDevice = await TicketClickModel.aggregate([
      { $match: { ticketLinkId: link._id } },
      { $group: { _id: '$device', count: { $sum: 1 } } },
    ]);

    const clicksByCountry = await TicketClickModel.aggregate([
      { $match: { ticketLinkId: link._id } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    return res.status(200).json(new apiResponse(200, 'Ticket link stats', {
      ticketLink: link,
      analytics: { clicksByDay, clicksByDevice, clicksByCountry },
    }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}
