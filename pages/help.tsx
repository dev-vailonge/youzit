import Head from "next/head";
import Link from "next/link";
import Header from "@/components/Header";

export default function Help() {
  return (
    <>
      <Head>
        <title>YouZit - Central de Ajuda</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-semibold mb-8">Central de Ajuda</h1>

          <div className="space-y-8">
            {/* Contact Support Section */}
            <section className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-2xl font-medium mb-4">Contato com Suporte</h2>
              <p className="text-gray-600 mb-4">
                Nossa equipe de suporte está aqui para você.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-[#0066FF]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <a
                    href="mailto:support@youzit.com"
                    className="text-[#0066FF] hover:text-blue-700"
                  >
                    support@youzit.com
                  </a>
                </div>
                <p className="text-sm text-gray-500">
                  Tempo de resposta: Geralmente em até 24 horas
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
