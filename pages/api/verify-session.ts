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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get the customer ID and subscription ID from the session
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    const userId = session.client_reference_id;

    if (!customerId || !subscriptionId || !userId) {
      return res.status(400).json({ 
        error: 'Invalid session data',
        details: {
          customerId: !customerId ? 'Missing customer ID' : undefined,
          subscriptionId: !subscriptionId ? 'Missing subscription ID' : undefined,
          userId: !userId ? 'Missing user ID' : undefined
        }
      });
    }

    // Get the subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Check if subscription exists in database
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Prepare subscription data
    const subscriptionData = {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      status: subscription.status,
      plan: subscription.items.data[0].price.lookup_key || subscription.items.data[0].price.id,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    };

    // Update or insert subscription
    const { error: updateError } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'user_id'
      });

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update subscription status',
        details: updateError.message
      });
    }

    return res.status(200).json({
      success: true,
      userId,
      customerId,
      subscriptionId,
      status: subscription.status,
    });
  } catch (error: any) {
    console.error('Error verifying session:', error);
    return res.status(500).json({ 
      error: error.message || 'An unexpected error occurred',
      details: error.stack
    });
  }
} 