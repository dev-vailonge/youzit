import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

export default function SignIn() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showGoogleSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(true);
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error checking session:", error);
          return;
        }

        if (session) {
          await supabase.auth.signOut();
          sessionStorage.clear();
          localStorage.clear();
        }
      } catch {
        // Silent fail - auth error
      }
    };

    checkUser();
  }, []);

  useEffect(() => {
    checkWaitingListFlag();
  }, []);

  const checkWaitingListFlag = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('name', 'waiting_list')
        .single();

      if (error) throw error;
      setShowSignUp(!data?.enabled);
    } catch {
      // Silent fail - feature flag check error
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setMessage('Por favor, verifique seu email para confirmar sua conta antes de fazer login.');
          return;
        }
        
        // Handle different error cases with friendly messages
        switch (error.message) {
          case 'Invalid login credentials':
            setMessage('Email ou senha incorretos. Por favor, verifique suas credenciais.');
            break;
          case 'Invalid email':
            setMessage('Por favor, insira um email válido.');
            break;
          case 'Password should be at least 6 characters':
            setMessage('A senha deve ter pelo menos 6 caracteres.');
            break;
          case 'Rate limit exceeded':
            setMessage('Muitas tentativas de login. Por favor, aguarde alguns minutos e tente novamente.');
            break;
          default:
            setMessage('Ocorreu um erro ao fazer login. Por favor, tente novamente.');
        }
        return;
      }

      router.push("/dashboard");
    } catch (error) {
      setMessage('Ocorreu um erro ao fazer login. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });
      if (error) throw error;
    } catch {
      // Silent fail - OAuth error
    }
  };

  return (
    <>
      <Head>
        <title>YouZit - Login</title>
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
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                Bem-vindo de volta
              </h2>
            </div>

            {/* Google Sign In Button */}
            {showGoogleSignIn && (
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-[#0F1116] text-white py-2 px-4 rounded-lg hover:bg-gray-900 transition"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12.24 24.0008C15.4764 24.0008 18.2058 22.9382 20.1944 21.1039L16.3274 18.1055C15.2516 18.8375 13.8626 19.252 12.24 19.252C9.0792 19.252 6.4034 17.1399 5.4396 14.3003H1.4414V17.3912C3.4204 21.4434 7.5176 24.0008 12.24 24.0008Z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.4395 14.3003C5.2135 13.5681 5.0869 12.7862 5.0869 12.0008C5.0869 11.2154 5.2135 10.4335 5.4395 9.70132V6.61035H1.4414C0.7365 8.25835 0.3438 10.0913 0.3438 12.0008C0.3438 13.9103 0.7365 15.7433 1.4414 17.3912L5.4395 14.3003Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12.24 4.74966C14.0217 4.74966 15.6075 5.36715 16.8577 6.54982L20.2695 3.12877C18.2013 1.19209 15.4718 0.000854492 12.24 0.000854492C7.5176 0.000854492 3.4204 2.55825 1.4414 6.61033L5.4395 9.7013C6.4034 6.86172 9.0792 4.74966 12.24 4.74966Z"
                    fill="#EA4335"
                  />
                </svg>
                Entrar com Google
              </button>
            )}

            {showGoogleSignIn && (
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gray-50 text-gray-500">ou</span>
                </div>
              </div>
            )}

            <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm text-gray-700 mb-2"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Seu endereço de email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm text-gray-700 mb-2"
                  >
                    Sua Senha
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Sua senha"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#0066FF] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </div>

              {message && (
                <div className="text-sm text-center text-red-600 bg-red-50 p-3 rounded-lg">
                  {message}
                  {message.includes('verifique seu email') && (
                    <div className="mt-2">
                      <Link
                        href="/magic-link"
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        Reenviar email de verificação
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </form>

            <div className="space-y-2 text-center text-sm">
              <p>
                <Link
                  href="/magic-link"
                  className="text-blue-600 hover:text-blue-700"
                >
                  Enviar um link mágico por email
                </Link>
              </p>
              <p>
                <Link
                  href="/forgot-password"
                  className="text-blue-600 hover:text-blue-700"
                >
                  Esqueceu sua senha?
                </Link>
              </p>
              {showSignUp && (
                <p>
                  Não tem uma conta?{" "}
                  <Link
                    href="/signup"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Cadastre-se
                  </Link>
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-sm text-gray-600">
                Ao continuar, você concorda com os{" "}
                <Link href="/terms" className="text-blue-600 hover:text-blue-700">
                  Termos de Serviço
                </Link>{" "}
                e{" "}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
                  Política de Privacidade
                </Link>
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Problemas para fazer login?{" "}
                <Link href="/help" className="text-blue-600 hover:text-blue-700">
                  Clique Aqui
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
