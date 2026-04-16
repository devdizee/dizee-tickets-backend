import { Request, Response } from 'express';
import { ShowModel, apiResponse, getRedisClient, CACHE_KEYS, CACHE_TTL } from '@dizee-tickets/shared';

export async function getPublicShow(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const redis = getRedisClient();
    const cacheKey = `public:show:${slug}`;

    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      return res.status(200).json(new apiResponse(200, 'Show', { show: JSON.parse(cached) }));
    }

    const show = await ShowModel.findOne({ slug, status: { $in: ['on_sale', 'sold_out', 'confirmed'] } })
      .populate('artistId', 'name slug imageUrl')
      .populate('venueId', 'name city country capacity')
      .select('title slug date doorsTime showTime status capacity ticketsSold publicTicketUrl artistId venueId');

    if (!show) return res.status(404).json(new apiResponse(404, 'Show not found'));

    await redis.set(cacheKey, JSON.stringify(show.toJSON()), 'EX', CACHE_TTL.showData).catch(() => {});

    return res.status(200).json(new apiResponse(200, 'Show', { show }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}
