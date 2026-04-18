import { Request, Response } from 'express';
import crypto from 'crypto';
import { TicketLinkModel, getRedisClient, CACHE_KEYS, CACHE_TTL } from '@dizee-tickets/shared';

export async function handleLinkRedirect(req: Request, res: Response) {
  try {
    const code = req.params.code as string;
    if (!code) return res.status(400).json({ error: 'Link code is required' });

    const redis = getRedisClient();
    const cacheKey = CACHE_KEYS.linkRedirect(code);

    // Check Redis cache first
    let cached = await redis.get(cacheKey).catch(() => null);

    if (cached) {
      const data = JSON.parse(cached);
      fireClickEvent(data.linkId, data.showId, req);
      return res.redirect(302, data.destinationUrl);
    }

    // Fallback to DB
    const link = await TicketLinkModel.findOne({ shortCode: code, status: 'active' });
    if (!link) return res.status(404).json({ error: 'Link not found or inactive' });

    // Cache for next time
    const cacheData = { linkId: link._id.toString(), showId: link.showId.toString(), destinationUrl: link.destinationUrl };
    await redis.set(cacheKey, JSON.stringify(cacheData), 'EX', CACHE_TTL.linkRedirect).catch(() => {});

    fireClickEvent(link._id.toString(), link.showId.toString(), req);
    return res.redirect(302, link.destinationUrl);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function fireClickEvent(linkId: string, showId: string, req: Request) {
  const ipRaw = req.ip || req.headers['x-forwarded-for'] || '';
  const ipHash = crypto.createHash('sha256').update(String(ipRaw)).digest('hex').slice(0, 16);
  const ua = req.headers['user-agent'] || '';
  const referrer = req.headers['referer'] || '';
  const device = /mobile/i.test(ua) ? 'mobile' : /tablet/i.test(ua) ? 'tablet' : 'desktop';

  // Push to Redis list for batch processing (non-blocking)
  const redis = getRedisClient();
  const clickData = JSON.stringify({ ticketLinkId: linkId, showId, ipHash, userAgent: ua.slice(0, 200), referrer: referrer.slice(0, 500), device });
  redis.lpush('clicks:pending', clickData).catch(() => {});
}
