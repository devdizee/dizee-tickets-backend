import { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  OrganizationModel,
  ShowModel,
  GuestListModel,
  GuestRequestModel,
  apiResponse,
} from '@dizee-tickets/shared';

const ObjectId = mongoose.Types.ObjectId;

const RESERVED = new Set(['manage', 'api', 'static', 'assets']);

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

/**
 * GET /api/v1/guestlist/:slug/shows
 * Public hub — `slug` is the organization slug (same as main app’s single-segment hub, mapped to org here).
 */
export async function getGuestListShows(req: Request, res: Response) {
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

    const lists = await GuestListModel.find({
      organizationId: org._id,
      enabled: true,
    }).lean();

    if (lists.length === 0) {
      return res.status(200).json(
        new apiResponse(200, 'Guest list shows retrieved', {
          artist: {
            name: org.name,
            domain: org.slug,
            guestListSlug: org.slug,
            slug: org.slug,
          },
          shows: [],
        }, {}),
      );
    }

    const showIds = lists.map((l: any) => l.showId);
    const showsRaw = await ShowModel.find({
      _id: { $in: showIds },
      status: { $nin: ['cancelled'] },
    })
      .sort({ perf_date: 1 })
      .lean();

    const listByShow = new Map<string, any>();
    for (const l of lists) {
      listByShow.set(String(l.showId), l);
    }

    const approvedCounts = await GuestRequestModel.aggregate([
      {
        $match: {
          guestListId: { $in: lists.map((l: any) => new ObjectId(String(l._id))) },
          status: 'approved',
        },
      },
      {
        $group: {
          _id: '$guestListId',
          totalApproved: { $sum: '$guestCount' },
        },
      },
    ]);

    const approvedMap = new Map<string, number>();
    for (const c of approvedCounts) {
      approvedMap.set(String(c._id), c.totalApproved);
    }

    const upcoming = showsRaw.filter((b: any) => {
      const d = parsePerfDate(b.perf_date);
      if (!d) return false;
      return d >= today || String(b.perf_date) >= todayStr;
    });

    const shows = upcoming
      .map((b: any) => {
        const gl = listByShow.get(String(b._id));
        if (!gl) return null;

        const cap = gl.capacity != null ? gl.capacity : null;
        const totalApproved = approvedMap.get(String(gl._id)) ?? 0;
        const isFull = cap !== null && totalApproved >= cap;
        const mode = gl.requireApproval === false ? 'open' : 'approval';
        const closed = gl.closeAt && new Date() > new Date(gl.closeAt);
        const requestsOpen = !closed;

        const publicShowSlug =
          typeof gl.slug === 'string' && gl.slug.trim() ? slugifySegment(gl.slug.trim()) : null;

        return {
          id: String(b._id),
          date: b.perf_date || 'TBD',
          venue: b.venue || 'Venue TBD',
          location: [b.city, b.state].filter(Boolean).join(', ') || b.city || 'Location TBD',
          artist: b.artist || 'Artist TBD',
          eventTitle: b.title || null,
          showTime: b.show_time || null,
          mode,
          isFull,
          spotsRemaining: cap !== null ? Math.max(0, cap - totalApproved) : null,
          requestsOpen,
          publicShowSlug,
        };
      })
      .filter(Boolean);

    return res.status(200).json(
      new apiResponse(200, 'Guest list shows retrieved', {
        artist: {
          name: org.name,
          domain: org.slug,
          guestListSlug: org.slug,
          slug: org.slug,
        },
        shows,
      }, {}),
    );
  } catch (e: any) {
    console.error('getGuestListShows', e);
    return res.status(500).json(new apiResponse(500, 'Internal Server Error', {}, { message: e.message }));
  }
}

/**
 * POST /api/v1/guestlist/:slug/request
 * Body matches main DIZEE app (bookingId = show id).
 */
export async function submitGuestListRequest(req: Request, res: Response) {
  try {
    const slugRaw = req.params.slug;
    const slug = typeof slugRaw === 'string' ? slugRaw : Array.isArray(slugRaw) ? slugRaw[0] : '';
    const { bookingId, firstName, lastName, contact, guestCount, comment, socialHandle, email } = req.body;

    if (!slug) {
      return res.status(400).json(new apiResponse(400, 'Slug is required', {}, {}));
    }
    const normalized = slug.trim().toLowerCase();
    if (RESERVED.has(normalized)) {
      return res.status(404).json(new apiResponse(404, 'Artist not found', {}, {}));
    }
    if (!bookingId || !firstName || !lastName || guestCount == null) {
      return res.status(400).json(
        new apiResponse(400, 'bookingId, firstName, lastName, and guestCount are required', {}),
      );
    }
    const gc = Number(guestCount);
    if (!Number.isFinite(gc) || gc < 1 || gc > 20) {
      return res.status(400).json(new apiResponse(400, 'guestCount must be between 1 and 20', {}));
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
      return res.status(404).json(new apiResponse(404, 'Show not found or not eligible for guest list', {}));
    }

    const perfDate = parsePerfDate(show.perf_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (perfDate && perfDate < today) {
      return res.status(400).json(new apiResponse(400, 'This show has already passed', {}));
    }

    const guestList = await GuestListModel.findOne({ showId: show._id, enabled: true });
    if (!guestList) {
      return res.status(400).json(new apiResponse(400, 'Guest list is not available for this show', {}));
    }

    if (guestList.closeAt && new Date() > new Date(guestList.closeAt)) {
      return res.status(400).json(new apiResponse(400, 'Guest list requests are closed for this show', {}));
    }

    const pwRequired = !!(guestList.passwordRequired && guestList.accessPassword);
    if (pwRequired) {
      const pw =
        (req.body?.password as string) ||
        (req.headers['x-guestlist-password'] as string) ||
        '';
      if (pw !== guestList.accessPassword) {
        return res.status(403).json(new apiResponse(403, 'Invalid access code', {}));
      }
    }

    if (guestList.capacity) {
      const currentCount = await GuestRequestModel.aggregate([
        { $match: { guestListId: guestList._id, status: { $in: ['pending', 'approved'] } } },
        { $group: { _id: null, total: { $sum: '$guestCount' } } },
      ]);
      if ((currentCount[0]?.total ?? 0) + gc > guestList.capacity) {
        return res.status(400).json(new apiResponse(400, 'Guest list is full', {}));
      }
    }

    const name = `${String(firstName).trim()} ${String(lastName).trim()}`.trim();
    const notes = [comment, socialHandle ? `Social: ${socialHandle}` : '', contact ? `Contact: ${contact}` : '']
      .filter(Boolean)
      .join('\n');

    const status = guestList.requireApproval ? 'pending' : 'approved';

    const request = await GuestRequestModel.create({
      guestListId: guestList._id,
      showId: show._id,
      name,
      email: email ? String(email).trim().toLowerCase() : undefined,
      phone: contact ? String(contact).trim() : undefined,
      guestCount: gc,
      notes: notes || undefined,
      status,
      approvedAt: status === 'approved' ? new Date() : undefined,
    });

    return res.status(201).json(
      new apiResponse(
        201,
        status === 'approved' ? "You're on the list!" : 'Request submitted',
        {
          request: {
            id: request.id,
            status: request.status,
          },
        },
        {},
      ),
    );
  } catch (e: any) {
    console.error('submitGuestListRequest', e);
    return res.status(500).json(new apiResponse(500, 'Internal Server Error', {}, { message: e.message }));
  }
}
