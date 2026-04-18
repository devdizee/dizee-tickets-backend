/**
 * Transactional HTML emails aligned with main DIZEE (backend-dizee authentication.ts OTP layout).
 * Light background, red accent code, terms/privacy footer.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderTicketsOtpEmailHtml(recipientEmail: string, code: string): string {
  const safeEmail = escapeHtml(recipientEmail);
  const safeCode = escapeHtml(code);

  return `<!DOCTYPE html>
<html style="margin: 0; padding: 0;">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your DIZEE Tickets verification code</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      font-family: Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: none;
    }
    .email-container { max-width: 480px; margin: 0 auto; padding: 40px 20px; }
    .logo { margin-bottom: 24px; }
    .logo-text {
      font-size: 18px;
      font-weight: normal;
      color: #000000;
      letter-spacing: 1px;
    }
    .logo-sub {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.28em;
      color: #999999;
      margin-top: 6px;
    }
    .code-label {
      font-size: 14px;
      color: #333333;
      margin-bottom: 16px;
      line-height: 1.4;
    }
    .verification-code {
      font-size: 32px;
      font-weight: bold;
      color: #FF2300;
      letter-spacing: 2px;
      margin: 24px 0;
    }
    .expiry-text {
      font-size: 14px;
      color: #666666;
      margin: 24px 0;
      line-height: 1.4;
    }
    .security-note {
      font-size: 14px;
      color: #666666;
      margin-top: 32px;
      line-height: 1.4;
    }
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #E0E0E0;
    }
    .footer-text {
      font-size: 12px;
      color: #999999;
      line-height: 1.5;
      margin-bottom: 12px;
    }
    .footer-link {
      color: #FF2300;
      text-decoration: none;
      font-size: 12px;
      margin-right: 16px;
    }
    .company-info {
      margin-top: 20px;
      font-size: 11px;
      color: #CCCCCC;
    }
    @media only screen and (max-width: 600px) {
      .email-container { padding: 30px 16px; }
      .verification-code { font-size: 28px; letter-spacing: 1px; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0;">
  <div class="email-container">
    <div class="logo">
      <div class="logo-text">DIZEE</div>
      <div class="logo-sub">TICKETS</div>
    </div>
    <div class="code-label">
      To verify your identity, please use the code below:
    </div>
    <div class="verification-code">${safeCode}</div>
    <div class="expiry-text">
      This code is valid for 10 minutes and can only be used once. By entering this code, you will also confirm the email address associated with your account.
    </div>
    <div class="security-note">
      If you didn't attempt to sign in, you can safely ignore this email.
    </div>
    <div class="footer">
      <div class="footer-text">
        This message was sent to ${safeEmail}. If you have questions or complaints, please <a href="mailto:contact@dizee.com" class="footer-link">contact us</a>.
      </div>
      <div>
        <a href="https://diz.ee/terms-of-service" class="footer-link">Terms of Use</a>
        <a href="https://diz.ee/privacy-policy" class="footer-link">Privacy Policy</a>
        <a href="mailto:contact@dizee.com" class="footer-link">Contact Us</a>
      </div>
      <div class="company-info">
        DIZEE Tickets • Building the future of music discovery
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function renderTicketsPasswordResetEmailHtml(recipientEmail: string, resetUrl: string): string {
  const safeEmail = escapeHtml(recipientEmail);
  const safeUrl = escapeHtml(resetUrl);

  return `<!DOCTYPE html>
<html style="margin: 0; padding: 0;">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your DIZEE Tickets password</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      font-family: Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: none;
    }
    .email-container { max-width: 480px; margin: 0 auto; padding: 40px 20px; }
    .logo { margin-bottom: 24px; }
    .logo-text { font-size: 18px; font-weight: normal; color: #000000; letter-spacing: 1px; }
    .logo-sub {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.28em;
      color: #999999;
      margin-top: 6px;
    }
    .headline { font-size: 18px; font-weight: bold; color: #111111; margin-bottom: 12px; }
    .body-text { font-size: 14px; color: #666666; margin-bottom: 24px; line-height: 1.5; }
    .cta-wrap { text-align: center; margin: 28px 0; }
    .cta {
      display: inline-block;
      background: #FF2300;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: bold;
      padding: 12px 28px;
      border-radius: 8px;
      font-size: 15px;
    }
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #E0E0E0;
    }
    .footer-text {
      font-size: 12px;
      color: #999999;
      line-height: 1.5;
      margin-bottom: 12px;
    }
    .footer-link {
      color: #FF2300;
      text-decoration: none;
      font-size: 12px;
      margin-right: 16px;
    }
    .company-info { margin-top: 20px; font-size: 11px; color: #CCCCCC; }
  </style>
</head>
<body style="margin: 0; padding: 0;">
  <div class="email-container">
    <div class="logo">
      <div class="logo-text">DIZEE</div>
      <div class="logo-sub">TICKETS</div>
    </div>
    <div class="headline">Reset your password</div>
    <div class="body-text">
      We received a request to reset the password for your account. This link expires in one hour.
    </div>
    <div class="cta-wrap">
      <a href="${safeUrl}" class="cta">Reset password</a>
    </div>
    <div class="body-text" style="font-size: 12px; color: #999999;">
      If the button does not work, copy and paste this URL into your browser:<br/>
      <span style="word-break: break-all; color: #666666;">${safeUrl}</span>
    </div>
    <div class="body-text" style="margin-top: 24px;">
      If you did not request a password reset, you can ignore this email.
    </div>
    <div class="footer">
      <div class="footer-text">
        This message was sent to ${safeEmail}.
      </div>
      <div>
        <a href="https://diz.ee/terms-of-service" class="footer-link">Terms of Use</a>
        <a href="https://diz.ee/privacy-policy" class="footer-link">Privacy Policy</a>
        <a href="mailto:contact@dizee.com" class="footer-link">Contact Us</a>
      </div>
      <div class="company-info">
        DIZEE Tickets • Building the future of music discovery
      </div>
    </div>
  </div>
</body>
</html>`;
}
