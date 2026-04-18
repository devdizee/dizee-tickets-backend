import { Response } from 'express';
import {
  MerchModel,
  apiResponse,
  createMerchSchema,
  updateMerchSchema,
} from '@dizee-tickets/shared';
import { AuthenticatedRequest } from '@dizee-tickets/shared';
import { logActivity } from '../lib/activityLogger';

export async function listMerch(req: AuthenticatedRequest, res: Response) {
  try {
    const { page = 1, limit = 50, search, status, assigned_show_id } = req.query;
    const filter: Record<string, unknown> = { orgId: req.organizationId };

    if (status) filter.status = status;
    if (assigned_show_id) filter.assigned_show_id = assigned_show_id;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } },
        { variant: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      MerchModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      MerchModel.countDocuments(filter),
    ]);

    return res.status(200).json(new apiResponse(200, 'Merch', {
      items,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, error.message));
  }
}

export async function getMerch(req: AuthenticatedRequest, res: Response) {
  try {
    const item = await MerchModel.findOne({ _id: req.params.id, orgId: req.organizationId });
    if (!item) return res.status(404).json(new apiResponse(404, 'Merch item not found'));
    return res.status(200).json(new apiResponse(200, 'Merch', { item }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function createMerch(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = createMerchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));
    }

    const item = await MerchModel.create({
      ...parsed.data,
      orgId: req.organizationId,
      createdBy: req.user?._id,
    });

    await logActivity({
      section: 'commerce',
      action: 'add',
      itemId: item._id.toString(),
      itemName: item.name,
      detail: `Created merch item "${item.name}"`,
      userId: req.user?._id,
      userEmail: req.user?.email,
      userName: req.user?.name,
      orgId: req.organizationId!,
      status: 'completed',
    });

    return res.status(201).json(new apiResponse(201, 'Merch item created', { item }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, error.message));
  }
}

export async function updateMerch(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = updateMerchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(new apiResponse(400, 'Validation failed', {}, parsed.error.flatten()));
    }

    const item = await MerchModel.findOneAndUpdate(
      { _id: req.params.id, orgId: req.organizationId },
      parsed.data,
      { new: true }
    );
    if (!item) return res.status(404).json(new apiResponse(404, 'Merch item not found'));

    await logActivity({
      section: 'commerce',
      action: 'edit',
      itemId: item._id.toString(),
      itemName: item.name,
      detail: `Updated merch item "${item.name}"`,
      userId: req.user?._id,
      userEmail: req.user?.email,
      userName: req.user?.name,
      orgId: req.organizationId!,
      status: 'completed',
    });

    return res.status(200).json(new apiResponse(200, 'Merch item updated', { item }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error', {}, error.message));
  }
}

export async function deleteMerch(req: AuthenticatedRequest, res: Response) {
  try {
    const item = await MerchModel.findOneAndDelete({ _id: req.params.id, orgId: req.organizationId });
    if (!item) return res.status(404).json(new apiResponse(404, 'Merch item not found'));

    await logActivity({
      section: 'commerce',
      action: 'delete',
      itemId: item._id.toString(),
      itemName: item.name,
      detail: `Deleted merch item "${item.name}"`,
      userId: req.user?._id,
      userEmail: req.user?.email,
      userName: req.user?.name,
      orgId: req.organizationId!,
      status: 'completed',
    });

    return res.status(200).json(new apiResponse(200, 'Merch item deleted'));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}
