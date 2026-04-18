import { getTicketSocketClient, TicketSocketEvent, TicketSocketOrder, TicketSocketBuyer } from './client';
import { ShowModel } from '../../models/Show';
import { TicketOrderModel } from '../../models/TicketOrder';
import { FanModel } from '../../models/Fan';
import { IntegrationSyncLogModel } from '../../models/IntegrationSyncLog';

export async function fetchEventDetails(ticketSocketEventId: string): Promise<TicketSocketEvent | null> {
  try {
    const client = getTicketSocketClient();
    const response = await client.get(`/events/${ticketSocketEventId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch TicketSocket event ${ticketSocketEventId}:`, error);
    return null;
  }
}

export async function fetchEventOrders(ticketSocketEventId: string): Promise<TicketSocketOrder[]> {
  try {
    const client = getTicketSocketClient();
    const response = await client.get(`/events/${ticketSocketEventId}/orders`);
    return response.data?.orders || [];
  } catch (error) {
    console.error(`Failed to fetch orders for TicketSocket event ${ticketSocketEventId}:`, error);
    return [];
  }
}

export async function fetchEventBuyers(ticketSocketEventId: string): Promise<TicketSocketBuyer[]> {
  try {
    const client = getTicketSocketClient();
    const response = await client.get(`/events/${ticketSocketEventId}/buyers`);
    return response.data?.buyers || [];
  } catch (error) {
    console.error(`Failed to fetch buyers for TicketSocket event ${ticketSocketEventId}:`, error);
    return [];
  }
}

export async function syncShowFromTicketSocket(showId: string): Promise<{ success: boolean; message: string }> {
  const startedAt = new Date();

  try {
    const show = await ShowModel.findById(showId);
    if (!show || !show.ticketSocketEventId) {
      return { success: false, message: 'Show not found or no TicketSocket event mapped' };
    }

    const eventData = await fetchEventDetails(show.ticketSocketEventId);
    if (!eventData) {
      await IntegrationSyncLogModel.create({
        provider: 'ticketsocket',
        entityType: 'show',
        entityId: showId,
        status: 'failed',
        message: 'Failed to fetch event from TicketSocket',
        startedAt,
        completedAt: new Date(),
      });
      return { success: false, message: 'Failed to fetch event data from TicketSocket' };
    }

    await ShowModel.findByIdAndUpdate(showId, {
      tix_sold: eventData.ticketsSold ?? show.tix_sold,
      sellable_cap: eventData.capacity ?? show.sellable_cap,
    });

    await IntegrationSyncLogModel.create({
      provider: 'ticketsocket',
      entityType: 'show',
      entityId: showId,
      status: 'success',
      message: `Synced: ${eventData.ticketsSold} tickets, $${eventData.grossSales} gross`,
      startedAt,
      completedAt: new Date(),
    });

    return { success: true, message: 'Show synced successfully' };
  } catch (error: any) {
    await IntegrationSyncLogModel.create({
      provider: 'ticketsocket',
      entityType: 'show',
      entityId: showId,
      status: 'failed',
      message: error.message,
      startedAt,
      completedAt: new Date(),
    });
    return { success: false, message: error.message };
  }
}

export async function syncOrdersFromTicketSocket(showId: string): Promise<{ imported: number; errors: number }> {
  const show = await ShowModel.findById(showId);
  if (!show?.ticketSocketEventId) return { imported: 0, errors: 0 };

  const orders = await fetchEventOrders(show.ticketSocketEventId);
  let imported = 0;
  let errors = 0;

  for (const order of orders) {
    try {
      const existing = await TicketOrderModel.findOne({
        provider: 'ticketsocket',
        providerOrderId: order.id,
      });
      if (existing) continue;

      await TicketOrderModel.create({
        showId: show._id,
        organizationId: show.organizationId,
        provider: 'ticketsocket',
        providerOrderId: order.id,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        quantity: order.quantity,
        grossAmount: order.grossAmount,
        netAmount: order.netAmount,
        currency: order.currency || 'USD',
        orderStatus: 'paid',
        purchasedAt: new Date(order.purchasedAt),
      });
      imported++;
    } catch (err) {
      errors++;
    }
  }

  return { imported, errors };
}

export async function syncBuyersAsFans(showId: string): Promise<{ imported: number; updated: number }> {
  const show = await ShowModel.findById(showId);
  if (!show?.ticketSocketEventId) return { imported: 0, updated: 0 };

  const buyers = await fetchEventBuyers(show.ticketSocketEventId);
  let imported = 0;
  let updated = 0;

  for (const buyer of buyers) {
    if (!buyer.email) continue;

    try {
      const existing = await FanModel.findOne({
        organizationId: show.organizationId,
        email: buyer.email.toLowerCase(),
      });

      if (existing) {
        const showIdStr = show._id.toString();
        if (!existing.showIds.map((id) => id.toString()).includes(showIdStr)) {
          existing.showIds.push(show._id);
        }
        existing.lastSeenAt = new Date();
        existing.name = existing.name || buyer.name;
        existing.city = existing.city || buyer.city;
        existing.country = existing.country || buyer.country;
        await existing.save();
        updated++;
      } else {
        await FanModel.create({
          organizationId: show.organizationId,
          name: buyer.name,
          email: buyer.email.toLowerCase(),
          phone: buyer.phone,
          city: buyer.city,
          country: buyer.country,
          source: 'ticketsocket',
          showIds: [show._id],
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
        });
        imported++;
      }
    } catch (err) {
      // dedup collision — safe to ignore
    }
  }

  return { imported, updated };
}
