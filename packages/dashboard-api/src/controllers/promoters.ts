import { Response } from 'express';
import { PromoterModel, apiResponse, generateUniqueSlug } from '@dizee-tickets/shared';
import { AuthenticatedRequest } from '@dizee-tickets/shared';

export async function createPromoter(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, websiteUrl, primaryContactName, primaryContactEmail } = req.body;
    if (!name) return res.status(400).json(new apiResponse(400, 'Name is required'));

    const slug = generateUniqueSlug(name);
    const promoter = await PromoterModel.create({
      name, slug, websiteUrl, primaryContactName, primaryContactEmail,
      organizationId: req.organizationId,
    });

    return res.status(201).json(new apiResponse(201, 'Promoter created', { promoter }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getPromoters(req: AuthenticatedRequest, res: Response) {
  try {
    const promoters = await PromoterModel.find({ organizationId: req.organizationId }).sort({ name: 1 });
    return res.status(200).json(new apiResponse(200, 'Promoters', { promoters }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getPromoter(req: AuthenticatedRequest, res: Response) {
  try {
    const promoter = await PromoterModel.findOne({ _id: req.params.id, organizationId: req.organizationId });
    if (!promoter) return res.status(404).json(new apiResponse(404, 'Promoter not found'));
    return res.status(200).json(new apiResponse(200, 'Promoter', { promoter }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function updatePromoter(req: AuthenticatedRequest, res: Response) {
  try {
    const promoter = await PromoterModel.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      req.body,
      { new: true }
    );
    if (!promoter) return res.status(404).json(new apiResponse(404, 'Promoter not found'));
    return res.status(200).json(new apiResponse(200, 'Promoter updated', { promoter }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}
