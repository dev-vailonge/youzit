import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

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

    // Get subscription directly
    const subscription = await stripe.subscriptions.retrieve(subscription_id as string);
    const customerId = subscription.customer as string;

    // Get customer to get user_id
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    const userId = customer.metadata?.user_id;

    if (!userId) {
      return res.status(400).json({ error: 'No user_id found in customer metadata' });
    }

    // Get plan details from Supabase
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('stripe_price_id', subscription.items.data[0].price.id)
      .single();

    if (planError) {
      console.error('Error fetching plan:', planError);
      return res.status(500).json({ error: 'Error fetching plan details' });
    }

    // First check if user has existing access
    const { data: existingAccess, error: existingError } = await supabase
      .from('user_access')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking existing access:', existingError);
      return res.status(500).json({ error: 'Error checking existing access' });
    }

    // Update or insert user_access
    const { error: accessError } = await supabase
      .from('user_access')
      .upsert({
        user_id: userId,
        access_type: plan.access_type,
        status: subscription.status === 'active' ? 'active' : 'expired',
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        start_date: new Date(subscription.start_date * 1000).toISOString(),
      }, {
        onConflict: existingAccess ? 'user_id' : 'stripe_subscription_id'
      });

    if (accessError) {
      console.error('Error updating user access:', accessError);
      return res.status(500).json({ error: 'Error updating user access' });
    }

    return res.status(200).json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000),
        current_period_start: new Date(subscription.current_period_start * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end,
        plan: plan,
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return res.status(500).json({ 
      error: 'Error fetching subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 