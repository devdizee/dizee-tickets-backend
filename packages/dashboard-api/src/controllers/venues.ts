import { Response } from 'express';
import { VenueModel, apiResponse, generateUniqueSlug } from '@dizee-tickets/shared';
import { AuthenticatedRequest } from '@dizee-tickets/shared';

export async function createVenue(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, city, address, region, country, capacity, primaryContactName, primaryContactEmail, ticketingProvider, notes } = req.body;
    if (!name || !city) return res.status(400).json(new apiResponse(400, 'Name and city are required'));

    const slug = generateUniqueSlug(name);
    const venue = await VenueModel.create({
      name, slug, city, address, region, country, capacity, primaryContactName, primaryContactEmail, ticketingProvider, notes,
      organizationId: req.organizationId,
    });

    return res.status(201).json(new apiResponse(201, 'Venue created', { venue }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getVenues(req: AuthenticatedRequest, res: Response) {
  try {
    const filter: Record<string, unknown> = {};
    if (req.organizationId) filter.organizationId = req.organizationId;
    if (req.query.city) filter.city = { $regex: req.query.city, $options: 'i' };

    const venues = await VenueModel.find(filter).sort({ name: 1 });
    return res.status(200).json(new apiResponse(200, 'Venues', { venues }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getVenue(req: AuthenticatedRequest, res: Response) {
  try {
    const venue = await VenueModel.findById(req.params.id);
    if (!venue) return res.status(404).json(new apiResponse(404, 'Venue not found'));
    return res.status(200).json(new apiResponse(200, 'Venue', { venue }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function updateVenue(req: AuthenticatedRequest, res: Response) {
  try {
    const venue = await VenueModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!venue) return res.status(404).json(new apiResponse(404, 'Venue not found'));
    return res.status(200).json(new apiResponse(200, 'Venue updated', { venue }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}
