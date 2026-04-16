import axios, { AxiosInstance } from 'axios';

let tsClient: AxiosInstance | null = null;

export function getTicketSocketClient(): AxiosInstance {
  if (!tsClient) {
    const baseURL = process.env.TICKETSOCKET_API_URL;
    const apiKey = process.env.TICKETSOCKET_API_KEY;

    if (!baseURL || !apiKey) {
      throw new Error('TICKETSOCKET_API_URL and TICKETSOCKET_API_KEY are required');
    }

    tsClient = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }
  return tsClient;
}

export interface TicketSocketEvent {
  id: string;
  name: string;
  date: string;
  venue?: string;
  capacity?: number;
  ticketsSold?: number;
  grossSales?: number;
}

export interface TicketSocketOrder {
  id: string;
  eventId: string;
  buyerName?: string;
  buyerEmail?: string;
  quantity: number;
  grossAmount: number;
  netAmount?: number;
  currency: string;
  status: string;
  purchasedAt: string;
  trackingId?: string;
}

export interface TicketSocketBuyer {
  email: string;
  name?: string;
  phone?: string;
  city?: string;
  country?: string;
}
