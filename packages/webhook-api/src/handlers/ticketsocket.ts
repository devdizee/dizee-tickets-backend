import { Request, Response } from 'express';
import crypto from 'crypto';
import {
  ShowModel, TicketOrderModel, FanModel, TicketLinkModel,
  IntegrationSyncLogModel, apiResponse,
} from '@dizee-tickets/shared';

function verifyWebhookSignature(payload: string, signature: string | undefined): boolean {
  const secret = process.env.TICKETSOCKET_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function handleTicketSocketWebhook(req: Request, res: Response) {
  const startedAt = new Date();

  try {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-ticketsocket-signature'] as string | undefined;

    if (process.env.TICKETSOCKET_WEBHOOK_SECRET && !verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json(new apiResponse(401, 'Invalid webhook signature'));
    }

    const { event, data } = req.body;

    switch (event) {
      case 'order.created':
      case 'order.updated': {
        const show = await ShowModel.findOne({ ticketSocketEventId: data.eventId });
        if (!show) {
          await IntegrationSyncLogModel.create({
            provider: 'ticketsocket', entityType: 'order', status: 'failed',
            message: `No show mapped for TicketSocket event ${data.eventId}`,
            rawPayload: data, startedAt, completedAt: new Date(),
          });
          return res.status(200).json({ received: true, processed: false });
        }

        const existing = await TicketOrderModel.findOne({ provider: 'ticketsocket', providerOrderId: data.orderId });
        if (existing) {
          existing.quantity = data.quantity || existing.quantity;
          existing.grossAmount = data.grossAmount || existing.grossAmount;
          existing.orderStatus = data.status === 'refunded' ? 'refunded' : existing.orderStatus;
          await existing.save();
        } else {
          let ticketLinkId;
          if (data.trackingId) {
            const link = await TicketLinkModel.findOne({ ticketSocketTrackingId: data.trackingId });
            ticketLinkId = link?._id;
          }

          await TicketOrderModel.create({
            showId: show._id,
            organizationId: show.organizationId,
            ticketLinkId,
            provider: 'ticketsocket',
            providerOrderId: data.orderId,
            buyerName: data.buyerName,
            buyerEmail: data.buyerEmail,
            quantity: data.quantity || 1,
            grossAmount: data.grossAmount || 0,
            netAmount: data.netAmount,
            currency: data.currency || 'USD',
            orderStatus: 'paid',
            purchasedAt: new Date(data.purchasedAt || Date.now()),
          });

          if (ticketLinkId) {
            await TicketLinkModel.findByIdAndUpdate(ticketLinkId, {
              $inc: { orders: 1, ticketsSold: data.quantity || 1, grossSales: data.grossAmount || 0 },
            });
          }
        }

        const orderAgg = await TicketOrderModel.aggregate([
          { $match: { showId: show._id, orderStatus: 'paid' } },
          { $group: { _id: null, totalQty: { $sum: '$quantity' }, totalGross: { $sum: '$grossAmount' } } },
        ]);
        if (orderAgg[0]) {
          show.ticketsSold = orderAgg[0].totalQty;
          show.grossSales = orderAgg[0].totalGross;
          await show.save();
        }

        if (data.buyerEmail) {
          const fan = await FanModel.findOne({ organizationId: show.organizationId, email: data.buyerEmail.toLowerCase() });
          if (fan) {
            if (!fan.showIds.map((id) => id.toString()).includes(show._id.toString())) {
              fan.showIds.push(show._id);
            }
            fan.totalTicketsPurchased += data.quantity || 1;
            fan.totalSpent += data.grossAmount || 0;
            fan.lastSeenAt = new Date();
            await fan.save();
          } else {
            await FanModel.create({
              organizationId: show.organizationId,
              name: data.buyerName,
              email: data.buyerEmail.toLowerCase(),
              source: 'ticketsocket',
              showIds: [show._id],
              totalTicketsPurchased: data.quantity || 1,
              totalSpent: data.grossAmount || 0,
              firstSeenAt: new Date(),
              lastSeenAt: new Date(),
            }).catch(() => {});
          }
        }

        await IntegrationSyncLogModel.create({
          provider: 'ticketsocket', entityType: 'order', entityId: data.orderId,
          status: 'success', message: `Order processed: ${data.quantity} tickets`,
          startedAt, completedAt: new Date(),
        });
        break;
      }

      case 'event.updated': {
        const show = await ShowModel.findOne({ ticketSocketEventId: data.eventId });
        if (show) {
          if (data.ticketsSold !== undefined) show.ticketsSold = data.ticketsSold;
          if (data.grossSales !== undefined) show.grossSales = data.grossSales;
          if (data.capacity !== undefined) show.capacity = data.capacity;
          await show.save();
        }
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    await IntegrationSyncLogModel.create({
      provider: 'ticketsocket', entityType: 'order', status: 'failed',
      message: error.message, rawPayload: req.body, startedAt, completedAt: new Date(),
    });
    return res.status(500).json({ received: false, error: error.message });
  }
}
