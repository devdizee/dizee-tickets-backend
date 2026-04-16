import dotenv from 'dotenv';
dotenv.config({ path: '.env.dev' });

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import {
  UserModel, OrganizationModel, MembershipModel, ArtistModel,
  PromoterModel, VenueModel, ShowModel, TourModel, TicketLinkModel,
  GuestListModel, GuestRequestModel, FanModel,
  generateShortCode, generateUniqueSlug,
} from '@dizee-tickets/shared';

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI required'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Clean
  const models = [UserModel, OrganizationModel, MembershipModel, ArtistModel, PromoterModel, VenueModel, ShowModel, TourModel, TicketLinkModel, GuestListModel, GuestRequestModel, FanModel];
  for (const m of models) await m.deleteMany({});
  console.log('Cleared all collections');

  // Users
  const passwordHash = await bcrypt.hash('password123', 12);
  const adminUser = await UserModel.create({ name: 'Eddie (Admin)', email: 'eddie@dizee.com', passwordHash, emailVerified: true });
  const artistUser = await UserModel.create({ name: 'SIDEPIECE Manager', email: 'manager@sidepiece.com', passwordHash, emailVerified: true });
  const promoterUser = await UserModel.create({ name: 'Live Nation Rep', email: 'rep@livenation.com', passwordHash, emailVerified: true });
  console.log('Created users');

  // Orgs
  const adminOrg = await OrganizationModel.create({ name: 'DIZEE Admin', slug: 'dizee-admin', type: 'admin' });
  const artistOrg = await OrganizationModel.create({ name: 'SIDEPIECE Team', slug: 'sidepiece-team', type: 'artist' });
  const promoterOrg = await OrganizationModel.create({ name: 'Live Nation', slug: 'live-nation', type: 'promoter' });
  console.log('Created organizations');

  // Memberships
  await MembershipModel.create({ userId: adminUser._id, organizationId: adminOrg._id, role: 'owner', status: 'active' });
  await MembershipModel.create({ userId: artistUser._id, organizationId: artistOrg._id, role: 'owner', status: 'active' });
  await MembershipModel.create({ userId: promoterUser._id, organizationId: promoterOrg._id, role: 'owner', status: 'active' });
  // Admin also has access to artist org for demo purposes
  await MembershipModel.create({ userId: adminUser._id, organizationId: artistOrg._id, role: 'admin', status: 'active' });
  console.log('Created memberships');

  // Artist
  const artist = await ArtistModel.create({
    organizationId: artistOrg._id, name: 'SIDEPIECE', slug: 'sidepiece',
    genre: 'House / Dance', instagramUrl: 'https://instagram.com/sidepiecemusic',
    spotifyUrl: 'https://open.spotify.com/artist/sidepiece',
  });
  console.log('Created artist');

  // Promoter
  const promoter = await PromoterModel.create({
    organizationId: promoterOrg._id, name: 'Live Nation', slug: 'live-nation',
    websiteUrl: 'https://livenation.com', primaryContactName: 'John Doe', primaryContactEmail: 'john@livenation.com',
  });
  console.log('Created promoter');

  // Venues
  const venue1 = await VenueModel.create({ name: 'Exchange LA', slug: 'exchange-la', city: 'Los Angeles', country: 'US', capacity: 1500, organizationId: promoterOrg._id });
  const venue2 = await VenueModel.create({ name: 'Space Miami', slug: 'space-miami', city: 'Miami', country: 'US', capacity: 2500, organizationId: promoterOrg._id });
  const venue3 = await VenueModel.create({ name: 'Brooklyn Mirage', slug: 'brooklyn-mirage', city: 'New York', country: 'US', capacity: 5000, organizationId: promoterOrg._id });
  console.log('Created venues');

  // Tour
  const tour = await TourModel.create({ artistId: artist._id, organizationId: artistOrg._id, name: 'SIDEPIECE Summer Tour 2026', slug: generateUniqueSlug('sidepiece-summer-tour-2026'), status: 'active', startDate: new Date('2026-06-01'), endDate: new Date('2026-09-01') });
  console.log('Created tour');

  // Shows
  const show1 = await ShowModel.create({
    title: 'SIDEPIECE at Exchange LA', slug: generateUniqueSlug('sidepiece-exchange-la'), artistId: artist._id, promoterId: promoter._id, venueId: venue1._id, tourId: tour._id, organizationId: artistOrg._id,
    date: new Date('2026-07-15'), doorsTime: '9:00 PM', showTime: '10:00 PM', timezone: 'America/Los_Angeles', status: 'on_sale', ticketingProvider: 'ticketsocket', capacity: 1500, ticketsSold: 823, grossSales: 41150, currency: 'USD', publicTicketUrl: 'https://ticketsocket.com/sidepiece-exchange-la', guestListEnabled: true,
  });
  const show2 = await ShowModel.create({
    title: 'SIDEPIECE at Space Miami', slug: generateUniqueSlug('sidepiece-space-miami'), artistId: artist._id, promoterId: promoter._id, venueId: venue2._id, tourId: tour._id, organizationId: artistOrg._id,
    date: new Date('2026-07-22'), doorsTime: '10:00 PM', showTime: '11:00 PM', timezone: 'America/New_York', status: 'on_sale', ticketingProvider: 'ticketsocket', capacity: 2500, ticketsSold: 1847, grossSales: 110820, currency: 'USD', guestListEnabled: true,
  });
  const show3 = await ShowModel.create({
    title: 'SIDEPIECE at Brooklyn Mirage', slug: generateUniqueSlug('sidepiece-brooklyn-mirage'), artistId: artist._id, venueId: venue3._id, tourId: tour._id, organizationId: artistOrg._id,
    date: new Date('2026-08-05'), status: 'confirmed', ticketingProvider: 'manual', capacity: 5000, ticketsSold: 0, grossSales: 0, currency: 'USD', guestListEnabled: false,
  });
  console.log('Created shows');

  // Ticket links
  for (const show of [show1, show2]) {
    await TicketLinkModel.create({
      showId: show._id, organizationId: artistOrg._id, createdByUserId: artistUser._id,
      name: `${show.title} - Artist Link`, slug: generateUniqueSlug('artist-link'), shortCode: generateShortCode(),
      type: 'artist', destinationUrl: show.publicTicketUrl || 'https://ticketsocket.com', clicks: Math.floor(Math.random() * 5000), orders: Math.floor(Math.random() * 300), ticketsSold: Math.floor(Math.random() * 500), grossSales: Math.floor(Math.random() * 25000), status: 'active',
    });
    await TicketLinkModel.create({
      showId: show._id, organizationId: promoterOrg._id, createdByUserId: promoterUser._id,
      name: `${show.title} - Promoter Link`, slug: generateUniqueSlug('promoter-link'), shortCode: generateShortCode(),
      type: 'promoter', destinationUrl: show.publicTicketUrl || 'https://ticketsocket.com', clicks: Math.floor(Math.random() * 2000), orders: Math.floor(Math.random() * 100), ticketsSold: Math.floor(Math.random() * 200), grossSales: Math.floor(Math.random() * 10000), status: 'active',
    });
  }
  console.log('Created ticket links');

  // Guest lists
  const gl1 = await GuestListModel.create({ showId: show1._id, organizationId: artistOrg._id, slug: generateUniqueSlug('guestlist'), enabled: true, capacity: 50, requireApproval: true });
  const gl2 = await GuestListModel.create({ showId: show2._id, organizationId: artistOrg._id, slug: generateUniqueSlug('guestlist'), enabled: true, capacity: 100, requireApproval: true });

  await GuestRequestModel.create({ guestListId: gl1._id, showId: show1._id, name: 'Diplo', email: 'diplo@maddecent.com', company: 'Mad Decent', guestCount: 2, status: 'approved', approvedAt: new Date() });
  await GuestRequestModel.create({ guestListId: gl1._id, showId: show1._id, name: 'Skrillex', email: 'skrillex@owsla.com', company: 'OWSLA', guestCount: 4, status: 'pending' });
  await GuestRequestModel.create({ guestListId: gl2._id, showId: show2._id, name: 'Fisher', email: 'fisher@catchandrelease.com', guestCount: 2, status: 'approved', approvedAt: new Date() });
  console.log('Created guest lists');

  // Fans
  const fanNames = ['Alex Johnson', 'Maria Garcia', 'James Chen', 'Taylor Swift Fan', 'Sarah Williams', 'Mike Brown', 'Emma Davis', 'Chris Wilson'];
  const cities = ['Los Angeles', 'Miami', 'New York', 'Chicago', 'Austin', 'Denver', 'Seattle', 'Nashville'];
  for (let i = 0; i < fanNames.length; i++) {
    await FanModel.create({
      organizationId: artistOrg._id, name: fanNames[i], email: `fan${i + 1}@example.com`, city: cities[i], country: 'US', source: i % 2 === 0 ? 'ticketsocket' : 'guest_list',
      showIds: i < 4 ? [show1._id] : [show2._id], totalTicketsPurchased: Math.floor(Math.random() * 4) + 1, totalSpent: Math.floor(Math.random() * 200) + 50, marketingOptIn: i % 3 !== 0,
      firstSeenAt: new Date(Date.now() - Math.random() * 30 * 86400000), lastSeenAt: new Date(),
    });
  }
  console.log('Created fans');

  console.log('\nSeed complete!');
  console.log('Demo accounts (password: password123):');
  console.log('  Admin: eddie@dizee.com');
  console.log('  Artist Manager: manager@sidepiece.com');
  console.log('  Promoter: rep@livenation.com');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
