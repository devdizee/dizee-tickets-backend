import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { timingSafeEqual } from 'crypto';
import { UserModel, apiResponse, signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@dizee-tickets/shared';
import { AuthenticatedRequest } from '@dizee-tickets/shared';
import { generateAccessToken, generateRefreshToken, blacklistToken } from '../middleware/auth';
import { sendEmail } from '@dizee-tickets/shared';

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

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    await sendEmail({
      to: email,
      subject: 'Verify your DIZEE Tickets account',
      html: `
        <div style="font-family:Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#000;color:#fff;">
          <div style="font-size:18px;letter-spacing:1px;margin-bottom:32px;">DIZEE TICKETS</div>
          <div style="font-size:20px;font-weight:bold;margin-bottom:8px;">Verify your email</div>
          <div style="font-size:14px;color:#999;margin-bottom:24px;">Click below to verify your email address.</div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${frontendUrl}/verify-email?token=${verificationToken}" style="display:inline-block;background:#FF2300;color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;">Verify Email</a>
          </div>
        </div>
      `,
    }).catch(() => {}); // non-blocking

    return res.status(201).json(new apiResponse(201, 'Account created', {
      user: user.toJSON(),
      accessToken,
      refreshToken,
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

    return res.status(200).json(new apiResponse(200, 'Login successful', {
      user: user.toJSON(),
      accessToken,
      refreshToken,
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
  return res.status(200).json(new apiResponse(200, 'Current user', { user: req.user }));
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
    await sendEmail({
      to: user.email,
      subject: 'Reset your DIZEE Tickets password',
      html: `
        <div style="font-family:Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#000;color:#fff;">
          <div style="font-size:18px;letter-spacing:1px;margin-bottom:32px;">DIZEE TICKETS</div>
          <div style="font-size:20px;font-weight:bold;margin-bottom:8px;">Reset your password</div>
          <div style="font-size:14px;color:#999;margin-bottom:24px;">Click below to reset your password. This link expires in 1 hour.</div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${frontendUrl}/reset-password?token=${resetToken}" style="display:inline-block;background:#FF2300;color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;">Reset Password</a>
          </div>
        </div>
      `,
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
