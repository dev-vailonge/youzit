import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Head from "next/head";
import { useRouter } from "next/router";
import Header from "@/components/Header";

export default function Dashboard() {
  const router = useRouter();
  const { subscription_id } = router.query;
  const [loading, setLoading] = useState(true);
  const [promptCount, setPromptCount] = useState(0);
  const [contentCount, setContentCount] = useState(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Don't initialize until router is ready
    if (!router.isReady) return;

    const initialize = async () => {
      // Prevent duplicate initialization
      if (initializedRef.current) {
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Initializing dashboard with subscription_id:', subscription_id);
        setLoading(true);
        initializedRef.current = true;

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.log('❌ No authenticated user found');
          router.push('/signin');
          return;
        }

        // Only fetch subscription status if we have a subscription_id
        if (subscription_id) {
          console.log('📡 Fetching subscription status for ID:', subscription_id);
          const response = await fetch(`/api/subscriptions/get-current?subscription_id=${subscription_id}`);
          console.log('📡 Subscription status response:', response.status);
          if (!response.ok) {
            console.error('Error checking subscription status:', await response.text());
          } else {
            const data = await response.json();
            console.log('✅ Successfully checked subscription status:', data);
          }
          // Remove the subscription_id from URL
          router.replace('/dashboard', undefined, { shallow: true });
        } else {
          console.log('ℹ️ No subscription_id in URL, skipping subscription check');
        }

        // Continue with existing checks
        const { data: accessData, error: accessError } = await supabase
          .from('user_access')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (accessError || !accessData) {
          // Create trial access if none exists
          const { error: trialError } = await supabase
            .from('user_access')
            .insert({
              user_id: user.id,
              access_type: 'trial',
              start_date: new Date().toISOString(),
              status: 'active'
            });

          if (trialError) {
            console.error('Error creating trial access:', trialError);
          }
        } else if (accessData.accessType === 'expired') {
          router.push('/pricing');
          return;
        }

        // Fetch counts
        const [promptsResponse, contentResponse] = await Promise.all([
          supabase
            .from('user_prompts')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id),
          supabase
            .from('content_boards')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
        ]);

        setPromptCount(promptsResponse.count || 0);
        setContentCount(contentResponse.count || 0);
      } catch (error) {
        console.error('Error initializing dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [router.isReady, subscription_id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-12 px-4">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>YouZit - Painel de Controle</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-semibold mb-8">Painel de Controle</h1>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Prompts Card */}
            <div
              onClick={() => router.push("/prompt-list")}
              className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Prompts</h2>
                <span className="text-2xl font-bold text-blue-600">
                  {promptCount}
                </span>
              </div>
              <p className="text-gray-600 mb-6">
                Gerencie seus prompts de IA e gere novo conteúdo para múltiplas
                plataformas.
              </p>
              <div className="flex items-center text-blue-600">
                <span className="font-medium">Ver Prompts</span>
                <svg
                  className="w-5 h-5 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>

            {/* Content Board Card */}
            <div
              onClick={() => router.push("/content-board")}
              className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Quadro de Conteúdo</h2>
                <span className="text-2xl font-bold text-blue-600">
                  {contentCount}
                </span>
              </div>
              <p className="text-gray-600 mb-6">
                Organize e acompanhe seu conteúdo gerado em diferentes
                estágios.
              </p>
              <div className="flex items-center text-blue-600">
                <span className="font-medium">Ver Quadro de Conteúdo</span>
                <svg
                  className="w-5 h-5 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => router.push("/prompt")}
              className="inline-flex items-center px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Criar Novo Conteúdo
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
