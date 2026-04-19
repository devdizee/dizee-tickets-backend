import { Request, Response } from 'express';
import {
  OrganizationModel,
  ShowModel,
  GuestListModel,
  GuestRequestModel,
  apiResponse,
  publicGuestFormSchema,
} from '@dizee-tickets/shared';

function paramStr(p: string | string[] | undefined): string {
  if (typeof p === 'string') return p;
  if (Array.isArray(p) && p[0]) return p[0];
  return '';
}

function showPublicPayload(show: { id?: string; slug: string; title?: string; perf_date?: string; venue?: string; city?: string; state?: string; artist?: string; tix_sold?: number; sellable_cap?: number; on_sale?: boolean; show_on_ticket_link?: boolean; ticket_link?: string; ticket_public_price?: number; ticket_public_quantity?: number; ticket_page_password_enabled?: boolean; ticket_page_password?: string }) {
  const pwOn = !!(show.ticket_page_password_enabled && show.ticket_page_password);
  return {
    id: show.id,
    slug: show.slug,
    title: show.title,
    perf_date: show.perf_date,
    venue: show.venue,
    city: show.city,
    state: show.state,
    artist: show.artist,
    tix_sold: show.tix_sold ?? 0,
    sellable_cap: show.sellable_cap,
    on_sale: show.on_sale,
    show_on_ticket_link: show.show_on_ticket_link !== false,
    ticket_link: show.ticket_link,
    ticket_public_price: show.ticket_public_price,
    ticket_public_quantity: show.ticket_public_quantity,
    passwordRequired: pwOn,
  };
}

/** GET /public/ticket-page/:orgSlug/:showSlug */
export async function getPublicTicketPage(req: Request, res: Response) {
  try {
    const orgSlug = paramStr(req.params.orgSlug);
    const showSlug = paramStr(req.params.showSlug);
    const org = await OrganizationModel.findOne({ slug: orgSlug.toLowerCase() });
    if (!org) return res.status(404).json(new apiResponse(404, 'Not found'));

    const show = await ShowModel.findOne({
      organizationId: org._id,
      slug: showSlug.toLowerCase(),
    });
    if (!show) return res.status(404).json(new apiResponse(404, 'Show not found'));

    const payload = showPublicPayload(show);
    return res.status(200).json(new apiResponse(200, 'Ticket page', { show: payload, orgName: org.name }));
  } catch (e: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, e.message));
  }
}

/** POST /public/ticket-page/:orgSlug/:showSlug/verify */
export async function verifyPublicTicketPassword(req: Request, res: Response) {
  try {
    const orgSlug = paramStr(req.params.orgSlug);
    const showSlug = paramStr(req.params.showSlug);
    const password = String(req.body?.password ?? '');

    const org = await OrganizationModel.findOne({ slug: orgSlug.toLowerCase() });
    if (!org) return res.status(404).json(new apiResponse(404, 'Not found'));

    const show = await ShowModel.findOne({
      organizationId: org._id,
      slug: showSlug.toLowerCase(),
    });
    if (!show) return res.status(404).json(new apiResponse(404, 'Show not found'));

    if (!show.ticket_page_password_enabled || !show.ticket_page_password) {
      return res.status(200).json(new apiResponse(200, 'OK', { ok: true }));
    }

    if (password === show.ticket_page_password) {
      return res.status(200).json(new apiResponse(200, 'OK', { ok: true }));
    }
    return res.status(403).json(new apiResponse(403, 'Invalid password', { passwordRequired: true }));
  } catch (e: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, e.message));
  }
}

/** GET /public/guest-page/:orgSlug/:showSlug */
export async function getPublicGuestPage(req: Request, res: Response) {
  try {
    const orgSlug = paramStr(req.params.orgSlug);
    const showSlug = paramStr(req.params.showSlug);
    const headerPw = (req.headers['x-guest-list-password'] as string) || '';

    const org = await OrganizationModel.findOne({ slug: orgSlug.toLowerCase() });
    if (!org) return res.status(404).json(new apiResponse(404, 'Not found'));

    const show = await ShowModel.findOne({
      organizationId: org._id,
      slug: showSlug.toLowerCase(),
    });
    if (!show) return res.status(404).json(new apiResponse(404, 'Show not found'));

    const guestList = await GuestListModel.findOne({ showId: show._id, enabled: true });
    if (!guestList) {
      return res.status(404).json(new apiResponse(404, 'Guest list not available'));
    }

    const pwRequired = !!(guestList.passwordRequired && guestList.accessPassword);
    if (pwRequired) {
      const ok = headerPw && headerPw === guestList.accessPassword;
      if (!ok) {
        return res.status(401).json(
          new apiResponse(401, 'Password required', { passwordRequired: true }),
        );
      }
    }

    return res.status(200).json(
      new apiResponse(200, 'Guest page', {
        passwordRequired: false,
        guestList: {
          requireApproval: guestList.requireApproval,
          capacity: guestList.capacity,
          closeAt: guestList.closeAt,
        },
        show: {
          id: show.id,
          title: show.title,
          date: show.perf_date,
          venue: show.venue,
        },
      }),
    );
  } catch (e: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, e.message));
  }
}

/** POST /public/guest-page/:orgSlug/:showSlug/verify */
export async function verifyPublicGuestPassword(req: Request, res: Response) {
  try {
    const orgSlug = paramStr(req.params.orgSlug);
    const showSlug = paramStr(req.params.showSlug);
    const password = String(req.body?.password ?? '');

    const org = await OrganizationModel.findOne({ slug: orgSlug.toLowerCase() });
    if (!org) return res.status(404).json(new apiResponse(404, 'Not found'));

    const show = await ShowModel.findOne({
      organizationId: org._id,
      slug: showSlug.toLowerCase(),
    });
    if (!show) return res.status(404).json(new apiResponse(404, 'Show not found'));

    const guestList = await GuestListModel.findOne({ showId: show._id, enabled: true });
    if (!guestList) return res.status(404).json(new apiResponse(404, 'Guest list not found'));

    if (!guestList.passwordRequired || !guestList.accessPassword) {
      return res.status(200).json(new apiResponse(200, 'OK', { ok: true }));
    }

    if (password === guestList.accessPassword) {
      return res.status(200).json(new apiResponse(200, 'OK', { ok: true }));
    }
    return res.status(403).json(new apiResponse(403, 'Invalid password'));
  } catch (e: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, e.message));
  }
}

/** POST /public/guest-page/:orgSlug/:showSlug/request */
export async function submitPublicGuestRequest(req: Request, res: Response) {
  try {
    const orgSlug = paramStr(req.params.orgSlug);
    const showSlug = paramStr(req.params.showSlug);
    const parsed = publicGuestFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));
    }

    const org = await OrganizationModel.findOne({ slug: orgSlug.toLowerCase() });
    if (!org) return res.status(404).json(new apiResponse(404, 'Not found'));

    const show = await ShowModel.findOne({
      organizationId: org._id,
      slug: showSlug.toLowerCase(),
    });
    if (!show) return res.status(404).json(new apiResponse(404, 'Show not found'));

    const guestList = await GuestListModel.findOne({ showId: show._id, enabled: true });
    if (!guestList) return res.status(404).json(new apiResponse(404, 'Guest list not available'));

    if (guestList.closeAt && new Date() > new Date(guestList.closeAt)) {
      return res.status(400).json(new apiResponse(400, 'Guest list is closed'));
    }

    const pwRequired = !!(guestList.passwordRequired && guestList.accessPassword);
    if (pwRequired) {
      const pw = parsed.data.password || (req.headers['x-guest-list-password'] as string) || '';
      if (pw !== guestList.accessPassword) {
        return res.status(403).json(new apiResponse(403, 'Invalid or missing password'));
      }
    }

    if (guestList.capacity) {
      const currentCount = await GuestRequestModel.aggregate([
        { $match: { guestListId: guestList._id, status: { $in: ['pending', 'approved'] } } },
        { $group: { _id: null, total: { $sum: '$guestCount' } } },
      ]);
      if ((currentCount[0]?.total ?? 0) + parsed.data.guestCount > guestList.capacity) {
        return res.status(400).json(new apiResponse(400, 'Guest list is full'));
      }
    }

    const name = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
    const notes = [parsed.data.comment, parsed.data.socialHandle ? `Social: ${parsed.data.socialHandle}` : '']
      .filter(Boolean)
      .join('\n');

    const status = guestList.requireApproval ? 'pending' : 'approved';

    const request = await GuestRequestModel.create({
      guestListId: guestList._id,
      showId: show._id,
      name,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone || undefined,
      company: parsed.data.company || undefined,
      requestedBy: parsed.data.socialHandle || undefined,
      guestCount: parsed.data.guestCount,
      notes: notes || undefined,
      status,
      approvedAt: status === 'approved' ? new Date() : undefined,
    });

    return res.status(201).json(
      new apiResponse(201, status === 'approved' ? "You're on the list!" : 'Request submitted', { request }),
    );
  } catch (e: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, e.message));
  }
}
