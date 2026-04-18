import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { timingSafeEqual } from 'crypto';
import { UserModel, OrganizationModel, MembershipModel, apiResponse, signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, generateUniqueSlug } from '@dizee-tickets/shared';
import { AuthenticatedRequest } from '@dizee-tickets/shared';
import { generateAccessToken, generateRefreshToken, blacklistToken } from '../middleware/auth';
import {
  sendEmail,
  renderTicketsOtpEmailHtml,
  renderTicketsPasswordResetEmailHtml,
} from '@dizee-tickets/shared';

async function ensureOrganization(userId: string, userName: string, userEmail: string) {
  const existing = await MembershipModel.findOne({ userId, status: 'active' });
  if (existing) {
    const org = await OrganizationModel.findById(existing.organizationId);
    return { organization: org, role: existing.role, membershipId: existing._id };
  }

  const slug = generateUniqueSlug(userName || userEmail.split('@')[0]);
  const org = await OrganizationModel.create({
    name: userName || userEmail.split('@')[0],
    slug,
    type: 'artist',
  });

  const membership = await MembershipModel.create({
    userId,
    organizationId: org._id,
    role: 'owner',
    status: 'active',
  });

  return { organization: org, role: 'owner' as const, membershipId: membership._id };
}

export async function signup(req: Request, res: Response) {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));
    }

    const { name, email, password } = parsed.data;

    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json(new apiResponse(409, 'An account with this email already exists'));
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await UserModel.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      emailVerificationToken: verificationToken,
    });

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    const orgData = await ensureOrganization(user._id.toString(), name, email);

    return res.status(201).json(new apiResponse(201, 'Account created', {
      user: user.toJSON(),
      accessToken,
      refreshToken,
      organization: orgData,
    }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, error.message));
  }
}

export async function login(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));
    }

    const { email, password } = parsed.data;
    const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user || !user.passwordHash) {
      return res.status(401).json(new apiResponse(401, 'Invalid email or password'));
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json(new apiResponse(401, 'Invalid email or password'));
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    const orgData = await ensureOrganization(user._id.toString(), user.name, user.email);

    return res.status(200).json(new apiResponse(200, 'Login successful', {
      user: user.toJSON(),
      accessToken,
      refreshToken,
      organization: orgData,
    }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, error.message));
  }
}

export async function logout(req: AuthenticatedRequest, res: Response) {
  const auth = req.headers.authorization;
  if (auth) {
    const token = auth.replace(/^Bearer\s+/i, '').replace(/"/g, '');
    blacklistToken(token);
  }
  return res.status(200).json(new apiResponse(200, 'Logged out'));
}

export async function me(req: AuthenticatedRequest, res: Response) {
  const user = req.user!;
  const orgData = await ensureOrganization(user._id.toString(), user.name, user.email);
  return res.status(200).json(new apiResponse(200, 'Current user', { user, organization: orgData }));
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json(new apiResponse(400, 'Token is required'));

    const user = await UserModel.findOne({ emailVerificationToken: token } as any).select('+emailVerificationToken');
    if (!user) return res.status(404).json(new apiResponse(404, 'Invalid or expired verification token'));

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    return res.status(200).json(new apiResponse(200, 'Email verified'));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(new apiResponse(400, 'Validation failed'));

    const user = await UserModel.findOne({ email: parsed.data.email.toLowerCase() });
    // Always return success to prevent email enumeration
    if (!user) return res.status(200).json(new apiResponse(200, 'If an account exists, a reset email has been sent'));

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset your DIZEE Tickets password',
      html: renderTicketsPasswordResetEmailHtml(user.email, resetUrl),
    }).catch(() => {});

    return res.status(200).json(new apiResponse(200, 'If an account exists, a reset email has been sent'));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(new apiResponse(400, 'Validation failed'));

    const user = await UserModel.findOne({
      passwordResetToken: parsed.data.token,
      passwordResetExpires: { $gt: new Date() },
    } as any).select('+passwordResetToken +passwordResetExpires');

    if (!user) return res.status(400).json(new apiResponse(400, 'Invalid or expired reset token'));

    user.passwordHash = await bcrypt.hash(parsed.data.password, 12);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.status(200).json(new apiResponse(200, 'Password reset successful'));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

// ── OTP-based auth ──────────────────────────────────────────────────────

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpEmail(email: string, code: string) {
  await sendEmail({
    to: email,
    subject: 'Your DIZEE Tickets verification code',
    html: renderTicketsOtpEmailHtml(email, code),
  });
}

export async function checkEmail(req: Request, res: Response) {
  try {
    const email = (req.query.email as string || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json(new apiResponse(400, 'Email is required'));
    }

    const user = await UserModel.findOne({ email });
    return res.status(200).json(new apiResponse(200, 'Email check', { exist: !!user }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function sendOtp(req: Request, res: Response) {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json(new apiResponse(400, 'Email is required'));
    }

    const user = await UserModel.findOne({ email }).select('+otpCode +otpExpires');
    if (!user) {
      // Don't reveal whether account exists — return success silently
      return res.status(200).json(new apiResponse(200, 'If an account exists, a code has been sent'));
    }

    const code = generateOtp();
    user.otpCode = code;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    await sendOtpEmail(email, code);
    return res.status(200).json(new apiResponse(200, 'Verification code sent'));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function loginWithOtp(req: Request, res: Response) {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const code = (req.body.code || '').trim();

    if (!email || !code) {
      return res.status(400).json(new apiResponse(400, 'Email and code are required'));
    }

    const user = await UserModel.findOne({ email }).select('+otpCode +otpExpires');
    if (!user || !user.otpCode || !user.otpExpires) {
      return res.status(401).json(new apiResponse(401, 'Invalid or expired code'));
    }

    if (new Date() > user.otpExpires) {
      user.otpCode = undefined;
      user.otpExpires = undefined;
      await user.save();
      return res.status(401).json(new apiResponse(401, 'Code has expired. Please request a new one.'));
    }

    if (user.otpCode !== code) {
      return res.status(401).json(new apiResponse(401, 'Invalid code'));
    }

    // OTP verified — clear it and log in
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.emailVerified = true;
    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    const orgData = await ensureOrganization(user._id.toString(), user.name, user.email);

    return res.status(200).json(new apiResponse(200, 'Login successful', {
      user: user.toJSON(),
      accessToken,
      refreshToken,
      organization: orgData,
    }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function signupInit(req: Request, res: Response) {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();

    if (!name || !email) {
      return res.status(400).json(new apiResponse(400, 'Name and email are required'));
    }

    let user = await UserModel.findOne({ email }).select('+otpCode +otpExpires');

    if (user) {
      // Account already exists — send OTP so they can log in instead
      const code = generateOtp();
      user.otpCode = code;
      user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      await sendOtpEmail(email, code);
      return res.status(200).json(new apiResponse(200, 'Verification code sent'));
    }

    // Create new user (no password needed for OTP flow)
    const code = generateOtp();
    user = await UserModel.create({
      name,
      email,
      otpCode: code,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendOtpEmail(email, code);
    return res.status(201).json(new apiResponse(201, 'Account created. Verification code sent.'));
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json(new apiResponse(409, 'An account with this email already exists'));
    }
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, error.message));
  }
}

export async function signupVerify(req: Request, res: Response) {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const code = (req.body.code || '').trim();

    if (!email || !code) {
      return res.status(400).json(new apiResponse(400, 'Email and code are required'));
    }

    const user = await UserModel.findOne({ email }).select('+otpCode +otpExpires');
    if (!user || !user.otpCode || !user.otpExpires) {
      return res.status(401).json(new apiResponse(401, 'Invalid or expired code'));
    }

    if (new Date() > user.otpExpires) {
      user.otpCode = undefined;
      user.otpExpires = undefined;
      await user.save();
      return res.status(401).json(new apiResponse(401, 'Code has expired. Please request a new one.'));
    }

    if (user.otpCode !== code) {
      return res.status(401).json(new apiResponse(401, 'Invalid code'));
    }

    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.emailVerified = true;
    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    const orgData = await ensureOrganization(user._id.toString(), user.name, user.email);

    return res.status(200).json(new apiResponse(200, 'Account verified', {
      user: user.toJSON(),
      accessToken,
      refreshToken,
      organization: orgData,
    }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function protectAuth(req: Request, res: Response) {
  try {
    const { password } = req.body;
    const sitePassword = process.env.SITE_PROTECTION_PASSWORD;

    if (!sitePassword) {
      return res.status(200).json(new apiResponse(200, 'Access granted', { authenticated: true }));
    }

    if (!password) {
      return res.status(400).json(new apiResponse(400, 'Password required'));
    }

    const provided = Buffer.from(String(password));
    const expected = Buffer.from(String(sitePassword));

    const isValid = provided.length === expected.length && timingSafeEqual(provided, expected);

    if (!isValid) {
      return res.status(401).json(new apiResponse(401, 'Invalid password'));
    }

    return res.status(200).json(new apiResponse(200, 'Access granted', { authenticated: true }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}
