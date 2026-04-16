import { ShowModel } from '@dizee-tickets/shared';

export async function processShowLifecycle() {
  const now = new Date();

  const result = await ShowModel.updateMany(
    { date: { $lt: now }, status: { $in: ['on_sale', 'confirmed', 'paused'] } },
    { $set: { status: 'completed' } }
  );

  console.log(`Show lifecycle: marked ${result.modifiedCount} shows as completed`);
  return { completed: result.modifiedCount };
}
