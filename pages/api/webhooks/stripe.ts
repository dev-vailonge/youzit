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

  const signature = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Missing Stripe webhook secret');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  try {
    const rawBody = await buffer(req);
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );

    console.log('Received webhook event:', event.type);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.trial_will_end':
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get the customer's user record from Supabase using subscriptions table
        const { data: subscriptionData, error: subscriptionError } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', subscription.customer)
          .single();

        if (subscriptionError || !subscriptionData) {
          console.error('Subscription not found:', subscriptionError);
          return res.status(400).json({ error: 'Subscription not found' });
        }

        // Get price details
        const priceId = subscription.items.data[0]?.price?.id;
        const priceData = await stripe.prices.retrieve(priceId || '');
        const planName = priceData.nickname?.toLowerCase() || 'starter';

        // Prepare subscription update data
        const updateData = {
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
          plan: subscription.status === 'active' ? planName : 'free',
          plan_name: subscription.status === 'active' ? planName : 'free'
        };

        // Update subscription in Supabase
        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update(updateData)
          .eq('user_id', subscriptionData.user_id);

        if (updateError) {
          console.error('Error updating subscription:', updateError);
          return res.status(400).json({ error: 'Error updating subscription' });
        }

        console.log('Successfully updated subscription for user:', subscriptionData.user_id);
        break;

      case 'customer.deleted':
        // Handle customer deletion if needed
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).json({ 
      error: 'Webhook error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 