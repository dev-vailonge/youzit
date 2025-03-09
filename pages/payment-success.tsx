import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function PaymentSuccess() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Don't do anything until router is ready
    if (!router.isReady) return;

    async function verifySession() {
      const session_id = router.query.session_id;
      
      if (!session_id) {
        setStatus('error');
        setErrorMessage('No session ID provided. Please try again or contact support.');
        return;
      }

      try {
        const response = await fetch('/api/verify-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session_id }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to verify payment');
        }

        // Update onboarding status
        const { error: updateError } = await supabase
          .from('users')
          .update({ onboarding_completed: true })
          .eq('id', data.userId);

        if (updateError) {
          console.error('Error updating onboarding status:', updateError);
          throw new Error('Failed to complete onboarding. Please contact support.');
        }

        setStatus('success');
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 5000);
      } catch (error: any) {
        console.error('Error verifying payment:', error);
        setStatus('error');
        setErrorMessage(error.message);
      }
    }

    verifySession();
  }, [router.isReady, router]);

  return (
    <>
      <Head>
        <title>YouZit - {status === 'success' ? 'Bem-vindo!' : 'Verificando...'}</title>
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
          <div className="max-w-md w-full text-center space-y-8">
            {status === 'loading' && (
              <>
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0066FF] mx-auto"></div>
                <h2 className="text-3xl font-bold text-gray-900">
                  Verificando sua assinatura...
                </h2>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="rounded-full w-16 h-16 bg-green-100 flex items-center justify-center mx-auto">
                  <svg
                    className="w-8 h-8 text-green-500"
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
                </div>

                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Bem-vindo ao YouZit!
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Sua conta foi criada com sucesso. Você será redirecionado para o dashboard em alguns segundos...
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Enviamos um email de confirmação para seu endereço de email.
                  </p>
                  <p className="text-sm text-gray-500">
                    Se você não for redirecionado automaticamente,{' '}
                    <Link href="/dashboard" className="text-[#0066FF] hover:text-blue-600">
                      clique aqui
                    </Link>
                  </p>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="rounded-full w-16 h-16 bg-red-100 flex items-center justify-center mx-auto">
                  <svg
                    className="w-8 h-8 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>

                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Erro ao verificar assinatura
                  </h2>
                  <p className="text-red-600 mb-8">
                    {errorMessage}
                  </p>
                </div>

                <Link
                  href="/help"
                  className="inline-block bg-[#0066FF] text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition"
                >
                  Contatar Suporte
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 