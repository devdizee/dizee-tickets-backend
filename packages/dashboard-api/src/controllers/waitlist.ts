import { Request, Response } from 'express';
import {
  WaitlistModel,
  apiResponse,
  submitWaitlistSchema,
  sendEmail,
} from '@dizee-tickets/shared';

function normalizeInstagram(handle?: string): string | undefined {
  if (!handle || !handle.trim()) return undefined;
  const t = handle.trim().replace(/^@+/, '');
  return t || undefined;
}

function adminRecipients(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function notifyAdminsHtml(payload: {
  name: string;
  email: string;
  role: string;
  organizationName: string;
  instagramHandle?: string;
  bio?: string;
  source: string;
  alreadyOnWaitlist: boolean;
}): string {
  const roleLabel =
    payload.role === 'artist_rep'
      ? 'Artist representative'
      : payload.role === 'promoter'
        ? 'Promoter'
        : 'Artist';
  return `
    <h2>DIZEE Tickets — waitlist</h2>
    <p><strong>${payload.alreadyOnWaitlist ? 'Updated signup' : 'New signup'}</strong></p>
    <p><strong>Name:</strong> ${escapeHtml(payload.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
    <p><strong>Role:</strong> ${escapeHtml(roleLabel)}</p>
    <p><strong>Artist / company:</strong> ${escapeHtml(payload.organizationName)}</p>
    ${payload.instagramHandle ? `<p><strong>Instagram:</strong> @${escapeHtml(payload.instagramHandle)}</p>` : ''}
    ${payload.bio ? `<p><strong>About:</strong></p><pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(payload.bio)}</pre>` : ''}
    <p><strong>Source:</strong> ${escapeHtml(payload.source)}</p>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function submitWaitlist(req: Request, res: Response) {
  try {
    const parsed = submitWaitlistSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));
    }

    const { name, email, role, organizationName, bio, source } = parsed.data;
    const instagramHandle = normalizeInstagram(parsed.data.instagramHandle);
    const emailNorm = email.toLowerCase().trim();

    const prior = await WaitlistModel.findOne({ email: emailNorm }).select('_id').lean();
    const alreadyOnWaitlist = !!prior;

    const metadata = {
      ip: typeof req.ip === 'string' ? req.ip : req.socket?.remoteAddress,
      userAgent: req.get('user-agent') || undefined,
      referrer: req.get('referer') || req.get('referrer') || undefined,
    };

    await WaitlistModel.findOneAndUpdate(
      { email: emailNorm },
      {
        $set: {
          name: name.trim(),
          role,
          organizationName: organizationName.trim(),
          instagramHandle,
          bio: bio?.trim() || undefined,
          source: (source && source.trim()) || 'landing',
          metadata,
        },
        $setOnInsert: {
          status: 'pending',
        },
      },
      { upsert: true, new: true }
    );

    const html = notifyAdminsHtml({
      name: name.trim(),
      email: emailNorm,
      role,
      organizationName: organizationName.trim(),
      instagramHandle,
      bio: bio?.trim(),
      source: (source && source.trim()) || 'landing',
      alreadyOnWaitlist,
    });

    const recipients = adminRecipients();
    if (recipients.length > 0) {
      Promise.all(
        recipients.map((to) =>
          sendEmail({
            to,
            subject: alreadyOnWaitlist
              ? 'DIZEE Tickets — waitlist signup updated'
              : 'DIZEE Tickets — new waitlist signup',
            html,
          })
        )
      ).catch((err) => console.error('Waitlist admin email failed:', err));
    }

    return res.status(200).json(
      new apiResponse(200, alreadyOnWaitlist ? 'Waitlist profile updated' : "You're on the list", {
        success: true,
        alreadyOnWaitlist,
      })
    );
  } catch (error: any) {
    console.error('submitWaitlist error:', error);
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, error.message));
  }
}
