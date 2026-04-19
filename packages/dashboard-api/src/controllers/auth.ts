import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import {
  UserModel,
  OrganizationModel,
  MembershipModel,
  apiResponse,
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  generateUniqueSlug,
  updateMeSchema,
  verifyOtpBodySchema,
} from '@dizee-tickets/shared';
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
  return res.status(200).json(new apiResponse(200, 'Current user', {
    user: user.toJSON(),
    organization: orgData,
  }));
}

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || '';

function tryGetUserIdFromAccessToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const token = auth.replace(/^Bearer\s+/i, '').replace(/"/g, '');
  if (!token) return null;
  try {
    const decoded: any = jwt.verify(token, ACCESS_TOKEN_SECRET);
    if (decoded.type !== 'access') return null;
    return decoded._id?.toString() || null;
  } catch {
    return null;
  }
}

export async function updateMe(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));
    }

    const user = await UserModel.findById(req.user!._id);
    if (!user) return res.status(404).json(new apiResponse(404, 'User not found'));

    if (parsed.data.name !== undefined) user.name = parsed.data.name;
    if (parsed.data.avatarUrl !== undefined) user.avatarUrl = parsed.data.avatarUrl;
    if (parsed.data.avatar !== undefined) user.avatarUrl = parsed.data.avatar;

    await user.save();
    return res.status(200).json(new apiResponse(200, 'Profile updated', { user: user.toJSON() }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, error.message));
  }
}

export async function deleteAccount(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!._id.toString();
    const memberships = await MembershipModel.find({ userId, status: 'active' });

    for (const m of memberships) {
      const orgId = m.organizationId;
      await MembershipModel.deleteOne({ _id: m._id });
      const remaining = await MembershipModel.countDocuments({ organizationId: orgId, status: 'active' });
      if (remaining === 0) {
        await OrganizationModel.findByIdAndDelete(orgId).catch(() => {});
      }
    }

    await UserModel.findByIdAndDelete(userId);
    return res.status(200).json(new apiResponse(200, 'Account deleted'));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, error.message));
  }
}

/**
 * Logged-in OTP checks: (1) confirm current email, or (2) confirm new email and apply change.
 * Login OTP remains POST /auth/login-otp (no session).
 */
export async function verifyOtpSession(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = verifyOtpBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));
    }

    const email = parsed.data.email.trim().toLowerCase();
    const code = parsed.data.code.trim();

    const user = await UserModel.findById(req.user!._id).select('+otpCode +otpExpires +pendingNewEmail');
    if (!user || !user.otpCode || !user.otpExpires) {
      return res.status(401).json(new apiResponse(401, 'Invalid or expired code'));
    }

    if (new Date() > user.otpExpires) {
      user.otpCode = undefined;
      user.otpExpires = undefined;
      user.pendingNewEmail = undefined;
      await user.save();
      return res.status(401).json(new apiResponse(401, 'Code has expired. Please request a new one.'));
    }

    if (user.otpCode !== code) {
      return res.status(401).json(new apiResponse(401, 'Invalid code'));
    }

    const pending = user.pendingNewEmail?.trim().toLowerCase();

    if (pending && email === pending) {
      user.email = pending;
      user.pendingNewEmail = undefined;
      user.otpCode = undefined;
      user.otpExpires = undefined;
      user.emailVerified = true;
      await user.save();
      return res.status(200).json(new apiResponse(200, 'Email updated', { user: user.toJSON() }));
    }

    if (email === user.email.toLowerCase()) {
      user.otpCode = undefined;
      user.otpExpires = undefined;
      await user.save();
      return res.status(200).json(new apiResponse(200, 'Email verified'));
    }

    return res.status(400).json(new apiResponse(400, 'Invalid email for this verification step'));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, error.message));
  }
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

    const authedUserId = tryGetUserIdFromAccessToken(req);

    if (authedUserId) {
      const self = await UserModel.findById(authedUserId).select('+otpCode +otpExpires +pendingNewEmail');
      if (!self) {
        return res.status(401).json(new apiResponse(401, 'Invalid session'));
      }

      const code = generateOtp();
      const expires = new Date(Date.now() + 10 * 60 * 1000);

      if (email === self.email.toLowerCase()) {
        self.otpCode = code;
        self.otpExpires = expires;
        self.pendingNewEmail = undefined;
        await self.save();
        await sendOtpEmail(email, code);
        return res.status(200).json(new apiResponse(200, 'Verification code sent'));
      }

      const taken = await UserModel.findOne({ email });
      if (taken) {
        return res.status(409).json(new apiResponse(409, 'An account with this email already exists'));
      }

      self.otpCode = code;
      self.otpExpires = expires;
      self.pendingNewEmail = email;
      await self.save();
      await sendOtpEmail(email, code);
      return res.status(200).json(new apiResponse(200, 'Verification code sent'));
    }

    const user = await UserModel.findOne({ email }).select('+otpCode +otpExpires +pendingNewEmail');
    if (!user) {
      // Don't reveal whether account exists — return success silently
      return res.status(200).json(new apiResponse(200, 'If an account exists, a code has been sent'));
    }

    const code = generateOtp();
    user.otpCode = code;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.pendingNewEmail = undefined;
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
    user.pendingNewEmail = undefined;
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
      user.pendingNewEmail = undefined;
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
    user.pendingNewEmail = undefined;
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
