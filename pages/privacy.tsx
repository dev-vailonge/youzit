import Head from "next/head";
import Link from "next/link";

export default function Privacy() {
  return (
    <>
      <Head>
        <title>YouZit - Política de Privacidade</title>
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
          <h1 className="text-3xl font-bold mb-8">Política de Privacidade</h1>

          <div className="prose prose-lg">
            <h2 className="text-xl font-semibold mt-8 mb-4">
              1. Informações que Coletamos
            </h2>
            <p className="mb-4">
              Coletamos informações que você nos fornece diretamente, incluindo
              seu nome, endereço de e-mail e dados de uso da plataforma.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              2. Como Usamos suas Informações
            </h2>
            <p className="mb-4">
              Utilizamos suas informações para fornecer e melhorar nossos
              serviços, personalizar sua experiência e enviar atualizações
              importantes sobre o YouZit.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              3. Compartilhamento de Dados
            </h2>
            <p className="mb-4">
              Não vendemos suas informações pessoais. Compartilhamos dados
              apenas com prestadores de serviços que nos ajudam a operar a
              plataforma.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              4. Segurança dos Dados
            </h2>
            <p className="mb-4">
              Implementamos medidas de segurança técnicas e organizacionais para
              proteger suas informações contra acesso não autorizado.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              5. Seus Direitos
            </h2>
            <p className="mb-4">
              Você tem o direito de acessar, corrigir ou excluir suas
              informações pessoais. Entre em contato conosco para exercer esses
              direitos.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              6. Cookies e Tecnologias Similares
            </h2>
            <p className="mb-4">
              Usamos cookies e tecnologias similares para melhorar a experiência
              do usuário e coletar dados de uso da plataforma.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              7. Alterações na Política
            </h2>
            <p className="mb-4">
              Podemos atualizar esta política periodicamente. Notificaremos você
              sobre alterações significativas através de nosso site ou por
              e-mail.
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
