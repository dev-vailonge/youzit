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
const MAX_RETRIES = 3;

async function getAccessTypeFromPriceId(priceId: string): Promise<string> {
  const { data: plan, error } = await supabase
    .from('plans')
    .select('access_type')
    .eq('stripe_price_id', priceId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch plan for price ID ${priceId}: ${error.message}`);
  }

  if (!plan) {
    throw new Error(`No plan found for price ID ${priceId}`);
  }

  return plan.access_type;
}

async function updateUserAccess(params: {
  userId: string;
  accessType: string;
  subscriptionId: string;
  customerId?: string;
  retryCount?: number;
}): Promise<void> {
  const { userId, accessType, subscriptionId, customerId, retryCount = 0 } = params;

  try {
    const { error: updateError } = await supabase
      .from('user_access')
      .upsert({
        user_id: userId,
        access_type: accessType,
        start_date: new Date().toISOString(),
        stripe_subscription_id: subscriptionId,
        ...(customerId && { stripe_customer_id: customerId }),
      }, {
        onConflict: 'stripe_subscription_id'
      });

    if (updateError) {
      if (retryCount < MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000; // exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return updateUserAccess({...params, retryCount: retryCount + 1});
      }
      throw updateError;
    }
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return updateUserAccess({...params, retryCount: retryCount + 1});
    }
    throw error;
  }
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

        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const planId = subscription.items.data[0].price.id;
          const accessType = await getAccessTypeFromPriceId(planId);
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          const userId = customer.metadata?.user_id;

          if (!userId) {
            console.error('No user_id found in customer metadata', { customerId, subscriptionId });
            return res.status(400).json({ 
              message: 'No user_id found in customer metadata',
              customerId,
              subscriptionId 
            });
          }

          await updateUserAccess({
            userId,
            accessType,
            subscriptionId,
            customerId
          });

          console.log('Successfully processed checkout session', { userId, accessType, subscriptionId });
        } catch (error) {
          console.error('Error processing checkout session:', error);
          return res.status(500).json({ 
            message: 'Error processing checkout session',
            error: error instanceof Error ? error.message : 'Unknown error',
            customerId,
            subscriptionId
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const subscriptionId = subscription.id;
        const planId = subscription.items.data[0].price.id;

        try {
          const accessType = await getAccessTypeFromPriceId(planId);
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          const userId = customer.metadata?.user_id;

          if (!userId) {
            console.error('No user_id found in customer metadata', { customerId, subscriptionId });
            return res.status(400).json({ 
              message: 'No user_id found in customer metadata',
              customerId,
              subscriptionId 
            });
          }

          await updateUserAccess({
            userId,
            accessType,
            subscriptionId,
            customerId
          });

          console.log('Successfully updated subscription', { userId, accessType, subscriptionId });
        } catch (error) {
          console.error('Error updating subscription:', error);
          return res.status(500).json({ 
            message: 'Error updating subscription',
            error: error instanceof Error ? error.message : 'Unknown error',
            customerId,
            subscriptionId
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const customerId = subscription.customer as string;

        try {
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          const userId = customer.metadata?.user_id;

          if (!userId) {
            console.error('No user_id found in customer metadata', { customerId, subscriptionId });
            return res.status(400).json({ 
              message: 'No user_id found in customer metadata',
              customerId,
              subscriptionId 
            });
          }

          await updateUserAccess({
            userId,
            accessType: 'expired',
            subscriptionId,
            customerId
          });

          console.log('Successfully marked subscription as expired', { userId, subscriptionId });
        } catch (error) {
          console.error('Error marking subscription as expired:', error);
          return res.status(500).json({ 
            message: 'Error marking subscription as expired',
            error: error instanceof Error ? error.message : 'Unknown error',
            customerId,
            subscriptionId
          });
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ 
      message: 'Webhook handler failed',
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
} 