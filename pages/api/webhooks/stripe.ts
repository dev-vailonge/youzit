import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// Initialize Supabase with service role key for admin access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Disable body parsing (use raw body)
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: 'Internal server error' });
  }

  const sig = req.headers['stripe-signature'] as string;
  const buf = await buffer(req);

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).json({ error: 'Webhook error' });
  }

  try {
    if (event.type === 'customer.subscription.updated' ||
        event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      
      const { data: subscriptionData, error: subscriptionError } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('stripe_customer_id', subscription.customer)
        .single();

      if (subscriptionError || !subscriptionData) {
        return res.status(400).json({ error: 'Subscription not found' });
      }

      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_customer_id', subscription.customer);

      if (updateError) {
        return res.status(500).json({ error: 'Update failed' });
      }
    }

    res.json({ received: true });
  } catch {
    // Silent fail - webhook processing error
    res.status(500).json({ error: 'Internal server error' });
  }
} 