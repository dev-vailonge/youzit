import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';

const PLANS = {
  starter: {
    price: 'price_1R05toIzbUo8eOkyFGSzCz0a', // Replace with your Stripe price ID
    name: 'Starter',
    amount: 47,
  },
  pro: {
    price: 'price_1R06N4IzbUo8eOkyFBn9GKPK', // Replace with your Stripe price ID
    name: 'Pro',
    amount: 89,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan } = req.body;

    if (!plan || !PLANS[plan as keyof typeof PLANS]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Get the user from the session
    const { data: { session: userSession } } = await supabase.auth.getSession();
    
    if (!userSession?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Create Checkout Sessions from body params.
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PLANS[plan as keyof typeof PLANS].price,
          quantity: 1,
        },
      ],
      success_url: `${DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/pricing`,
      client_reference_id: userSession.user.id,
      metadata: {
        plan,
        user_id: userSession.user.id,
        plan_name: PLANS[plan as keyof typeof PLANS].name,
      },
      subscription_data: {
        metadata: {
          user_id: userSession.user.id,
        },
      },
    });

    res.status(200).json({ sessionId: checkoutSession.id });
  } catch (err: any) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: err.message });
  }
} 