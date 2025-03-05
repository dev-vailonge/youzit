import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignUpSuccess() {
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");

  const handleResendConfirmation = async () => {
    try {
      setResending(true);
      setMessage("");
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: sessionStorage.getItem('signupEmail') || '',
      });

      if (error) throw error;

      setMessage("Email de confirmação reenviado com sucesso!");
    } catch (error: any) {
      console.error("Error:", error);
      setMessage("Erro ao reenviar email. Por favor, tente novamente.");
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Head>
        <title>YouZit - Cadastro Realizado</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center space-y-8">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-green-600"
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
          </div>

          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              Cadastro realizado com sucesso!
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Enviamos um email de confirmação para você.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-gray-600">
              Por favor, verifique sua caixa de entrada e clique no link de confirmação
              para ativar sua conta.
            </p>
            <p className="text-gray-600 text-sm">
              Não recebeu o email?{" "}
              <button 
                onClick={handleResendConfirmation}
                disabled={resending}
                className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? "Reenviando..." : "Reenviar email de confirmação"}
              </button>
            </p>
            {message && (
              <p className={`text-sm ${message.includes("sucesso") ? "text-green-600" : "text-red-600"}`}>
                {message}
              </p>
            )}
          </div>

          <div className="pt-6">
            <Link
              href="/signin"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-[#0066FF] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Ir para o login
            </Link>
          </div>

          <div className="text-sm text-gray-500">
            <p>
              Precisa de ajuda?{" "}
              <Link href="/help" className="text-blue-600 hover:text-blue-700">
                Entre em contato
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
} 