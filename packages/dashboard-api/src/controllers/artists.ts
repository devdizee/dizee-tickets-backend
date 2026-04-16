import { Response } from 'express';
import { ArtistModel, apiResponse, generateUniqueSlug } from '@dizee-tickets/shared';
import { AuthenticatedRequest } from '@dizee-tickets/shared';

export async function createArtist(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, genre, imageUrl, spotifyUrl, instagramUrl, websiteUrl } = req.body;
    if (!name) return res.status(400).json(new apiResponse(400, 'Name is required'));

    const slug = generateUniqueSlug(name);
    const artist = await ArtistModel.create({
      name, slug, genre, imageUrl, spotifyUrl, instagramUrl, websiteUrl,
      organizationId: req.organizationId,
    });

    return res.status(201).json(new apiResponse(201, 'Artist created', { artist }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getArtists(req: AuthenticatedRequest, res: Response) {
  try {
    const artists = await ArtistModel.find({ organizationId: req.organizationId }).sort({ name: 1 });
    return res.status(200).json(new apiResponse(200, 'Artists', { artists }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function getArtist(req: AuthenticatedRequest, res: Response) {
  try {
    const artist = await ArtistModel.findOne({ _id: req.params.id, organizationId: req.organizationId });
    if (!artist) return res.status(404).json(new apiResponse(404, 'Artist not found'));
    return res.status(200).json(new apiResponse(200, 'Artist', { artist }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}

export async function updateArtist(req: AuthenticatedRequest, res: Response) {
  try {
    const artist = await ArtistModel.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      req.body,
      { new: true }
    );
    if (!artist) return res.status(404).json(new apiResponse(404, 'Artist not found'));
    return res.status(200).json(new apiResponse(200, 'Artist updated', { artist }));
  } catch (error: any) {
    return res.status(500).json(new apiResponse(500, 'Internal server error'));
  }
}
