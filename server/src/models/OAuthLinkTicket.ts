import { Schema, model, Document, Types } from 'mongoose';
import { OAUTH_PROVIDERS, OAuthProvider } from './User';

// A one-time ticket that carries "link this provider to user X" across a browser
// redirect. Linking starts with a full-page navigation to /auth/oauth/:p/start,
// and a navigation can't send an Authorization header, so the signed-in client
// first POSTs /auth/oauth/:p/link (which can), gets back a start URL with this
// ticket's id, and navigates to it. The ticket is consumed (deleted) by /start,
// so a leaked URL can't be replayed to attach someone else's provider account.
export interface IOAuthLinkTicket extends Document {
  ticket: string;
  userId: Types.ObjectId;
  provider: OAuthProvider;
  // Client path to land on afterward (e.g. back to the practice workspace).
  returnTo?: string;
  expiresAt: Date;
}

const oauthLinkTicketSchema = new Schema<IOAuthLinkTicket>({
  ticket: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: String, enum: OAUTH_PROVIDERS, required: true },
  returnTo: String,
  // TTL index — Mongo sweeps expired, never-used tickets on its own.
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const OAuthLinkTicket = model<IOAuthLinkTicket>('OAuthLinkTicket', oauthLinkTicketSchema, 'oauthLinkTickets');
