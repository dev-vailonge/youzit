import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { loadStripe } from '@stripe/stripe-js';
import Link from 'next/link';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function Pricing() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<{
    plan: "free" | "starter" | "pro";
    plan_name?: string;
    status: "active" | "canceled" | "past_due";
    currentPeriodEnd?: string;
  }>({ plan: "free", status: "active" });

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          // Fetch subscription data
          const { data: sub, error } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (!error && sub) {
            setSubscription({
              plan: sub.plan,
              plan_name: sub.plan_name,
              status: sub.status,
              currentPeriodEnd: sub.current_period_end,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setPageLoading(false);
      }
    };
    getUser();
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setPageLoading(true);
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
        return;
      }

      if (data) {
        // Find the current plan
        const currentPlan = data.find(
          plan => plan.name.toLowerCase() === subscription.plan.toLowerCase() ||
                 plan.name === subscription.plan_name
        );

        if (currentPlan) {
          // Filter to show only current plan and higher priced plans
          const filteredPlans = data.filter(plan => plan.price >= currentPlan.price);
          setPlans(filteredPlans);
        } else {
          // If no current plan (new user), show all plans
          setPlans(data);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setPageLoading(false);
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleSelectPlan = async (planId: string | null, planType: string) => {
    setLoading(true);
    try {
      if (!user) {
        // If user is not logged in, redirect to signup with plan
        router.push(`/signup-with-plan?plan=${planId}`);
        return;
      }

      if (!planId) {
        // Free plan
        router.push('/dashboard');
        return;
      }

      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: planId,
        }),
      });

      const { sessionId } = await response.json();
      const stripe = await stripePromise;
      
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <>
        <Head>
          <title>YouZit - Planos e Preços</title>
        </Head>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>YouZit - Planos e Preços</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-8">
              Planos e Preços
            </h1>
          </div>

          <div className="flex justify-center items-center">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8 w-full max-w-6xl">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="relative rounded-2xl bg-white p-8 flex flex-col h-full"
                >
                  {(plan.name.toLowerCase() === subscription.plan.toLowerCase() || 
                    plan.name === subscription.plan_name) && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-[#0066FF] text-white text-xs px-3 py-1 rounded-full font-medium">
                        PLANO ATUAL
                      </span>
                    </div>
                  )}

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {plan.name}
                    </h2>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">
                        R${plan.price}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-gray-500">
                          /mês
                        </span>
                      )}
                    </div>
                    {plan.yearly_price && (
                      <p className="text-sm mt-2 text-gray-500">
                        R$890/ano (2 meses grátis)
                      </p>
                    )}

                    <ul className="space-y-4 mt-6">
                      {plan.description.split(',').map((feature: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <svg
                            className="h-5 w-5 text-green-500 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="ml-3 text-gray-600">
                            {feature.trim()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {!(plan.name.toLowerCase() === subscription.plan.toLowerCase() || 
                     plan.name === subscription.plan_name) && (
                    <div className="mt-auto pt-8">
                      <Link
                        href={plan.price === 0 
                          ? '/signup'
                          : `/signup-with-plan?plan=${plan.stripe_price_id}`}
                        className="w-full inline-block text-center py-3 rounded-full transition border border-[#0066FF] text-[#0066FF] hover:bg-[#0066FF]/5"
                      >
                        {plan.price === 0 
                          ? 'Começar Grátis' 
                          : `Começar ${plan.name}`}
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
} 