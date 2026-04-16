import { Response } from 'express';
import { FanModel, apiResponse } from '@dizee-tickets/shared';
import { AuthenticatedRequest } from '@dizee-tickets/shared';

export async function getFans(req: AuthenticatedRequest, res: Response) {
  try {
    const { page = 1, limit = 50, showId, city, source, search } = req.query;
    const filter: Record<string, unknown> = { organizationId: req.organizationId };

    if (showId) filter.showIds = showId;
    if (city) filter.city = { $regex: city, $options: 'i' };
    if (source) filter.source = source;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [fans, total] = await Promise.all([
      FanModel.find(filter).sort({ lastSeenAt: -1 }).skip(skip).limit(Number(limit)),
      FanModel.countDocuments(filter),
    ]);

    return res.status(200).json(new apiResponse(200, 'Fans', {
      fans,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getFan(req: AuthenticatedRequest, res: Response) {
  try {
    const fan = await FanModel.findOne({ _id: req.params.id, organizationId: req.organizationId }).populate('showIds', 'title date venueId');
    if (!fan) return res.status(404).json(new apiResponse(404, 'Fan not found'));
    return res.status(200).json(new apiResponse(200, 'Fan', { fan }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function exportFans(req: AuthenticatedRequest, res: Response) {
  try {
    const fans = await FanModel.find({ organizationId: req.organizationId }).sort({ lastSeenAt: -1 });
    const csv = ['Name,Email,Phone,City,Country,Source,Tickets Purchased,Total Spent,Opted In,First Seen']
      .concat(fans.map((f) => `"${f.name || ''}","${f.email || ''}","${f.phone || ''}","${f.city || ''}","${f.country || ''}","${f.source || ''}",${f.totalTicketsPurchased},${f.totalSpent},${f.marketingOptIn},"${f.firstSeenAt.toISOString()}"`))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=fans-export.csv');
    return res.send(csv);
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}
