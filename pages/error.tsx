import Head from "next/head";
import Link from "next/link";

export default function ErrorPage() {
  return (
    <>
      <Head>
        <title>YouZit - Erro</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center space-y-8">
          {/* Error Icon */}
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
              Failed to update subscription status
            </p>
          </div>

          <Link
            href="/help"
            className="inline-block bg-[#0066FF] text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition"
          >
            Contatar Suporte
          </Link>
        </div>
      </div>
    </>
  );
} 