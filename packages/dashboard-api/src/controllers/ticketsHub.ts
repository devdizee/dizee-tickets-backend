import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  OrganizationModel,
  ShowModel,
  FanModel,
  TicketOrderModel,
  apiResponse,
} from '@dizee-tickets/shared';

const ObjectId = mongoose.Types.ObjectId;

const RESERVED = new Set(['manage', 'api', 'static', 'assets']);

const MOCK_MAX_PER_ORDER = 10;
const MOCK_SERVICE_FEE_FLAT = 179;
const MOCK_SERVICE_FEE_PERCENT = 3.7;
const TIER_LABEL = 'General Admission';

const HUB_ELIGIBLE_SHOW_STATUSES = new Set([
  'pending',
  'confirmed',
  'announced',
  'on_sale',
  'paused',
  'sold_out',
]);

function parsePerfDate(perf_date: string | null | undefined): Date | null {
  if (!perf_date || perf_date === 'TBD') return null;
  const d = new Date(perf_date);
  return Number.isNaN(d.getTime()) ? null : d;
}

function slugifySegment(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'show'
  );
}

function confirmationCode(): string {
  return `DZ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/**
 * GET /api/v1/tickets/:slug/shows
 * Public hub — `slug` is the organization slug (same identifier as Links / subdomain).
 */
export async function getTicketShows(req: Request, res: Response) {
  try {
    const slugRaw = req.params.slug;
    const slug = typeof slugRaw === 'string' ? slugRaw : Array.isArray(slugRaw) ? slugRaw[0] : '';
    if (!slug) {
      return res.status(400).json(new apiResponse(400, 'Slug is required', {}, {}));
    }
    const normalized = slug.trim().toLowerCase();
    if (RESERVED.has(normalized)) {
      return res.status(404).json(new apiResponse(404, 'Artist not found', {}, {}));
    }

    const org = await OrganizationModel.findOne({ slug: normalized });
    if (!org) {
      return res.status(404).json(new apiResponse(404, 'Artist not found', {}, {}));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const rawShows = await ShowModel.find({
      organizationId: org._id,
      show_on_ticket_link: { $ne: false },
      status: { $in: [...HUB_ELIGIBLE_SHOW_STATUSES] },
    })
      .sort({ perf_date: 1 })
      .lean();

    const upcoming = rawShows.filter((b: any) => {
      const d = parsePerfDate(b.perf_date);
      if (!d) return false;
      return d >= today || String(b.perf_date) >= todayStr;
    });

    const showIds = upcoming.map((s: any) => s._id);

    const soldAgg =
      showIds.length > 0
        ? await TicketOrderModel.aggregate([
            {
              $match: {
                showId: { $in: showIds.map((id) => new ObjectId(String(id))) },
                orderStatus: { $ne: 'cancelled' },
              },
            },
            { $group: { _id: '$showId', total: { $sum: '$quantity' } } },
          ])
        : [];

    const soldMap = new Map<string, number>();
    for (const row of soldAgg) {
      soldMap.set(String(row._id), row.total);
    }

    const shows = upcoming.map((b: any) => {
      const soldOrders = soldMap.get(String(b._id)) ?? 0;
      const tixSold = typeof b.tix_sold === 'number' ? b.tix_sold : 0;
      const sold = Math.max(soldOrders, tixSold);

      const priceUsd = typeof b.ticket_public_price === 'number' ? b.ticket_public_price : 0;
      const priceCents = Math.round(priceUsd * 100);
      const hasPrice = priceCents > 0;

      const cap =
        typeof b.sellable_cap === 'number' && b.sellable_cap > 0
          ? b.sellable_cap
          : typeof b.ticket_public_quantity === 'number' && b.ticket_public_quantity > 0
            ? b.ticket_public_quantity
            : 1000;

      const remaining = Math.max(0, cap - sold);
      const tier = {
        label: TIER_LABEL,
        price: hasPrice ? priceCents : 0,
        remaining: hasPrice ? remaining : 0,
        maxPerOrder: MOCK_MAX_PER_ORDER,
        soldOut: !hasPrice || remaining === 0,
      };

      const salesOpen = b.on_sale !== false && b.status !== 'paused' && b.status !== 'sold_out';
      const tiers = [tier];
      const allSoldOut = tiers.every((t: { soldOut: boolean }) => t.soldOut);

      const publicShowSlugRaw = typeof b.slug === 'string' && b.slug.trim() ? b.slug.trim().toLowerCase() : '';

      return {
        id: String(b._id),
        date: b.perf_date || 'TBD',
        venue: b.venue || 'Venue TBD',
        location: [b.city, b.state].filter(Boolean).join(', ') || b.city || 'Location TBD',
        artist: b.artist || 'Artist TBD',
        eventTitle: b.title || null,
        showTime: b.show_time || null,
        tiers,
        ticketsAvailable: hasPrice,
        soldOut: allSoldOut,
        salesOpen: hasPrice && salesOpen,
        publicShowSlug: publicShowSlugRaw ? slugifySegment(publicShowSlugRaw) : null,
        serviceFeeFlat: MOCK_SERVICE_FEE_FLAT,
        serviceFeePercent: MOCK_SERVICE_FEE_PERCENT,
        currency: b.currency || 'USD',
      };
    });

    return res.status(200).json(
      new apiResponse(200, 'Ticket shows retrieved', {
        artist: {
          name: org.name,
          domain: org.slug,
          ticketSlug: org.slug,
          slug: org.slug,
          coverImage: org.logoUrl || null,
        },
        shows,
      }, {}),
    );
  } catch (e: any) {
    console.error('getTicketShows', e);
    return res.status(500).json(new apiResponse(500, 'Internal Server Error', {}, { message: e.message }));
  }
}

/**
 * POST /api/v1/tickets/:slug/purchase
 */
export async function submitTicketPurchase(req: Request, res: Response) {
  try {
    const slugRaw = req.params.slug;
    const slug = typeof slugRaw === 'string' ? slugRaw : Array.isArray(slugRaw) ? slugRaw[0] : '';
    const { bookingId, firstName, lastName, email, phone, ticketCount, tierLabel } = req.body;

    if (!slug) {
      return res.status(400).json(new apiResponse(400, 'Slug is required', {}, {}));
    }
    const normalized = slug.trim().toLowerCase();
    if (RESERVED.has(normalized)) {
      return res.status(404).json(new apiResponse(404, 'Artist not found', {}, {}));
    }
    if (!bookingId || !firstName || !lastName || !email || ticketCount == null || !tierLabel) {
      return res.status(400).json(
        new apiResponse(400, 'bookingId, firstName, lastName, email, ticketCount, and tierLabel are required', {}),
      );
    }
    const qty = Number(ticketCount);
    if (!Number.isFinite(qty) || qty < 1 || qty > 50) {
      return res.status(400).json(new apiResponse(400, 'ticketCount must be between 1 and 50', {}));
    }

    const org = await OrganizationModel.findOne({ slug: normalized });
    if (!org) {
      return res.status(404).json(new apiResponse(404, 'Artist not found', {}, {}));
    }

    const show = await ShowModel.findOne({
      _id: bookingId,
      organizationId: org._id,
    });
    if (!show) {
      return res.status(404).json(new apiResponse(404, 'Show not found or not eligible for ticket sales', {}));
    }

    const perfDate = parsePerfDate(show.perf_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (perfDate && perfDate < today) {
      return res.status(400).json(new apiResponse(400, 'This show has already passed', {}));
    }

    if (show.show_on_ticket_link === false) {
      return res.status(400).json(new apiResponse(400, 'Ticket sales are not available for this show', {}));
    }

    const priceUsd = typeof show.ticket_public_price === 'number' ? show.ticket_public_price : 0;
    const priceCents = Math.round(priceUsd * 100);
    if (priceCents <= 0 || tierLabel !== TIER_LABEL) {
      return res.status(400).json(new apiResponse(400, 'Invalid ticket tier or pricing', {}));
    }

    const cap =
      typeof show.sellable_cap === 'number' && show.sellable_cap > 0
        ? show.sellable_cap
        : typeof show.ticket_public_quantity === 'number' && show.ticket_public_quantity > 0
          ? show.ticket_public_quantity
          : 1000;

    const soldAgg = await TicketOrderModel.aggregate([
      {
        $match: {
          showId: new ObjectId(String(show._id)),
          orderStatus: { $ne: 'cancelled' },
        },
      },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]);
    const soldOrders = soldAgg[0]?.total ?? 0;
    const tixSold = typeof show.tix_sold === 'number' ? show.tix_sold : 0;
    const sold = Math.max(soldOrders, tixSold);
    const remaining = Math.max(0, cap - sold);

    if (qty > remaining) {
      return res.status(400).json(
        new apiResponse(400, remaining <= 0 ? 'Tickets are sold out' : `Only ${remaining} ticket(s) remaining`, {}),
      );
    }

    const maxPer = Math.min(MOCK_MAX_PER_ORDER, remaining, cap);
    if (qty > maxPer) {
      return res.status(400).json(new apiResponse(400, `Maximum ${maxPer} tickets per order`, {}));
    }

    const unitPrice = priceCents;
    const subtotal = unitPrice * qty;
    const serviceFee = Math.round(MOCK_SERVICE_FEE_FLAT * qty + (subtotal * MOCK_SERVICE_FEE_PERCENT) / 100);
    const totalPaidCents = subtotal + serviceFee;
    const totalPaidDollars = totalPaidCents / 100;

    const code = confirmationCode();

    const buyerName = `${String(firstName).trim()} ${String(lastName).trim()}`.trim();
    const emailNorm = String(email).trim().toLowerCase();

    let fan = await FanModel.findOne({ organizationId: org._id, email: emailNorm });
    if (fan) {
      fan.totalTicketsPurchased = (fan.totalTicketsPurchased || 0) + qty;
      fan.totalSpent = (fan.totalSpent || 0) + totalPaidDollars;
      fan.name = buyerName || fan.name;
      if (phone) fan.phone = String(phone).trim();
      const sid = new ObjectId(String(show._id));
      if (!fan.showIds.some((id) => String(id) === String(sid))) {
        fan.showIds = [...fan.showIds, sid];
      }
      fan.lastSeenAt = new Date();
      await fan.save();
    } else {
      fan = await FanModel.create({
        organizationId: org._id,
        name: buyerName,
        email: emailNorm,
        phone: phone ? String(phone).trim() : undefined,
        totalTicketsPurchased: qty,
        totalSpent: totalPaidDollars,
        showIds: [new ObjectId(String(show._id))],
      });
    }

    await TicketOrderModel.create({
      showId: new ObjectId(String(show._id)),
      fanId: fan._id,
      organizationId: org._id,
      provider: 'manual',
      providerOrderId: code,
      buyerName,
      buyerEmail: emailNorm,
      quantity: qty,
      grossAmount: totalPaidDollars,
      netAmount: totalPaidDollars,
      currency: show.currency || 'USD',
      orderStatus: 'paid',
      purchasedAt: new Date(),
    });

    await ShowModel.updateOne({ _id: show._id }, { $inc: { tix_sold: qty } });

    return res.status(201).json(
      new apiResponse(201, 'Tickets purchased successfully', {
        purchase: {
          id: code,
          confirmationCode: code,
          ticketCount: qty,
          tierLabel,
          totalPaid: totalPaidCents,
          paymentStatus: 'completed',
        },
      }, {}),
    );
  } catch (e: any) {
    console.error('submitTicketPurchase', e);
    return res.status(500).json(new apiResponse(500, 'Internal Server Error', {}, { message: e.message }));
  }
}
