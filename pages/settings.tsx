import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function Settings() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<{
    plan: "free" | "pro" | "enterprise";
    status: "active" | "canceled" | "past_due";
    currentPeriodEnd?: string;
  }>({ plan: "free", status: "active" });
  const router = useRouter();

  // Get user data and subscription on mount
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/signin");
        return;
      }
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
          status: sub.status,
          currentPeriodEnd: sub.current_period_end,
        });
      }
    };
    getUser();
  }, [router]);

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== user?.email) {
      toast.error("Por favor, digite seu email corretamente para confirmar a exclusão");
      return;
    }

    try {
      setIsDeleting(true);

      // Hide all user's content from content_board
      const { error: boardError } = await supabase
        .from("content_board")
        .update({ hidden: true })
        .eq("user_id", user.id);

      if (boardError) throw boardError;

      // Hide all user's prompts
      const { error: promptsError } = await supabase
        .from("prompts")
        .update({ hidden: true })
        .eq("user_id", user.id);

      if (promptsError) throw promptsError;

      // Add to pending deletions
      const { error: pendingError } = await supabase
        .from("pending_deletions")
        .insert({
          user_id: user.id,
          email: user.email,
        });

      if (pendingError) throw pendingError;

      // Sign out the user
      await supabase.auth.signOut();

      router.push("/");
      toast.success(
        "Sua conta foi programada para exclusão. Você tem 30 dias para reativá-la fazendo login."
      );
    } catch (error) {
      console.error("Error deactivating account:", error);
      toast.error("Failed to deactivate account. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Add subscription management functions
  const handleUpgrade = () => {
    router.push("/pricing"); // Create this page for subscription upgrades
  };

  return (
    <>
      <Head>
        <title>YouZit - Configurações</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-semibold mb-8">Configurações da Conta</h1>

          {/* Account Information */}
          <section className="bg-white rounded-xl p-6 shadow-sm mb-8">
            <h2 className="text-xl font-medium mb-4">Informações da Conta</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1 text-gray-900">{user?.email}</div>
              </div>
            </div>
          </section>

          {/* Subscription Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm mb-8">
            <h2 className="text-xl font-medium mb-4">Assinatura</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Plano Atual
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm text-gray-500 capitalize">
                      {subscription.plan === "free" ? "Gratuito" : 
                       subscription.plan === "pro" ? "Pro" : 
                       "Empresarial"}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        subscription.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {subscription.status === "active" ? "Ativo" :
                       subscription.status === "canceled" ? "Cancelado" :
                       "Pagamento Pendente"}
                    </span>
                  </div>
                  {subscription.currentPeriodEnd && (
                    <p className="mt-1 text-sm text-gray-500">
                      Próxima cobrança:{" "}
                      {new Date(
                        subscription.currentPeriodEnd
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {subscription.plan !== "enterprise" && (
                  <button
                    onClick={handleUpgrade}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Atualizar Plano
                  </button>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Recursos do Plano
                </h4>
                <ul className="space-y-2">
                  {subscription.plan === "free" ? (
                    <>
                      <li className="text-sm text-gray-500 flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Até 5 conteúdos por mês
                      </li>
                      <li className="text-sm text-gray-500 flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Análise básica de conteúdo
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="text-sm text-gray-500 flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Conteúdos ilimitados
                      </li>
                      <li className="text-sm text-gray-500 flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Análise avançada de conteúdo
                      </li>
                      <li className="text-sm text-gray-500 flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Suporte prioritário
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="border-2 border-red-200 rounded-xl">
            <div className="bg-red-50 px-6 py-4 rounded-t-xl border-b-2 border-red-200">
              <h2 className="text-xl font-medium text-red-700">Zona de Perigo</h2>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-medium mb-2">Excluir Conta</h3>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                  <h4 className="font-medium text-gray-900 mb-2">
                    O que acontece quando você exclui sua conta:
                  </h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Seu conteúdo será ocultado imediatamente</li>
                    <li>
                      Sua conta será programada para exclusão permanente em
                      30 dias
                    </li>
                    <li>
                      Você pode cancelar a exclusão fazendo login novamente durante este
                      período
                    </li>
                    <li>
                      Após 30 dias, todos os seus dados serão permanentemente excluídos
                    </li>
                  </ul>
                </div>

                {/* Danger Zone - Email confirmation input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900">
                    Confirmar exclusão
                  </label>
                  <p className="text-sm text-gray-500">
                    Por favor, digite seu email para confirmar a exclusão
                  </p>
                  <div className="mt-1 relative">
                    <input
                      type="email"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      className="block w-full rounded-md border-gray-300 pr-10 text-sm shadow-sm 
                        focus:border-red-500 focus:ring-red-500
                        disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200
                        h-11 px-3"
                      placeholder="seu@email.com"
                    />
                    {deleteConfirmation && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        {deleteConfirmation === user?.email ? (
                          <svg
                            className="h-5 w-5 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-5 w-5 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || deleteConfirmation !== user?.email}
                  className="inline-flex justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? "Processando..." : "Excluir Conta"}
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
