import { useState } from 'react';
import { supabase } from '../supabaseClient';

// Sugestões rápidas para facilitar o cadastro
const SUGESTOES_PROCEDIMENTOS = [
  { nome: 'Corte Feminino', categoria: 'CABELO', preco: 80 },
  { nome: 'Corte Masculino', categoria: 'CABELO', preco: 40 },
  { nome: 'Manicure', categoria: 'UNHAS', preco: 35 },
  { nome: 'Pedicure', categoria: 'UNHAS', preco: 40 },
  { nome: 'Design de Sobrancelhas', categoria: 'SOBRANCELHAS', preco: 30 },
];

export default function WizardPrimeiroAcesso({ salaoId }) {
  const [etapa, setEtapa] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Estados do Wizard
  const [profissionais, setProfissionais] = useState([{ nome: '', cargo: 'PROPRIETARIO' }]);
  const [procedimentos, setProcedimentos] = useState([]);
  
  // Funções Auxiliares
  const addProfissional = () => setProfissionais([...profissionais, { nome: '', cargo: 'FUNCIONARIO' }]);
  const updateProfissional = (index, campo, valor) => {
    const novos = [...profissionais];
    novos[index][campo] = valor;
    setProfissionais(novos);
  };
  const removerProfissional = (index) => setProfissionais(profissionais.filter((_, i) => i !== index));

  const toggleProcedimento = (proc) => {
    const existe = procedimentos.find(p => p.nome === proc.nome);
    if (existe) {
      setProcedimentos(procedimentos.filter(p => p.nome !== proc.nome));
    } else {
      setProcedimentos([...procedimentos, { 
        nome: proc.nome, 
        categoria: proc.categoria, 
        preco_p: proc.preco,
        porcentagem_profissional: 40,
        custo_variavel: 0,
        requer_comprimento: false
      }]);
    }
  };

  // Salvar tudo no banco e liberar o acesso
  const finalizarConfiguracao = async () => {
    setSalvando(true);
    setErro('');

    try {
      // 1. Salvar Profissionais (ignorando os vazios)
      const profsValidos = profissionais.filter(p => p.nome.trim() !== '');
      if (profsValidos.length > 0) {
        const profsParaSalvar = profsValidos.map(p => ({
          salao_id: salaoId,
          nome: p.nome,
          cargo: p.cargo,
          salario_fixo: 0,
          ativo: true
        }));
        const { error: errProfs } = await supabase.from('profissionais').insert(profsParaSalvar);
        if (errProfs) throw errProfs;
      }

      // 2. Salvar Procedimentos
      if (procedimentos.length > 0) {
        const procsParaSalvar = procedimentos.map(p => ({
          ...p,
          salao_id: salaoId,
          ativo: true
        }));
        const { error: errProcs } = await supabase.from('procedimentos').insert(procsParaSalvar);
        if (errProcs) throw errProcs;
      }

      // 3. Criar configurações padrão
      const { error: errConfig } = await supabase.from('configuracoes').insert([{
        salao_id: salaoId,
        custo_fixo_por_atendimento: 29,
        taxa_maquininha_pct: 5
      }]);
      if (errConfig && errConfig.code !== '23505') throw errConfig; // Ignora se já existe

      // 4. O GRANDE FINAL: Marcar o salão como configurado!
      const { error: errSalao } = await supabase
        .from('saloes')
        .update({ configurado: true })
        .eq('id', salaoId);
      
      if (errSalao) throw errSalao;

      // Recarrega a página para o App.jsx ler o novo status e mostrar a Agenda
      window.location.reload();

    } catch (err) {
      console.error(err);
      setErro('Ocorreu um erro ao salvar as configurações. Tente novamente.');
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Cabeçalho do Wizard */}
        <div className="bg-slate-900 px-8 py-6 text-white text-center">
          <h1 className="text-2xl font-bold">Bem-vinda ao seu novo sistema! 🎉</h1>
          <p className="text-slate-300 mt-2 text-sm">
            Faltam apenas {4 - etapa} passos para você começar a usar a sua agenda.
          </p>
        </div>

        {/* Corpo do Wizard */}
        <div className="p-8">
          {erro && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center">
              {erro}
            </div>
          )}

          {/* ETAPA 1: PROFISSIONAIS */}
          {etapa === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Quem trabalha no salão?</h2>
                <p className="text-sm text-slate-500">Cadastre você e sua equipe. Se trabalhar sozinha, basta colocar seu nome.</p>
              </div>

              <div className="space-y-3">
                {profissionais.map((prof, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <input
                      type="text"
                      placeholder="Nome do profissional"
                      value={prof.nome}
                      onChange={e => updateProfissional(i, 'nome', e.target.value)}
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-800"
                    />
                    <select
                      value={prof.cargo}
                      onChange={e => updateProfissional(i, 'cargo', e.target.value)}
                      className="w-40 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      <option value="PROPRIETARIO">Proprietária</option>
                      <option value="FUNCIONARIO">Funcionária</option>
                    </select>
                    {i > 0 && (
                      <button onClick={() => removerProfissional(i)} className="text-red-500 font-bold px-2 hover:text-red-700">X</button>
                    )}
                  </div>
                ))}
              </div>
              
              <button onClick={addProfissional} className="text-sm text-slate-600 font-medium hover:text-slate-900 border border-slate-300 border-dashed rounded-lg w-full py-2 bg-slate-50">
                + Adicionar outro profissional
              </button>

              <div className="pt-6 flex justify-end">
                <button 
                  onClick={() => setEtapa(2)}
                  disabled={profissionais[0].nome === ''}
                  className="bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-50"
                >
                  Próximo passo →
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 2: PROCEDIMENTOS */}
          {etapa === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Quais serviços você oferece?</h2>
                <p className="text-sm text-slate-500">Selecione alguns serviços rápidos abaixo. Você poderá editar os preços e adicionar outros depois nas Configurações.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {SUGESTOES_PROCEDIMENTOS.map((proc, i) => {
                  const selecionado = procedimentos.some(p => p.nome === proc.nome);
                  return (
                    <div 
                      key={i}
                      onClick={() => toggleProcedimento(proc)}
                      className={`border rounded-xl p-4 cursor-pointer transition-all ${
                        selecionado ? 'border-slate-800 bg-slate-50 ring-1 ring-slate-800' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-800">{proc.nome}</span>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${selecionado ? 'bg-slate-800 border-slate-800 text-white' : 'border-slate-300'}`}>
                          {selecionado && '✓'}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">A partir de R$ {proc.preco},00</p>
                    </div>
                  );
                })}
              </div>

              <div className="pt-6 flex justify-between">
                <button onClick={() => setEtapa(1)} className="text-slate-600 px-4 py-2 hover:bg-slate-100 rounded-lg text-sm">
                  ← Voltar
                </button>
                <button onClick={() => setEtapa(3)} className="bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-900">
                  Próximo passo →
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 3: FINALIZAÇÃO */}
          {etapa === 3 && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🚀</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Tudo pronto!</h2>
              <p className="text-slate-600 max-w-sm mx-auto">
                Seu salão já tem os dados básicos para funcionar. Você pode adicionar despesas, alterar comissões e personalizar tudo na aba de <b>Configurações</b> a qualquer momento.
              </p>

              <div className="pt-8">
                <button 
                  onClick={finalizarConfiguracao}
                  disabled={salvando}
                  className="w-full bg-green-600 text-white px-6 py-4 rounded-xl text-lg font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {salvando ? 'Preparando sua agenda...' : 'Acessar minha Agenda agora'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
