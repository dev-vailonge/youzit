import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, email } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id' });
    }

    // Create initial free subscription
    const initialSubscription = {
      user_id,
      customer_email: email || '',
      status: 'active',
      plan: 'free',
      plan_name: 'Gratuito',
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    };

    // Insert the subscription
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert(initialSubscription);

    if (subError) {
      console.error('Failed to create initial subscription:', subError);
      return res.status(500).json({ 
        error: `Failed to create initial subscription: ${subError.message}` 
      });
    }

    // Update user with free plan info
    const { error: userError } = await supabase
      .from('users')
      .update({
        is_subscribed: true,
        subscription_status: 'active',
        plan: 'free',
        plan_name: 'Gratuito'
      })
      .eq('id', user_id);

    if (userError) {
      console.error('Failed to update user with free plan:', userError);
      return res.status(500).json({ 
        error: `Failed to update user with free plan: ${userError.message}` 
      });
    }

    return res.status(200).json({ success: true, subscription: initialSubscription });
  } catch (error: any) {
    console.error('Error creating initial subscription:', error);
    return res.status(500).json({ error: error.message });
  }
} 