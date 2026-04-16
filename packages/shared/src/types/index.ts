import { Request } from 'express';
import { IUser } from '../models/User';
import { IMembership } from '../models/Membership';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  membership?: IMembership;
  organizationId?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ApiResponse<T = unknown> {
  status: number;
  message: string;
  data: T;
  success: boolean;
}
