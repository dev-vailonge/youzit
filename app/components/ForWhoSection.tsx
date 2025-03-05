import React from 'react';

const ForWhoSection = () => {
  const profiles = [
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
  ];

  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">
          Para quem é a Youzit?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {profiles.map((profile, index) => (
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

        <div className="text-center mt-16">
          <button className="bg-[#0066FF] text-white px-8 py-4 rounded-lg font-medium hover:bg-blue-600 transition-colors duration-300 shadow-lg hover:shadow-xl">
            Comece a estruturar seu conteúdo com a Youzit!
          </button>
        </div>
      </div>
    </section>
  );
};

export default ForWhoSection; 