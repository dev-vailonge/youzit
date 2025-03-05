import Head from "next/head";
import Header from "@/components/Header";

export default function Tips() {
  return (
    <>
      <Head>
        <title>YouZit - Dicas para Criação de Conteúdo</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-semibold mb-8">Dicas para Criação de Conteúdo</h1>

          <div className="space-y-8">
            {/* Writing Prompts Section */}
            <section className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-2xl font-medium mb-4">
                Criando Prompts Efetivos
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-[#0066FF] mb-2">
                    Seja Específico
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="w-5 h-5 text-green-500"
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
                        <span className="font-medium text-green-700">Faça</span>
                      </div>
                      <p className="text-gray-600">
                        "Crie conteúdo envolvente sobre IA para iniciantes em tecnologia,
                        focando em aplicações práticas e exemplos do mundo real na área da saúde"
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="w-5 h-5 text-red-500"
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
                        <span className="font-medium text-red-700">Não Faça</span>
                      </div>
                      <p className="text-gray-600">"Escreva sobre IA"</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[#0066FF] mb-2">
                    Defina o Objetivo
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="w-5 h-5 text-green-500"
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
                        <span className="font-medium text-green-700">Faça</span>
                      </div>
                      <p className="text-gray-600">
                        "Gere um tutorial passo a passo que ajude os espectadores
                        a entenderem machine learning através de analogias simples do mundo real"
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="w-5 h-5 text-red-500"
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
                        <span className="font-medium text-red-700">Não Faça</span>
                      </div>
                      <p className="text-gray-600">
                        "Faça um vídeo sobre machine learning"
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[#0066FF] mb-2">
                    Forneça Contexto
                  </h3>
                  <p className="text-gray-600">
                    Inclua informações relevantes de fundo e requisitos específicos.
                    Exemplo: "Crie conteúdo para um público do Instagram familiarizado com tecnologia
                    e interessado em cultura de startups."
                  </p>
                </div>
              </div>
            </section>

            {/* Refinement Tips Section */}
            <section className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-2xl font-medium mb-4">
                Refinando Seu Conteúdo
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-[#0066FF] mb-2">
                    Foque em Um Aspecto
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="w-5 h-5 text-green-500"
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
                        <span className="font-medium text-green-700">Faça</span>
                      </div>
                      <p className="text-gray-600">
                        "Torne a introdução mais envolvente adicionando uma
                        estatística surpreendente sobre a adoção de IA na área da saúde"
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="w-5 h-5 text-red-500"
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
                        <span className="font-medium text-red-700">Não Faça</span>
                      </div>
                      <p className="text-gray-600">"Melhore tudo"</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[#0066FF] mb-2">
                    Use a Análise
                  </h3>
                  <p className="text-gray-600">
                    Analise as pontuações da análise de conteúdo e foque em melhorar
                    primeiro as áreas com pontuação mais baixa.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[#0066FF] mb-2">
                    Melhoria Iterativa
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="w-5 h-5 text-green-500"
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
                        <span className="font-medium text-green-700">Faça</span>
                      </div>
                      <p className="text-gray-600">
                        "Primeiro, vamos melhorar o gancho. Depois, podemos trabalhar
                        em tornar os exemplos mais relacionáveis."
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="w-5 h-5 text-red-500"
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
                        <span className="font-medium text-red-700">Não Faça</span>
                      </div>
                      <p className="text-gray-600">
                        "Reescreva tudo e faça perfeito de uma vez"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Platform-Specific Tips */}
            <section className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-2xl font-medium mb-4">
                Melhores Práticas por Plataforma
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-[#0066FF] mb-2">
                    YouTube
                  </h3>
                  <p className="text-gray-600">
                    Foque em ganchos fortes, estrutura clara e exemplos envolventes.
                    Inclua timestamps e chamadas para ação claras.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[#0066FF] mb-2">
                    Instagram
                  </h3>
                  <p className="text-gray-600">
                    Mantenha o conteúdo visual, use emojis estrategicamente e divida
                    o texto em partes facilmente escaneáveis.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[#0066FF] mb-2">
                    LinkedIn
                  </h3>
                  <p className="text-gray-600">
                    Mantenha um tom profissional, inclua insights da indústria e
                    foque em conteúdo que agregue valor.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
