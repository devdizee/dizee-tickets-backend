import Mailgun from 'mailgun.js';
import FormData from 'form-data';

let mgClient: ReturnType<InstanceType<typeof Mailgun>['client']> | null = null;

function getMailgunClient() {
  if (!mgClient) {
    const apiKey = process.env.MAILGUN_API_KEY;
    const url = process.env.MAILGUN_URL || 'https://api.mailgun.net';

    if (!apiKey) {
      throw new Error('MAILGUN_API_KEY environment variable is required');
    }

    const mailgun = new Mailgun(FormData);
    mgClient = mailgun.client({ username: 'api', key: apiKey, url });
  }
  return mgClient;
}

function getDomain(): string {
  const domain = process.env.MAILGUN_DOMAIN;
  if (!domain) throw new Error('MAILGUN_DOMAIN environment variable is required');
  return domain;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const mg = getMailgunClient();
  const domain = getDomain();

  await mg.messages.create(domain, {
    from: options.from || `DIZEE Tickets <noreply@${domain}>`,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
    text: options.text || '',
  });
}

export async function sendInviteEmail(email: string, inviterName: string, orgName: string, inviteUrl: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: `You've been invited to ${orgName} on DIZEE Tickets`,
    html: `
      <div style="font-family:Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#000;color:#fff;">
        <div style="font-size:18px;letter-spacing:1px;margin-bottom:32px;">DIZEE TICKETS</div>
        <div style="font-size:20px;font-weight:bold;margin-bottom:8px;">You're invited</div>
        <div style="font-size:14px;color:#999;margin-bottom:24px;line-height:1.6;">
          ${inviterName} invited you to join <strong>${orgName}</strong> on DIZEE Tickets.
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${inviteUrl}" style="display:inline-block;background:#FF2300;color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;font-size:15px;">Accept Invite</a>
        </div>
        <div style="margin-top:40px;padding-top:20px;border-top:1px solid #222;font-size:11px;color:#555;">
          If you didn't expect this invitation, you can ignore this email.
        </div>
      </div>
    `,
  });
}

export async function sendGuestListApprovalEmail(email: string, guestName: string, showTitle: string, showDate: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: `You're on the guest list for ${showTitle}`,
    html: `
      <div style="font-family:Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#000;color:#fff;">
        <div style="font-size:18px;letter-spacing:1px;margin-bottom:32px;">DIZEE TICKETS</div>
        <div style="font-size:20px;font-weight:bold;margin-bottom:8px;">Guest List Confirmed</div>
        <div style="font-size:14px;color:#999;margin-bottom:24px;line-height:1.6;">
          Hey ${guestName}, you've been approved for the guest list for <strong>${showTitle}</strong> on ${showDate}.
        </div>
        <div style="margin-top:40px;padding-top:20px;border-top:1px solid #222;font-size:11px;color:#555;">
          DIZEE Tickets
        </div>
      </div>
    `,
  });
}
