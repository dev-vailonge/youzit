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
      return res.status(400).json({ message: 'Invalid plan' });
    }

    // Find or create customer
    let customer;
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1
    });

    if (customers.data.length > 0) {
      customer = customers.data[0];
      // Update customer metadata if needed
      if (!customer.metadata.user_id) {
        customer = await stripe.customers.update(customer.id, {
          metadata: { user_id: userId }
        });
      }
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: { user_id: userId }
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          planId: plan.id,
          user_id: userId
        },
      },
      success_url: `${SITE_URL}/dashboard?subscription_id={SUBSCRIPTION_ID}`,
      cancel_url: `${SITE_URL}/pricing`,
    });

    return res.status(200).json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Error creating checkout session:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    return res.status(500).json({ 
      message: 'Error creating checkout session',
      error: error.message,
      type: error.type,
      code: error.code
    });
  }
} 