import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

const GENERAL_RATE_LIMIT = parseInt(process.env.GENERAL_RATE_LIMIT || '5000');
const AUTH_RATE_LIMIT = parseInt(process.env.AUTH_RATE_LIMIT || '50');
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000');

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
});

export const generalRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: GENERAL_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req as any).user?._id?.toString() || req.ip || 'unknown',
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ status: 429, message: 'Rate limit exceeded. Please wait before making more requests.' });
  },
});

export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => req.ip || 'unknown',
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ status: 429, message: 'Too many authentication attempts. Please wait.' });
  },
});

export const speedLimiter = slowDown({
  windowMs: RATE_LIMIT_WINDOW_MS,
  delayAfter: 1000,
  delayMs: (hits) => (hits - 1000) * 25,
  maxDelayMs: 500,
});

export const compressionMiddleware = compression({
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024,
});

export const mongoSanitizeMiddleware = mongoSanitize({ replaceWith: '_' });
export const hppMiddleware = hpp({ whitelist: ['page', 'limit', 'sort', 'order'] });

export function xssSanitize(req: Request, _res: Response, next: NextFunction): void {
  const clean = (str: string): string =>
    str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '');

  if (req.query) {
    for (const key of Object.keys(req.query)) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = clean(req.query[key] as string);
      }
    }
  }
  if (req.body && typeof req.body === 'object') {
    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') return clean(obj);
      if (Array.isArray(obj)) return obj.map(sanitize);
      if (obj && typeof obj === 'object') {
        const out: any = {};
        for (const k of Object.keys(obj)) out[k] = sanitize(obj[k]);
        return out;
      }
      return obj;
    };
    req.body = sanitize(req.body);
  }
  next();
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

export const securityStack = [
  helmetMiddleware,
  compressionMiddleware,
  securityHeaders,
  speedLimiter,
  generalRateLimiter,
  mongoSanitizeMiddleware,
  hppMiddleware,
  xssSanitize,
];
