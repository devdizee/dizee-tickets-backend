import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel, MembershipModel, apiResponse } from '@dizee-tickets/shared';
import { AuthenticatedRequest } from '@dizee-tickets/shared';
import logger from './logger';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || '';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || ACCESS_TOKEN_SECRET + '_refresh';
const TOKEN_EXPIRATION = parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRATION || '2592000');
const REFRESH_TOKEN_EXPIRATION = parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7776000');

// Redis-backed blacklist should replace this in production
const tokenBlacklist = new Set<string>();

export function blacklistToken(token: string): void {
  tokenBlacklist.add(token);
  setTimeout(() => tokenBlacklist.delete(token), TOKEN_EXPIRATION * 1000);
}

export function generateAccessToken(userId: string): string {
  return jwt.sign({ _id: userId, type: 'access' }, ACCESS_TOKEN_SECRET, { expiresIn: TOKEN_EXPIRATION });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ _id: userId, type: 'refresh' }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRATION });
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { authorization } = req.headers;
    if (!authorization) {
      return res.status(401).json(new apiResponse(401, 'Authentication required'));
    }

    let token = authorization.replace(/^Bearer\s+/i, '').replace(/"/g, '');

    if (tokenBlacklist.has(token)) {
      return res.status(401).json(new apiResponse(401, 'Session expired. Please login again.'));
    }

    const decoded: any = jwt.verify(token, ACCESS_TOKEN_SECRET);

    if (decoded.type !== 'access') {
      return res.status(401).json(new apiResponse(401, 'Invalid token type'));
    }

    const user = await UserModel.findById(decoded._id);
    if (!user) {
      return res.status(403).json(new apiResponse(403, 'User not found'));
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(new apiResponse(401, 'Session expired. Please login again.'));
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(new apiResponse(401, 'Invalid session'));
    }
    logger.error('Auth middleware error', { error: error.message });
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function requireOrgAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = (req.params.orgId || req.headers['x-organization-id'] || '') as string;
    if (!orgId) {
      return res.status(400).json(new apiResponse(400, 'Organization ID is required'));
    }

    const membership = await MembershipModel.findOne({
      userId: req.user!._id,
      organizationId: orgId,
      status: 'active',
    });

    if (!membership) {
      return res.status(403).json(new apiResponse(403, 'You do not have access to this organization'));
    }

    req.membership = membership;
    req.organizationId = orgId;
    next();
  } catch (error: any) {
    logger.error('Org access middleware error', { error: error.message });
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.membership) {
      return res.status(403).json(new apiResponse(403, 'Organization membership required'));
    }
    if (!roles.includes(req.membership.role)) {
      return res.status(403).json(new apiResponse(403, 'Insufficient permissions'));
    }
    next();
  };
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
  if (!req.user || !adminEmails.includes(req.user.email.toLowerCase())) {
    return res.status(403).json(new apiResponse(403, 'Admin access required'));
  }
  next();
}
