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
  const [plansLoading, setPlansLoading] = useState(true);
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
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (sub) {
            setSubscription({
              plan: sub.plan,
              plan_name: sub.plan_name,
              status: sub.status,
              currentPeriodEnd: sub.current_period_end,
            });
          }
        }
      } catch {
        // Silent fail - user not authenticated
      } finally {
        setPageLoading(false);
      }
    };
    getUser();
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
        return;
      }

      if (data) {
        setPlans(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setPlansLoading(false);
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleSelectPlan = async (planId: string) => {
    setLoading(true);
    try {
      if (!user) {
        router.push('/signin');
        return;
      }

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: planId,
          userId: user.id,
          userEmail: user.email
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Erro ao criar sessão de pagamento');
      }

      if (!data.sessionId) {
        throw new Error('Sessão de pagamento não foi criada');
      }

      const stripe = await stripePromise;
      
      if (!stripe) {
        throw new Error('Stripe não foi inicializado');
      }

      const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      
      if (error) {
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'Ocorreu um erro ao processar o pagamento. Por favor, tente novamente.');
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

      <div className="min-h-screen bg-white">
        <Header />
        
        <main className="container mx-auto px-4 py-20">
          <h1 className="text-4xl font-bold text-center mb-16">
            Planos e Preços
          </h1>

          {plansLoading ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[900px]">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="bg-white rounded-lg p-8 border flex flex-col"
                  >
                    <div>
                      <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
                      <div className="flex items-baseline mb-8">
                        <span className="text-4xl font-bold">R${plan.price}</span>
                        <span className="text-gray-600 ml-2">/mês</span>
                      </div>
                      
                      <ul className="space-y-4 mb-8">
                        {plan.description.split(',').map((feature: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <svg
                              className="h-5 w-5 text-green-500 mt-1 mr-3 flex-shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span className="text-gray-600">
                              {feature.trim()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => handleSelectPlan(plan.stripe_price_id)}
                      disabled={loading}
                      className="w-full text-center py-3 px-4 rounded-full border border-[#0066FF] text-[#0066FF] hover:bg-[#0066FF]/5 transition mt-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Processando...' : `Começar ${plan.name}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
} 