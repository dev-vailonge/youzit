import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check environment variables
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Missing STRIPE_SECRET_KEY');
    return res.status(500).json({ error: 'Configuration error' });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables');
    return res.status(500).json({ error: 'Configuration error' });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get the Bearer token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token and get user data
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    console.log('Authenticated user:', user.id);

    // Get user's stripe customer id from Supabase
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    console.log('Database query result:', { subscriptionData, error: subscriptionError });

    if (subscriptionError || !subscriptionData?.stripe_customer_id) {
      console.error('Subscription data error:', subscriptionError);
      return res.status(400).json({ 
        error: 'Cliente Stripe não encontrado para este usuário. Por favor, faça uma assinatura primeiro.' 
      });
    }

    // Create Stripe Portal session
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const returnUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: subscriptionData.stripe_customer_id,
        return_url: `${returnUrl}/settings`,
        configuration: process.env.NODE_ENV === 'production' 
          ? undefined // Use default configuration in production
          : 'bpc_1OvKmXIzbUo8eOkyXXXXXXXX' // Replace with your test configuration ID if needed
      });

      return res.status(200).json({ url: session.url });
    } catch (stripeError: any) {
      console.error('Stripe portal session error:', stripeError);
      
      // Fallback to test portal URL if in development and there's an error
      if (process.env.NODE_ENV !== 'production') {
        return res.status(200).json({ 
          url: 'https://billing.stripe.com/p/login/test_fZeg1Y2Wn63VaCQdQQ' 
        });
      }
      
      throw stripeError; // Re-throw in production for proper error handling
    }
  } catch (error: any) {
    console.error('Error in create-portal-session:', error);
    return res.status(500).json({ 
      error: error.message || 'Erro interno do servidor' 
    });
  }
} 