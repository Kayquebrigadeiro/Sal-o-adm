import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const WizardBemVinda = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // O "Cérebro" do Salão: guarda todas as respostas
  const [dados, setDados] = useState({
    // Passo 1: Básico
    diasFuncionamento: 'Terça a Sábado',
    horarioAbertura: '08:00',
    horarioFechamento: '18:00',
    estimativaAtendimentosMes: 100, // Usado para ratear o custo fixo
    
    // Passo 2: Custos Fixos & Taxas
    aluguel: '',
    energia: '',
    agua: '',
    internet: '',
    sistema: '',
    outrosFixos: '',
    taxaMaquininha: 5.0, // %
    
    // Passo 3: Gastos Pessoais (Pró-labore teórico)
    gastosPessoais: [
      { id: 1, descricao: 'Energia (Casa)', valor: '' },
      { id: 2, descricao: 'Mercado', valor: '' },
      { id: 3, descricao: 'Internet/Celular', valor: '' }
    ],

    // Passo 4: Equipe
    equipe: [
      { id: 1, nome: 'Teta (Eu)', cargo: 'PROPRIETARIO', salarioFixo: '', comissao: 100 },
      { id: 2, nome: '', cargo: 'FUNCIONARIO', salarioFixo: '', comissao: 40 }
    ],

    // Passo 5: Carros-Chefes
    servicos: [
      { id: 1, nome: 'Progressiva', preco: '', custoMaterial: '', requerComprimento: true },
      { id: 2, nome: 'Corte', preco: '', custoMaterial: '', requerComprimento: false },
      { id: 3, nome: 'Luzes', preco: '', custoMaterial: '', requerComprimento: true }
    ]
  });

  // Funções auxiliares para atualizar o estado
  const handleChange = (e) => {
    const { name, value } = e.target;
    setDados(prev => ({ ...prev, [name]: value }));
  };

  const calcularCustoFixoTotal = () => {
    return (
      Number(dados.aluguel) + Number(dados.energia) + 
      Number(dados.agua) + Number(dados.internet) + 
      Number(dados.sistema) + Number(dados.outrosFixos)
    );
  };

  const finalizarWizard = async () => {
    setLoading(true);
    
    try {
      // 1. Descobrir quem é a proprietária logada e qual o ID do salão dela
      const { data: { user }, error: erroUser } = await supabase.auth.getUser();
      if (erroUser || !user) throw new Error("Usuário não autenticado.");

      const { data: perfil, error: erroPerfil } = await supabase
        .from('perfis_acesso')
        .select('salao_id')
        .eq('auth_user_id', user.id)
        .single();
        
      if (erroPerfil || !perfil) throw new Error("Perfil não encontrado.");
      const salaoId = perfil.salao_id;

      // 2. A Matemática: Calcula o Custo Fixo por Atendimento
      const custoFixoTotal = calcularCustoFixoTotal();
      const custoPorAtendimento = custoFixoTotal / (Number(dados.estimativaAtendimentosMes) || 1);

      // 3. Salvar a Inteligência Financeira
      const { error: erroConfig } = await supabase
        .from('configuracoes')
        .update({
          custo_fixo_por_atendimento: custoPorAtendimento.toFixed(2),
          taxa_maquininha_pct: Number(dados.taxaMaquininha),
          gastos_pessoais: dados.gastosPessoais
        })
        .eq('salao_id', salaoId);

      if (erroConfig) throw erroConfig;

      // 4. Salvar a Equipe
      const equipeInsert = dados.equipe
        .filter(m => m.nome.trim() !== '')
        .map(m => ({
          salao_id: salaoId,
          nome: m.nome,
          cargo: m.cargo,
          salario_fixo: Number(m.salarioFixo) || 0
        }));
        
      if (equipeInsert.length > 0) {
        const { error: erroEquipe } = await supabase.from('profissionais').insert(equipeInsert);
        if (erroEquipe) throw erroEquipe;
      }

      // 5. Salvar os Serviços (Carros-Chefes)
      const comissaoPadrao = Number(dados.equipe[0]?.comissao) || 40; 
      
      const servicosInsert = dados.servicos
        .filter(s => s.nome.trim() !== '')
        .map(s => ({
          salao_id: salaoId,
          nome: s.nome,
          preco_p: Number(s.preco) || 0,
          custo_variavel: Number(s.custoMaterial) || 0,
          requer_comprimento: s.requerComprimento,
          porcentagem_profissional: comissaoPadrao
        }));

      if (servicosInsert.length > 0) {
        const { error: erroServicos } = await supabase.from('procedimentos').insert(servicosInsert);
        if (erroServicos) throw erroServicos;
      }

      // 6. Virar a chave: Salão Configurado!
      const { error: erroSalao } = await supabase
        .from('saloes')
        .update({ configurado: true })
        .eq('id', salaoId);

      if (erroSalao) throw erroSalao;

      alert("Mágica feita! Seu salão está configurado. 🚀");
      
      window.location.reload(); 

    } catch (err) {
      console.error('[Wizard] Erro:', err);
      alert("Erro ao salvar configurações: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ================= RENDERIZAÇÃO DOS PASSOS =================
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 font-sans text-gray-800">
      
      {/* Container Principal */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Cabeçalho e Barra de Progresso */}
        <div className="bg-slate-900 p-6 text-white text-center">
          <h2 className="text-2xl font-bold">Bem-vinda ao seu novo salão! ✂️</h2>
          <p className="text-slate-300 text-sm mt-2">Vamos configurar seu negócio em 5 passos simples.</p>
          
          <div className="w-full bg-slate-700 rounded-full h-2 mt-6">
            <div className="bg-emerald-400 h-2 rounded-full transition-all duration-500" style={{ width: `${(step / 5) * 100}%` }}></div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Passo {step} de 5</p>
        </div>

        {/* Corpo do Formulário */}
        <div className="p-8">
          
          {/* PASSO 1: BÁSICO */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-xl font-semibold mb-4">1. Estrutura da Agenda</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Horário de Abertura</label>
                <input type="time" name="horarioAbertura" value={dados.horarioAbertura} onChange={handleChange} className="mt-1 w-full p-3 border rounded-lg focus:ring-2 focus:ring-slate-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Horário de Fechamento</label>
                <input type="time" name="horarioFechamento" value={dados.horarioFechamento} onChange={handleChange} className="mt-1 w-full p-3 border rounded-lg focus:ring-2 focus:ring-slate-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantos atendimentos você estima fazer por mês? (Média)</label>
                <input type="number" name="estimativaAtendimentosMes" value={dados.estimativaAtendimentosMes} onChange={handleChange} placeholder="Ex: 100" className="mt-1 w-full p-3 border rounded-lg focus:ring-2 focus:ring-slate-900" />
                <p className="text-xs text-gray-500 mt-1">Isso ajuda a calcular o rateio do seu custo fixo.</p>
              </div>
            </div>
          )}

          {/* PASSO 2: CUSTOS FIXOS */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-xl font-semibold mb-4">2. Suas Despesas Fixas (Mensais)</h3>
              <p className="text-sm text-gray-600 mb-4">O que você paga todo mês só por estar com as portas abertas?</p>
              <div className="grid grid-cols-2 gap-4">
                {['aluguel', 'energia', 'agua', 'internet', 'sistema', 'outrosFixos'].map((item) => (
                  <div key={item}>
                    <label className="block text-sm font-medium text-gray-700 capitalize">{item.replace('outrosFixos', 'Outros')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-500">R$</span>
                      <input type="number" name={item} value={dados[item]} onChange={handleChange} className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-slate-900" placeholder="0.00" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PASSO 3: GASTOS PESSOAIS */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-xl font-semibold mb-2">3. A Vida da Proprietária</h3>
              <p className="text-sm text-gray-600 mb-4">Para não misturar as contas, quanto você (como pessoa física) precisa para viver por mês? (Seu Pró-labore)</p>
              
              {dados.gastosPessoais.map((gasto, index) => (
                <div key={gasto.id} className="flex gap-4">
                  <input type="text" value={gasto.descricao} readOnly className="w-1/2 p-3 border rounded-lg bg-gray-50 text-gray-600" />
                  <div className="relative w-1/2">
                    <span className="absolute left-3 top-3 text-gray-500">R$</span>
                    <input type="number" 
                      value={gasto.valor}
                      onChange={(e) => {
                        const newGastos = [...dados.gastosPessoais];
                        newGastos[index].valor = e.target.value;
                        setDados({...dados, gastosPessoais: newGastos});
                      }}
                      className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-slate-900" placeholder="0.00" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PASSO 4: EQUIPE */}
          {step === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-xl font-semibold mb-2">4. Sua Equipe</h3>
              <p className="text-sm text-gray-600 mb-4">Cadastre as pessoas que trabalham com você e as regras de comissão.</p>
              
              {dados.equipe.map((membro, index) => (
                <div key={membro.id} className="p-4 border rounded-xl bg-gray-50 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Nome</label>
                    <input type="text" value={membro.nome} 
                      onChange={(e) => {
                        const newEquipe = [...dados.equipe];
                        newEquipe[index].nome = e.target.value;
                        setDados({...dados, equipe: newEquipe});
                      }}
                      className="w-full p-2 border rounded-lg" placeholder="Nome do profissional" />
                  </div>
                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="block text-xs font-medium text-gray-700">Comissão Padrão (%)</label>
                      <input type="number" value={membro.comissao} 
                        onChange={(e) => {
                          const newEquipe = [...dados.equipe];
                          newEquipe[index].comissao = e.target.value;
                          setDados({...dados, equipe: newEquipe});
                        }}
                        className="w-full p-2 border rounded-lg" />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-xs font-medium text-gray-700">Salário Fixo (R$)</label>
                      <input type="number" value={membro.salarioFixo} 
                        onChange={(e) => {
                          const newEquipe = [...dados.equipe];
                          newEquipe[index].salarioFixo = e.target.value;
                          setDados({...dados, equipe: newEquipe});
                        }}
                        className="w-full p-2 border rounded-lg" placeholder="0 se não houver" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PASSO 5: SERVIÇOS */}
          {step === 5 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-xl font-semibold mb-2">5. Carros-Chefes (Serviços)</h3>
              <p className="text-sm text-gray-600 mb-4">Para começar a usar a agenda, adicione os seus 3 principais procedimentos.</p>
              
              {dados.servicos.map((servico, index) => (
                <div key={servico.id} className="p-4 border rounded-xl bg-gray-50 flex flex-col gap-3">
                  <input type="text" value={servico.nome} 
                    onChange={(e) => {
                      const newServ = [...dados.servicos];
                      newServ[index].nome = e.target.value;
                      setDados({...dados, servicos: newServ});
                    }}
                    className="w-full p-2 border rounded-lg font-medium" placeholder="Nome do Serviço (ex: Progressiva)" />
                  
                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="block text-xs text-gray-500">Preço Base (R$)</label>
                      <input type="number" value={servico.preco} 
                        onChange={(e) => {
                          const newServ = [...dados.servicos];
                          newServ[index].preco = e.target.value;
                          setDados({...dados, servicos: newServ});
                        }}
                        className="w-full p-2 border rounded-lg" placeholder="0.00" />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-xs text-gray-500">Custo de Material (R$)</label>
                      <input type="number" value={servico.custoMaterial} 
                        onChange={(e) => {
                          const newServ = [...dados.servicos];
                          newServ[index].custoMaterial = e.target.value;
                          setDados({...dados, servicos: newServ});
                        }}
                        className="w-full p-2 border rounded-lg" placeholder="0.00" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Rodapé de Navegação */}
        <div className="bg-gray-100 p-6 flex justify-between rounded-b-2xl border-t">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="px-6 py-2 text-slate-700 font-medium hover:bg-gray-200 rounded-lg transition-colors">
              Voltar
            </button>
          ) : <div></div>}

          {step < 5 ? (
            <button onClick={() => setStep(step + 1)} className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-md">
              Próximo Passo
            </button>
          ) : (
            <button onClick={finalizarWizard} disabled={loading} className="px-6 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors shadow-md disabled:opacity-70 flex items-center">
              {loading ? 'Calculando Inteligência...' : 'Finalizar e Ver Painel 🚀'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default WizardBemVinda;
