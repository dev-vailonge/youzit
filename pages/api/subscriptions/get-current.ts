import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription_id } = req.query;

    if (!subscription_id) {
      return res.status(400).json({ error: 'Subscription ID is required' });
    }

    const subscription = await stripe.subscriptions.retrieve(subscription_id as string);
    const customerId = subscription.customer as string;

    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    const userId = customer.metadata?.user_id;

    if (!userId) {
      return res.status(400).json({ error: 'No user_id found in customer metadata' });
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('stripe_price_id', subscription.items.data[0].price.id)
      .single();

    if (planError) {
      return res.status(500).json({ error: 'Error fetching plan details' });
    }

    const { data: existingAccess, error: existingError } = await supabaseAdmin
      .from('user_access')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Error checking existing access' });
    }

    const { error: accessError } = await supabaseAdmin
      .from('user_access')
      .upsert({
        user_id: userId,
        access_type: plan.name.toLowerCase(),
        status: subscription.status === 'active' ? 'active' : 'expired',
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        start_date: new Date(subscription.start_date * 1000).toISOString(),
      }, {
        onConflict: existingAccess ? 'user_id' : 'stripe_subscription_id'
      });

    if (accessError) {
      return res.status(500).json({ error: 'Error updating user access' });
    }

    const response = {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000),
        current_period_start: new Date(subscription.current_period_start * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end,
        plan: plan,
      }
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ 
      error: 'Error fetching subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 