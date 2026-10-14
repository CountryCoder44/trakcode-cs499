import Stripe from 'stripe';
import { env } from '../config/env';

// Lazily constructed, same pattern as aiClient.ts — the server boots fine
// without STRIPE_SECRET_KEY; billing routes that need it return a clear 503.
let client: Stripe | null | undefined;

export function getStripeClient(): Stripe | null {
  if (client !== undefined) return client;
  client = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
  return client;
}
