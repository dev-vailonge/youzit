import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Head from "next/head";
import { useRouter } from "next/router";
import Header from "@/components/Header";
import { AuthError, Session, User } from '@supabase/supabase-js';
import { PostgrestSingleResponse } from '@supabase/supabase-js';

interface UserAccess {
  id: string;
  user_id: string;
  access_type: 'trial' | 'expired' | 'active';
  start_date: string;
}

interface CountResponse {
  count: number | null;
  error: AuthError | null;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [promptCount, setPromptCount] = useState(0);
  const [contentCount, setContentCount] = useState(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    const initializeDashboard = async () => {
      // Prevent duplicate initialization
      if (initializedRef.current) {
        setLoading(false);
        return;
      }

      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          router.push('/signin');
          return;
        }

        // Check and update access first
        const { data: accessData, error: accessError } = await supabase
          .from('user_access')
          .select('*')
          .eq('user_id', user.id)
          .order('start_date', { ascending: false })
          .limit(1)
          .single();

        if (accessError && accessError.code !== 'PGRST116') {
          console.error('Error fetching access:', accessError);
          return;
        }

        const now = new Date();

        if (!accessData) {
          // Create trial access since no previous access exists
          const { error: insertError } = await supabase
            .from('user_access')
            .upsert([{
              user_id: user.id,
              access_type: 'trial',
              start_date: now.toISOString()
            }]);

          if (insertError) {
            console.error('Error creating trial access:', insertError);
            return;
          }
        } else {
          const typedAccessData = accessData as UserAccess;
          
          // Check if trial has expired (more than 3 days)
          if (typedAccessData.access_type === 'trial') {
            const startDate = new Date(typedAccessData.start_date);
            const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff > 3) {
              const { error: updateError } = await supabase
                .from('user_access')
                .update({ access_type: 'expired' })
                .eq('id', typedAccessData.id);

              if (updateError) {
                console.error('Error updating access:', updateError);
              }
              router.push('/pricing');
              return;
            }
          }

          // If access is expired, redirect to pricing
          if (typedAccessData.access_type === 'expired') {
            router.push('/pricing');
            return;
          }
        }

        // Fetch counts in parallel only if access is valid
        const [promptResult, contentResult] = await Promise.all([
          supabase
            .from("user_prompts")
            .select("prompt_text", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("hidden", false),
          supabase
            .from("content_board")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("hidden", false)
        ]);

        if (promptResult.error) throw promptResult.error;
        if (contentResult.error) throw contentResult.error;

        setPromptCount(promptResult.count || 0);
        setContentCount(contentResult.count || 0);
        
        // Mark as initialized
        initializedRef.current = true;
      } catch (error: unknown) {
        console.error('Error initializing dashboard:', error);
        router.push('/signin');
      } finally {
        setLoading(false);
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        if (event === 'SIGNED_OUT') {
          initializedRef.current = false;
        }
      }
    );

    initializeDashboard();

    // Cleanup function
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

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
