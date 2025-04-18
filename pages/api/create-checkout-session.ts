import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { priceId, userId, userEmail } = req.body;

    if (!priceId || !userId || !userEmail) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Fetch plan from Supabase
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('stripe_price_id', priceId)
      .single();

    if (planError || !plan) {
      console.error('Error fetching plan:', planError);
      return res.status(400).json({ message: 'Invalid plan' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      customer_email: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      customer_creation: 'always',
      customer_update: {
        name: 'auto',
        address: 'auto'
      },
      subscription_data: {
        metadata: {
          planId: plan.id,
        },
      },
      metadata: {
        user_id: userId  // This will be copied to the customer metadata
      },
      success_url: `${SITE_URL}/dashboard?subscription_id={SUBSCRIPTION_ID}`,
      cancel_url: `${SITE_URL}/pricing`,
    });

    console.log('Created checkout session:', {
      sessionId: session.id,
      customerEmail: userEmail,
      userId: userId
    });

    return res.status(200).json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ 
      message: 'Error creating checkout session',
      error: error.message 
    });
  }
} 