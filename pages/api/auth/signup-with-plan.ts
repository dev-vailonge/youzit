import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, plan } = req.body;

  if (!email || !password || !plan) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Create a new user in Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          is_subscribed: false,
          subscription_status: 'pending',
          onboarding_completed: false,
          selected_plan: plan
        }
      }
    });

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create user');
    }

    // Create a customer in Stripe
    const customer = await stripe.customers.create({
      email,
      metadata: {
        user_id: authData.user.id
      }
    });

    // Get plan details from Stripe
    const priceDetails = await stripe.prices.retrieve(plan);
    const planName = priceDetails.nickname || (plan.includes('pro') ? 'Pro' : 'Starter');

    // Store the initial subscription record with selected plan
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: authData.user.id,
        stripe_customer_id: customer.id,
        status: 'incomplete',
        plan: plan.includes('pro') ? 'pro' : 'starter',
        plan_name: planName,
        customer_email: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_period_end: null, // Will be set by webhook after payment
        cancel_at_period_end: false,
      });

    if (subscriptionError) {
      console.error('Error storing subscription:', subscriptionError);
      // Don't throw here, as we still want to proceed with checkout
    }

    // Update user with initial plan info
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        is_subscribed: false,
        subscription_status: 'incomplete',
        plan: plan.includes('pro') ? 'pro' : 'starter',
        plan_name: planName
      })
      .eq('id', authData.user.id);

    if (userUpdateError) {
      console.error('Error updating user:', userUpdateError);
      // Don't throw here, as we still want to proceed with checkout
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customer.id,
      line_items: [
        {
          price: plan, // This should be the Stripe price ID
          quantity: 1,
        },
      ],
      success_url: `${DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/pricing`,
      client_reference_id: authData.user.id,
      metadata: {
        user_id: authData.user.id,
      },
      subscription_data: {
        metadata: {
          user_id: authData.user.id,
        },
      },
    });

    return res.status(200).json({
      sessionId: session.id,
      userId: authData.user.id
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: error.message });
  }
} 