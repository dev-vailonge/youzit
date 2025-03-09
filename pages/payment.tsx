import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import stripePromise from "../utils/stripe";

export default function Payment() {
  const router = useRouter();
  const { plan } = router.query;
  const [selectedPlan, setSelectedPlan] = useState(plan || 'starter');
  const [loading, setLoading] = useState(false);

  const plans = {
    free: {
      name: 'Grátis',
      price: 0,
      period: '',
      features: [
        '5 prompts no total',
        'Análise básica',
        'IA básica'
      ]
    },
    starter: {
      name: 'Starter',
      price: 47,
      period: '/mês',
      features: [
        '15 prompts por mês',
        'IA intermediária',
        '7 dias de teste grátis'
      ]
    },
    pro: {
      name: 'Pro',
      price: 89,
      period: '/mês',
      yearlyPrice: 890,
      features: [
        'Posts ilimitados',
        'IA prioritária',
        'Refine prompt',
        '7 dias de teste grátis'
      ]
    }
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      
      // Create a Checkout Session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: selectedPlan,
        }),
      });

      const { sessionId, error } = await response.json();

      if (error) {
        console.error('Error creating checkout session:', error);
        alert('Erro ao processar pagamento. Por favor, tente novamente.');
        return;
      }

      // Redirect to Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        console.error('Stripe redirect error:', stripeError);
        alert('Erro ao redirecionar para o checkout. Por favor, tente novamente.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert('Erro ao processar pagamento. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Don't show payment for free plan
  if (selectedPlan === 'free') {
    router.push('/dashboard');
    return null;
  }

  return (
    <>
      <Head>
        <title>YouZit - Pagamento</title>
      </Head>

      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="border-b bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex h-16 items-center">
              <Link href="/" className="text-xl font-semibold hover:text-[#0066FF] transition">
                YouZit
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Finalizar Assinatura
              </h2>
              <p className="text-gray-600">
                Você selecionou o plano {plans[selectedPlan as keyof typeof plans]?.name}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">
                  {plans[selectedPlan as keyof typeof plans]?.name}
                </h3>
                <p className="text-3xl font-bold">
                  R${plans[selectedPlan as keyof typeof plans]?.price}
                  <span className="text-lg font-normal text-gray-600">
                    {plans[selectedPlan as keyof typeof plans]?.period}
                  </span>
                </p>
                {selectedPlan === 'pro' && (
                  <p className="text-sm text-gray-600 mt-1">
                    ou R${plans.pro.yearlyPrice}/ano (2 meses grátis)
                  </p>
                )}
              </div>

              <div className="space-y-4 mb-6">
                {plans[selectedPlan as keyof typeof plans]?.features.map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2"
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
                    {feature}
                  </div>
                ))}
              </div>

              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full py-3 bg-[#0066FF] text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processando...' : 'Continuar para o pagamento'}
              </button>
            </div>

            <p className="text-center text-sm text-gray-600">
              Ao continuar, você concorda com os{" "}
              <Link href="/terms" className="text-blue-600 hover:text-blue-700">
                Termos de Serviço
              </Link>{" "}
              e{" "}
              <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
                Política de Privacidade
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
} 