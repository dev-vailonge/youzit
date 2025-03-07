import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showWaitingList, setShowWaitingList] = useState(false);
  const [waitingListUsers, setWaitingListUsers] = useState<{ email: string; signed_up_at: string }[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    checkWaitingListFlag();
    fetchWaitingListUsers();
  }, []);

  const fetchWaitingListUsers = async () => {
    try {
      console.log('Fetching waiting list users...');
      const { data, error, count } = await supabase
        .from('waiting_list')
        .select('email, signed_up_at', { count: 'exact' })
        .order('signed_up_at', { ascending: false });

      if (error) throw error;
      
      // Mask emails before setting state
      const maskedData = data?.map(user => ({
        ...user,
        email: user.email.charAt(0) + '*'.repeat(user.email.length - 1)
      })) || [];
      
      console.log('Fetched data:', { maskedData, count });
      setWaitingListUsers(maskedData);
      setUserCount(count || 0);
    } catch (error) {
      console.error('Error fetching waiting list:', error);
    }
  };

  const checkWaitingListFlag = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('name', 'waiting_list')
        .single();

      if (error) throw error;
      setShowWaitingList(data?.enabled ?? false);
    } catch (error) {
      console.error('Error checking feature flag:', error);
      setShowWaitingList(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('waiting_list')
        .insert([{ email, signed_up_at: new Date().toISOString() }]);

      if (error) throw error;

      setMessage('Obrigado! Você está na lista de espera.');
      setEmail('');
      // Fetch updated list after successful submission
      await fetchWaitingListUsers();
    } catch (error: any) {
      console.error('Error:', error);
      setMessage('Erro ao entrar na lista. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = (e.target as HTMLFormElement).email.value;

    try {
      const response = await fetch("/api/saveEmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        alert("Email cadastrado com sucesso!");
        (e.target as HTMLFormElement).reset();
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao cadastrar email");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Erro ao cadastrar email");
    }
  };

  const getInitial = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const getRandomColor = (initial: string) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-teal-500'
    ];
    return colors[initial.charCodeAt(0) % colors.length];
  };

  // Add modal close handler
  const closeModal = () => {
    setSelectedImage(null);
  };

  // Add ESC key handler for modal
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  if (!showWaitingList) {
    return null;
  }

  return (
    <>
      <Head>
        <title>YouZit - Seu Assistente de Ecossistema de Conteúdo com IA</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div 
            className="relative max-w-4xl w-full h-auto"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-xl"
            >
              ✕
            </button>
            <Image
              src={selectedImage}
              alt="Full size image"
              width={1200}
              height={800}
              className="rounded-lg"
              objectFit="contain"
            />
          </div>
        </div>
      )}

      <div className="font-['Inter'] bg-white min-h-screen">
        {/* Navbar */}
        <nav className="border-b">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="text-xl font-semibold">
                YouZit
              </Link>

              {/* Desktop Menu */}
              <div className="flex items-center space-x-8">
                <Link href="#features" className="text-gray-600">
                  Recursos
                </Link>
                {!showWaitingList && (
                  <Link href="#pricing" className="text-gray-600">
                    Preços
                  </Link>
                )}
                {!showWaitingList && (
                  <Link
                    href="/signup"
                    className="bg-[#0066FF] text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    Criar Conta
                  </Link>
                )}
                <Link
                  href="/signin"
                  className="text-[#0066FF] hover:text-blue-700"
                >
                  Entrar
                </Link>
              </div>
            </div>
          </div>
        </nav>

         {/* Script Creation Section */}
         <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-5xl font-bold mb-6">
                Criar roteiros de conteúdos nunca foi tão{' '}
                <span className="text-[#0066FF]">fácil</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Pare de gastar horas planejando conteúdos e deixe a IA fazer isso por você.
              </p>
            </div>
            <div className="relative bg-gray-100 rounded-3xl p-8">
              <div className="bg-black rounded-2xl overflow-hidden relative min-h-[400px]">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                >
                  <source src="/video/script-creation.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                <div className="bg-white text-indigo-600 px-6 py-2 rounded-full shadow-lg font-medium">
                  Powered by AI
                </div>
              </div>
            </div>
          </div>
        </section>

             {/* Pain Points Section */}
             <section className="bg-gray-50 text-gray-900 py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-16">
              A YouZit é para você se quer resolver algum desses problemas:
            </h2>

            <div className="grid md:grid-cols-3 gap-12">
              {/* Pain Point 1 */}
              <div className="text-center">
                <div className="text-4xl mb-4">⏰</div>
                <h3 className="text-xl font-semibold mb-3">
                  Horas planejando conteúdo
                </h3>
                <p className="text-gray-600">
                  Perde tempo alternando entre múltiplas plataformas e
                  ferramentas
                </p>
              </div>

              {/* Pain Point 2 */}
              <div className="text-center">
                <div className="text-4xl mb-4">😩</div>
                <h3 className="text-xl font-semibold mb-3">
                  Dificuldade com consistência
                </h3>
                <p className="text-gray-600">
                  Difícil manter um cronograma regular de postagens
                </p>
              </div>

              {/* Pain Point 3 */}
              <div className="text-center">
                <div className="text-4xl mb-4">😔</div>
                <h3 className="text-xl font-semibold mb-3">
                  Baixas taxas de engajamento
                </h3>
                <p className="text-gray-600">
                  Conteúdo não alcança ou ressoa com a audiência
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="pt-32 pb-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-16">
              Como a <span className="text-[#0066FF]">YouZit funciona?</span>
            </h1>

            <div className="grid md:grid-cols-3 gap-16 mt-20">
              {/* Step 1 */}
              <div>
                <div 
                  className="bg-gray-100 rounded-3xl p-8 mb-8 aspect-[4/3] relative overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                  onClick={() => setSelectedImage("/img/prompt.png")}
                >
                  <Image
                    src="/img/prompt.png"
                    alt="Faça upload do seu conteúdo"
                    layout="fill"
                    objectFit="contain"
                    className="rounded-2xl"
                  />
                </div>
                <h3 className="text-2xl font-bold mb-4">Comece com uma ideia</h3>
                <p className="text-gray-600 text-lg">
                  Simplesmente compartilhe uma ideia e deixe a IA criar um script detalhado para você.
                </p>
              </div>

              {/* Step 2 */}
              <div>
                <div 
                  className="bg-gray-100 rounded-3xl p-8 mb-8 aspect-[4/3] relative overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                  onClick={() => setSelectedImage("/img/platform.png")}
                >
                  <Image
                    src="/img/platform.png"
                    alt="IA trabalhando"
                    layout="fill"
                    objectFit="contain"
                    className="rounded-2xl"
                  />
                </div>
                <h3 className="text-2xl font-bold mb-4">Selecione a plataforma</h3>
                <p className="text-gray-600 text-lg">
                  Escolha a plataforma onde você quer compartilhar seu conteúdo, e a IA vai criar uma versão otimizada para ela.
                </p>
              </div>

              {/* Step 3 */}
              <div>
                <div 
                  className="bg-gray-100 rounded-3xl p-8 mb-8 aspect-[4/3] relative overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                  onClick={() => setSelectedImage("/img/content.png")}
                >
                  <Image
                    src="/img/content.png"
                    alt="Compartilhe conteúdo"
                    layout="fill"
                    objectFit="contain"
                    className="rounded-2xl"
                  />
                </div>
                <h3 className="text-2xl font-bold mb-4">Aproveite o conteúdo</h3>
                <p className="text-gray-600 text-lg">
                  Aproveite o script gerado pela IA e comece a criar seu conteúdo com muito mais facilidade.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Para quem é Section */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">
              Para quem é a Youzit?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: '📌',
                  title: 'Criadores de conteúdo solo',
                  problem: 'Você tem muitas ideias, mas se perde na hora de organizar e transformar isso em posts, vídeos e newsletters.',
                  solution: 'Com a Youzit, você estrutura sua produção e gera conteúdos alinhados ao seu ecossistema automaticamente.'
                },
                {
                  icon: '🚀',
                  title: 'Empreendedores digitais',
                  problem: 'Criar conteúdo para atrair clientes e vender produtos toma tempo e nem sempre traz resultados.',
                  solution: 'A Youzit te ajuda a planejar e distribuir conteúdos estrategicamente, focando no crescimento do seu negócio.'
                },
                {
                  icon: '🎓',
                  title: 'Educadores e mentores',
                  problem: 'Você compartilha conhecimento, mas tem dificuldade em transformar isso em formatos diversos para escalar seu alcance.',
                  solution: 'A Youzit gera múltiplas versões do seu conteúdo para diferentes plataformas, maximizando seu impacto.'
                },
                {
                  icon: '🏢',
                  title: 'Equipes de marketing e social media',
                  problem: 'Gerenciar a produção de conteúdo para várias plataformas e clientes é trabalhoso e desorganizado.',
                  solution: 'Com a Youzit, sua equipe centraliza tudo em um só lugar e automatiza a criação de materiais.'
                }
              ].map((profile, index) => (
                <div 
                  key={index}
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="text-4xl mb-4">{profile.icon}</div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">
                    {profile.title}
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-2">
                      <span className="text-red-500 flex-shrink-0">❌</span>
                      <p className="text-gray-600 text-sm">
                        {profile.problem}
                      </p>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 flex-shrink-0">✅</span>
                      <p className="text-gray-600 text-sm">
                        {profile.solution}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!showWaitingList && (
              <div className="text-center mt-16">
                <button className="bg-[#0066FF] text-white px-8 py-4 rounded-lg font-medium hover:bg-blue-600 transition-colors duration-300 shadow-lg hover:shadow-xl">
                  Comece a estruturar seu conteúdo com a Youzit!
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-16">
              Recursos Principais
            </h2>
            <div className="grid md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#0066FF]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-8 h-8 text-[#0066FF]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-4">
                  Geração de Conteúdo
                </h3>
                <p className="text-gray-600">
                  Crie conteúdo otimizado para diferentes plataformas com ajuda
                  da IA.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-[#0066FF]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-8 h-8 text-[#0066FF]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-4">
                  Kanban Board
                </h3>
                <p className="text-gray-600">
                  Gerencie todo seu conteúdo em um único lugar com um quadro Kanban intuitivo.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-[#0066FF]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-8 h-8 text-[#0066FF]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div className="relative inline-block">
                  <h3 className="text-xl font-semibold mb-4">
                    Gerador de Conteúdo
                    <span className="absolute -right-16 -top-1 bg-[#0066FF]/10 text-[#0066FF] text-xs px-2 py-1 rounded-full">
                      Em breve
                    </span>
                  </h3>
                </div>
                <p className="text-gray-600">
                  Gere vídeos, vozes e imagens otimizadas para cada plataforma com IA.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-[#0066FF]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-8 h-8 text-[#0066FF]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="relative inline-block">
                  <h3 className="text-xl font-semibold mb-4">
                    Análise de Performance
                    <span className="absolute -right-16 -top-1 bg-indigo-100 text-indigo-600 text-xs px-2 py-1 rounded-full">
                      Soon
                    </span>
                  </h3>
                </div>
                <p className="text-gray-600">
                  Acompanhe o desempenho do seu conteúdo em todas as
                  plataformas.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        {!showWaitingList && (
          <section id="pricing" className="py-20">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold text-center mb-16">
                Planos e Preços
              </h2>
              <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {/* Free Plan */}
                <div className="border rounded-xl p-8 flex flex-col">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Grátis</h3>
                    <p className="text-3xl font-bold mb-6">R$0</p>
                    <ul className="space-y-4">
                      <li className="flex items-center">
                        <svg
                          className="w-5 h-5 text-green-500 mr-2"
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
                        5 prompts no total
                      </li>
                      <li className="flex items-center">
                        <svg
                          className="w-5 h-5 text-green-500 mr-2"
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
                        Análise básica
                      </li>
                      <li className="flex items-center">
                        <svg
                          className="w-5 h-5 text-green-500 mr-2"
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
                        IA básica
                      </li>
                    </ul>
                  </div>
                  <div className="mt-auto pt-8">
                    <button className="w-full py-3 border border-[#0066FF] text-[#0066FF] rounded-full hover:bg-[#0066FF]/5 transition">
                      Começar Grátis
                    </button>
                  </div>
                </div>

                {/* Starter Plan */}
                <div className="border rounded-xl p-8 bg-[#0066FF] text-white transform scale-105 flex flex-col relative">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black text-xs px-3 py-1 rounded-full font-medium">
                      MAIS POPULAR
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Starter</h3>
                    <p className="text-3xl font-bold mb-6">
                      R$47
                      <span className="text-lg font-normal opacity-75">/mês</span>
                    </p>
                    <ul className="space-y-4">
                      <li className="flex items-center">
                        <svg
                          className="w-5 h-5 text-white mr-2"
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
                        15 prompts por mês(com possibilidade de adquirir mais prompts)
                      </li>
                      <li className="flex items-center">
                        <svg
                          className="w-5 h-5 text-white mr-2"
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
                        IA intermediária
                      </li>
                      <li className="flex items-center">
                        <svg
                          className="w-5 h-5 text-green-500 mr-2"
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
                        7 dias de teste grátis
                      </li>
                    </ul>
                  </div>
                  <div className="mt-auto pt-8">
                    <button className="w-full py-3 bg-white text-[#0066FF] rounded-full hover:bg-gray-50 transition">
                      Começar Starter
                    </button>
                  </div>
                </div>

                {/* Pro Plan */}
                <div className="border rounded-xl p-8 flex flex-col">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Pro</h3>
                    <p className="text-3xl font-bold mb-6">
                      R$89
                      <span className="text-lg font-normal text-gray-600">/mês</span>
                    </p>
                    <div className="text-sm mb-4 text-gray-600">
                      R$890/ano (2 meses grátis)
                    </div>
                    <ul className="space-y-4">
                      <li className="flex items-center">
                        <svg
                          className="w-5 h-5 text-green-500 mr-2"
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
                        Posts ilimitados
                      </li>
                      <li className="flex items-center">
                        <svg
                          className="w-5 h-5 text-green-500 mr-2"
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
                        IA prioritária
                      </li>
                      <li className="flex items-center">
                        <svg
                          className="w-5 h-5 text-green-500 mr-2"
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
                        Refine prompt
                      </li>
                      <li className="flex items-center">
                        <svg
                          className="w-5 h-5 text-green-500 mr-2"
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
                        7 dias de teste grátis
                      </li>
                    </ul>
                  </div>
                  <div className="mt-auto pt-8">
                    <button className="w-full py-3 border border-[#0066FF] text-[#0066FF] rounded-full hover:bg-[#0066FF]/5 transition">
                      Começar Pro
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Waitlist Section */}
        <section className="bg-[#0066FF] text-white py-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">
              Entre na Lista de Espera
            </h2>
            <p className="text-xl mb-8">
              Seja um dos primeiros a experimentar o futuro da criação de
              conteúdo
            </p>
            <form
              onSubmit={handleSubmit}
              className="max-w-md mx-auto space-y-4"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu email"
                className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-[#0066FF] px-8 py-3 rounded-lg hover:bg-gray-100 transition"
              >
                {loading ? 'Entrando...' : 'Entrar Agora'}
              </button>
            </form>

            {/* Waiting List Display */}
            <div className="mt-12">
              <div className="inline-flex items-center justify-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <div className="flex -space-x-2">
                  {waitingListUsers.slice(0, 3).map((user, index) => (
                    <div
                      key={index}
                      className="w-8 h-8 rounded-full bg-[#0066FF] border-2 border-[#0066FF] flex items-center justify-center relative"
                      title={user.email}
                    >
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                        <span className="text-[#0066FF] font-medium text-xs">
                          {getInitial(user.email)}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                </div>
                <p className="text-white/80 text-sm font-medium">
                  +{userCount - 3} pessoas estão esperando para usar o YouZit...
                </p>
              </div>
            </div>

            {message && (
              <p className={`text-sm ${message.includes('Obrigado') ? 'text-green-200' : 'text-red-200'}`}>
                {message}
              </p>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-100 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-semibold text-xl">YouZit</h3>
                <p className="text-gray-600">
                  Seu assistente de ecossistema de conteúdo com IA
                </p>
                <p className="text-gray-500 text-sm">
                  Copyright © {new Date().getFullYear()} - Todos os direitos reservados
                </p>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">LEGAL</h4>
                <div className="space-y-2">
                  <Link href="/terms" className="block text-gray-600 hover:text-gray-900">
                    Termos de serviço
                  </Link>
                  <Link href="/privacy" className="block text-gray-600 hover:text-gray-900">
                    Política de privacidade
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}