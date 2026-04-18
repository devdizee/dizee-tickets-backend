import { Response } from 'express';
import { TourModel, ShowModel, apiResponse, generateUniqueSlug } from '@dizee-tickets/shared';
import { AuthenticatedRequest } from '@dizee-tickets/shared';

export async function createTour(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, artistId, startDate, endDate } = req.body;
    if (!name || !artistId) return res.status(400).json(new apiResponse(400, 'Name and artistId are required'));

    const slug = generateUniqueSlug(name);
    const tour = await TourModel.create({
      name,
      slug,
      artistId,
      organizationId: req.organizationId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return res.status(201).json(new apiResponse(201, 'Tour created', { tour }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getTours(req: AuthenticatedRequest, res: Response) {
  try {
    const tours = await TourModel.find({ organizationId: req.organizationId })
      .populate('artistId', 'name slug imageUrl')
      .sort({ createdAt: -1 });

    return res.status(200).json(new apiResponse(200, 'Tours', { tours }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getTour(req: AuthenticatedRequest, res: Response) {
  try {
    const tour = await TourModel.findOne({ _id: req.params.id, organizationId: req.organizationId }).populate('artistId');
    if (!tour) return res.status(404).json(new apiResponse(404, 'Tour not found'));

    const shows = await ShowModel.find({ tourId: tour._id })
      .sort({ perf_date: 1 });

    const totalCapacity = shows.reduce((sum, s) => sum + (s.sellable_cap || 0), 0);
    const totalTicketsSold = shows.reduce((sum, s) => sum + (s.tix_sold || 0), 0);
    const totalGross = 0;

    return res.status(200).json(new apiResponse(200, 'Tour', {
      tour,
      shows,
      summary: { totalShows: shows.length, totalCapacity, totalTicketsSold, totalGross },
    }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function updateTour(req: AuthenticatedRequest, res: Response) {
  try {
    const tour = await TourModel.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      req.body,
      { new: true }
    );
    if (!tour) return res.status(404).json(new apiResponse(404, 'Tour not found'));
    return res.status(200).json(new apiResponse(200, 'Tour updated', { tour }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function deleteTour(req: AuthenticatedRequest, res: Response) {
  try {
    const tour = await TourModel.findOneAndDelete({ _id: req.params.id, organizationId: req.organizationId });
    if (!tour) return res.status(404).json(new apiResponse(404, 'Tour not found'));
    await ShowModel.updateMany({ tourId: tour._id }, { $unset: { tourId: 1 } });
    return res.status(200).json(new apiResponse(200, 'Tour deleted'));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}
