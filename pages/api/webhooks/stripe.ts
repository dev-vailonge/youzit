import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
});

// This is necessary to handle the raw body for Stripe webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function getAccessTypeFromPriceId(priceId: string): Promise<string> {
  const { data: plan, error } = await supabase
    .from('plans')
    .select('access_type')
    .eq('stripe_price_id', priceId)
    .single();

  if (error || !plan) {
    console.error('Error fetching plan:', error);
    return 'trial';
  }

  return plan.access_type;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature']!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({ message: 'Webhook signature verification failed' });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        // Get subscription details to determine the plan
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const planId = subscription.items.data[0].price.id;

        // Get access type from plans table
        const accessType = await getAccessTypeFromPriceId(planId);

        // Get user_id from customer metadata
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const userId = customer.metadata?.user_id;

        if (!userId) {
          console.error('No user_id found in customer metadata');
          return res.status(400).json({ message: 'No user_id found in customer metadata' });
        }

        // Update user access in database
        const { error: updateError } = await supabase
          .from('user_access')
          .upsert({
            user_id: userId,
            access_type: accessType,
            start_date: new Date().toISOString(),
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId
          });

        if (updateError) {
          console.error('Error updating user access:', updateError);
          return res.status(500).json({ message: 'Error updating user access' });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const subscriptionId = subscription.id;
        const planId = subscription.items.data[0].price.id;

        // Get access type from plans table
        const accessType = await getAccessTypeFromPriceId(planId);

        // Get user_id from customer metadata
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const userId = customer.metadata?.user_id;

        if (!userId) {
          console.error('No user_id found in customer metadata');
          return res.status(400).json({ message: 'No user_id found in customer metadata' });
        }

        // Update user access
        const { error: updateError } = await supabase
          .from('user_access')
          .update({
            access_type: accessType,
            start_date: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscriptionId);

        if (updateError) {
          console.error('Error updating user access:', updateError);
          return res.status(500).json({ message: 'Error updating user access' });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        // Update user access to expired
        const { error: updateError } = await supabase
          .from('user_access')
          .update({
            access_type: 'expired',
            start_date: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscriptionId);

        if (updateError) {
          console.error('Error updating user access:', updateError);
          return res.status(500).json({ message: 'Error updating user access' });
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ message: 'Webhook handler failed' });
  }
} 