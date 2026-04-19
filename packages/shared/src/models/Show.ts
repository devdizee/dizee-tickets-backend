import mongoose, { Schema, Document, Types } from 'mongoose';

export const SHOW_STATUSES = [
  'pending',
  'confirmed',
  'announced',
  'on_sale',
  'paused',
  'sold_out',
  'completed',
  'cancelled',
  'settled',
] as const;
export type ShowStatus = (typeof SHOW_STATUSES)[number];

export const TICKETING_PROVIDERS = ['ticketsocket', 'manual', 'other'] as const;
export type TicketingProvider = (typeof TICKETING_PROVIDERS)[number];

export interface IShow extends Document {
  artist: string;
  title: string;
  slug: string;
  organizationId: Types.ObjectId;

  perf_date: string;
  end_date?: string;
  show_time?: string;
  announce_date?: string;
  on_sale_date?: string;
  on_sale: boolean;

  city?: string;
  state?: string;
  country?: string;
  venue?: string;
  venue_category?: string;
  territory?: string;

  promoter?: string;
  promoter_company?: string;
  promoter_contact_emails?: string;
  appearing_with?: string;

  status: ShowStatus;
  contract_status?: string;
  deal_type?: string;
  deal_info?: string;
  billing_type?: string;
  split_point?: string;

  guarantee?: number;
  walkout_potential?: number;
  gross_potential?: number;
  net_potential?: number;
  artist_net?: number;
  commission_rate?: string;
  commission_amount?: string;
  currency: string;

  sellable_cap?: number;
  tix_sold?: number;
  ticket_tracking: boolean;
  ticket_link?: string;
  ticket_notes?: string;

  bonus_tiers?: { tickets_threshold: number; bonus_amount: number }[];

  ticketingProvider: TicketingProvider;
  ticketSocketEventId?: string;
  guestListEnabled: boolean;

  notes?: string;
  red_flag: boolean;
  red_flag_notes?: string;

  documents: { label: string; url: string; addedAt: Date }[];
  show_on_ticket_link: boolean;

  /** Public ticket page (per-show) */
  ticket_page_password_enabled?: boolean;
  ticket_page_password?: string;
  ticket_public_price?: number;
  ticket_public_quantity?: number;

  createdAt: Date;
  updatedAt: Date;
}

const ShowSchema = new Schema<IShow>(
  {
    artist: { type: String, required: true, trim: true },
    title: { type: String, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },

    perf_date: { type: String, required: true },
    end_date: { type: String },
    show_time: { type: String },
    announce_date: { type: String },
    on_sale_date: { type: String },
    on_sale: { type: Boolean, default: false },

    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    venue: { type: String, trim: true },
    venue_category: { type: String },
    territory: { type: String },

    promoter: { type: String, trim: true },
    promoter_company: { type: String },
    promoter_contact_emails: { type: String },
    appearing_with: { type: String },

    status: { type: String, required: true, enum: SHOW_STATUSES, default: 'pending' },
    contract_status: { type: String },
    deal_type: { type: String },
    deal_info: { type: String },
    billing_type: { type: String },
    split_point: { type: String },

    guarantee: { type: Number },
    walkout_potential: { type: Number },
    gross_potential: { type: Number },
    net_potential: { type: Number },
    artist_net: { type: Number },
    commission_rate: { type: String },
    commission_amount: { type: String },
    currency: { type: String, default: 'USD', uppercase: true },

    sellable_cap: { type: Number },
    tix_sold: { type: Number, default: 0 },
    ticket_tracking: { type: Boolean, default: false },
    ticket_link: { type: String },
    ticket_notes: { type: String },

    bonus_tiers: [
      {
        tickets_threshold: { type: Number },
        bonus_amount: { type: Number },
      },
    ],

    ticketingProvider: { type: String, enum: TICKETING_PROVIDERS, default: 'manual' },
    ticketSocketEventId: { type: String },
    guestListEnabled: { type: Boolean, default: false },

    notes: { type: String },
    red_flag: { type: Boolean, default: false },
    red_flag_notes: { type: String },

    documents: [
      {
        label: { type: String, trim: true },
        url: { type: String, trim: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    show_on_ticket_link: { type: Boolean, default: true },

    ticket_page_password_enabled: { type: Boolean, default: false },
    ticket_page_password: { type: String },
    ticket_public_price: { type: Number },
    ticket_public_quantity: { type: Number },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

ShowSchema.index({ artist: 1, perf_date: -1 });
ShowSchema.index({ organizationId: 1, perf_date: -1 });
ShowSchema.index({ status: 1, perf_date: -1 });
ShowSchema.index({ ticketSocketEventId: 1 }, { sparse: true });

export const ShowModel = mongoose.model<IShow>('Show', ShowSchema);
