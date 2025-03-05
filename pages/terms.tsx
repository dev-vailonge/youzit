import Head from "next/head";
import Link from "next/link";

export default function Terms() {
  return (
    <>
      <Head>
        <title>YouZit - Termos de Serviço</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="font-['Inter'] bg-white min-h-screen">
        {/* Navbar */}
        <nav className="border-b">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="text-xl font-semibold">
                YouZit
              </Link>
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-8">Termos de Serviço</h1>

          <div className="prose prose-lg">
            <h2 className="text-xl font-semibold mt-8 mb-4">
              1. Aceitação dos Termos
            </h2>
            <p className="mb-4">
              Ao acessar e usar o YouZit, você concorda em cumprir e estar
              vinculado aos seguintes termos e condições.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              2. Descrição do Serviço
            </h2>
            <p className="mb-4">
              O YouZit é uma plataforma de gerenciamento de conteúdo que utiliza
              inteligência artificial para ajudar na criação e distribuição de
              conteúdo.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              3. Conta do Usuário
            </h2>
            <p className="mb-4">
              Para usar o YouZit, você precisa criar uma conta. Você é
              responsável por manter a confidencialidade de suas credenciais de
              login.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              4. Uso Aceitável
            </h2>
            <p className="mb-4">
              Você concorda em usar o YouZit apenas para fins legais e de acordo
              com estes termos.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              5. Propriedade Intelectual
            </h2>
            <p className="mb-4">
              Todo o conteúdo e materiais disponíveis no YouZit são propriedade
              da empresa ou de seus licenciadores.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              6. Limitação de Responsabilidade
            </h2>
            <p className="mb-4">
              O YouZit não será responsável por quaisquer danos diretos,
              indiretos, incidentais ou consequenciais.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              7. Modificações dos Termos
            </h2>
            <p className="mb-4">
              Reservamos o direito de modificar estes termos a qualquer momento.
              As alterações entram em vigor imediatamente após sua publicação.
            </p>
          </div>

          <div className="mt-12 pt-8 border-t">
            <p className="text-gray-600">Última atualização: Janeiro 2024</p>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-50 py-12 px-4 mt-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-2">YouZit</h3>
                <p className="text-gray-600 mb-4">
                  Seu assistente de ecossistema de conteúdo com IA
                </p>
                <p className="text-gray-500 text-sm">
                  Copyright © 2025 - Todos os direitos reservados
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
