import { Response } from 'express';
import { apiResponse } from '@dizee-tickets/shared';
import { AuthenticatedRequest } from '@dizee-tickets/shared';

interface TMEvent {
  id: string;
  name: string;
  url: string;
  dates: {
    start: { localDate?: string; localTime?: string };
    status: { code?: string };
  };
  venue?: string;
  city?: string;
  state?: string;
  genre?: string;
  attractions: string[];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function classifyLevel(count: number): 'clear' | 'moderate' | 'saturated' {
  if (count === 0) return 'clear';
  if (count <= 3) return 'moderate';
  return 'saturated';
}

export async function getRadius(req: AuthenticatedRequest, res: Response) {
  try {
    const city = (req.query.city as string) || '';
    const stateCode = (req.query.stateCode as string) || '';
    const showDate = (req.query.showDate as string) || '';
    const countryCode = (req.query.countryCode as string) || 'US';
    const radius = (req.query.radius as string) || '50';
    const unit = (req.query.unit as string) || 'miles';

    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      return res.status(200).json(new apiResponse(200, 'Ticketmaster not configured', {
        level: 'clear',
        eventCount: 0,
        events: [],
      }));
    }

    const params = new URLSearchParams();
    params.set('apikey', apiKey);
    params.set('countryCode', countryCode);
    params.set('radius', radius);
    params.set('unit', unit);
    params.set('size', '50');

    if (city) params.set('city', city);
    if (stateCode) params.set('stateCode', stateCode);

    if (showDate) {
      const start = addDays(showDate, -30);
      const end = addDays(showDate, 30);
      params.set('startDateTime', `${start}T00:00:00Z`);
      params.set('endDateTime', `${end}T23:59:59Z`);
    }

    const url = `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(200).json(new apiResponse(200, 'Ticketmaster upstream error', {
        level: 'clear',
        eventCount: 0,
        events: [],
      }));
    }

    const data: any = await response.json();
    const rawEvents: any[] = data?._embedded?.events || [];

    const events: TMEvent[] = rawEvents.map((ev) => {
      const venue = ev?._embedded?.venues?.[0];
      const attractions: string[] = (ev?._embedded?.attractions || []).map((a: any) => a?.name).filter(Boolean);
      const classification = ev?.classifications?.[0];
      return {
        id: ev.id,
        name: ev.name,
        url: ev.url,
        dates: {
          start: {
            localDate: ev?.dates?.start?.localDate,
            localTime: ev?.dates?.start?.localTime,
          },
          status: { code: ev?.dates?.status?.code },
        },
        venue: venue?.name,
        city: venue?.city?.name,
        state: venue?.state?.stateCode || venue?.state?.name,
        genre: classification?.genre?.name,
        attractions,
      };
    });

    const eventCount = events.length;
    const level = classifyLevel(eventCount);

    return res.status(200).json(new apiResponse(200, 'Ticketmaster radius', {
      level,
      eventCount,
      events,
    }));
  } catch (error: any) {
    return res.status(200).json(new apiResponse(200, 'Ticketmaster error', {
      level: 'clear',
      eventCount: 0,
      events: [],
    }, error.message));
  }
}
