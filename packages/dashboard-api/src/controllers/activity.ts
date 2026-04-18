import { Response } from 'express';
import {
  ActivityModel,
  apiResponse,
  createActivitySchema,
  updateActivityStatusSchema,
  listActivityQuerySchema,
} from '@dizee-tickets/shared';
import { AuthenticatedRequest } from '@dizee-tickets/shared';

export async function listActivity(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = listActivityQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));
    }

    const { section, action, status, itemId, startDate, endDate, page, limit } = parsed.data;
    const filter: Record<string, unknown> = { orgId: req.organizationId };

    if (section) filter.section = section;
    if (action) filter.action = action;
    if (status) filter.status = status;
    if (itemId) filter.itemId = itemId;

    if (startDate || endDate) {
      const range: Record<string, Date> = {};
      if (startDate) range.$gte = new Date(startDate);
      if (endDate) range.$lte = new Date(endDate);
      filter.timestamp = range;
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      ActivityModel.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
      ActivityModel.countDocuments(filter),
    ]);

    return res.status(200).json(new apiResponse(200, 'Activity', {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, error.message));
  }
}

export async function createActivity(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = createActivitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));
    }

    const item = await ActivityModel.create({
      ...parsed.data,
      orgId: req.organizationId,
      userId: req.user?._id,
      userEmail: parsed.data.userEmail || req.user?.email,
      userName: parsed.data.userName || req.user?.name,
      timestamp: new Date(),
    });

    return res.status(201).json(new apiResponse(201, 'Activity created', { item }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, error.message));
  }
}

export async function updateActivityStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = updateActivityStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));
    }

    const item = await ActivityModel.findOneAndUpdate(
      { _id: req.params.id, orgId: req.organizationId },
      { status: parsed.data.status },
      { new: true }
    );
    if (!item) return res.status(404).json(new apiResponse(404, 'Activity not found'));

    return res.status(200).json(new apiResponse(200, 'Activity updated', { item }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getActivityProgress(req: AuthenticatedRequest, res: Response) {
  try {
    const { section } = req.query;
    const filter: Record<string, unknown> = { orgId: req.organizationId };
    if (section) filter.section = section;

    const [total, approved, pending, denied] = await Promise.all([
      ActivityModel.countDocuments(filter),
      ActivityModel.countDocuments({ ...filter, status: 'approved' }),
      ActivityModel.countDocuments({ ...filter, status: 'pending' }),
      ActivityModel.countDocuments({ ...filter, status: 'denied' }),
    ]);

    const percentComplete = total > 0 ? Math.round((approved / total) * 100) : 0;

    return res.status(200).json(new apiResponse(200, 'Activity progress', {
      total,
      approved,
      pending,
      denied,
      percentComplete,
    }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}
