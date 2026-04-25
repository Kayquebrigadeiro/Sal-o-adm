import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Sparkles, UserPlus, Trash2, Scissors, FlaskConical,
  ChevronRight, ChevronLeft, Check, Home, Zap, Droplets,
  Wifi, ShoppingBag, Plus, Lightbulb,
  Briefcase, CheckCircle2, User, Building, Settings
} from 'lucide-react';
import { SUGESTOES as SUGESTOES_CONST, ORDEM_CATEGORIAS, CATEGORIAS as CAT_CONFIG } from '../constants/categorias';

/* ───────── Categorias V6 ──────────────────────────────────────────────────── */
const CATEGORIAS = ORDEM_CATEGORIAS.map(key => ({
  key,
  label: CAT_CONFIG[key].label,
  emoji: CAT_CONFIG[key].emoji,
  comTamanho: CAT_CONFIG[key].temComprimento,
  descricao: CAT_CONFIG[key].descricao,
}));

const CUSTOS_PADRAO = [
  { nome: 'Aluguel',  tipo: 'ALUGUEL',  icon: Home,     cor: 'indigo' },
  { nome: 'Energia',  tipo: 'ENERGIA',  icon: Zap,      cor: 'amber'  },
  { nome: 'Água',     tipo: 'AGUA',     icon: Droplets, cor: 'sky'    },
  { nome: 'Internet', tipo: 'INTERNET', icon: Wifi,     cor: 'violet' },
];

const TIPOS_CUSTO = [
  { value: 'ALUGUEL',     label: 'Aluguel'     },
  { value: 'ENERGIA',     label: 'Energia/Luz' },
  { value: 'AGUA',        label: 'Água'        },
  { value: 'INTERNET',    label: 'Internet'    },
  { value: 'MATERIAL',    label: 'Material'    },
  { value: 'EQUIPAMENTO', label: 'Equipamento' },
  { value: 'FUNCIONARIO', label: 'Funcionário' },
  { value: 'OUTRO',       label: 'Outro'       },
];

const uid = () => Math.random().toString(36).substr(2, 9);

const novoProcCabelo = (nome = '', comissao = 40) => ({
  id: uid(), nome, preco_p: '', preco_m: '', preco_g: '',
  porcentagem_profissional: String(comissao), custo_variavel: '0',
});

const novoProdutoAplicado = (nome = '', marca = '') => ({
  id: uid(), nome, marca, preco_frasco: '', aplicacoes_por_frasco: '',
  preco_p: '',
});

const novoProcEstetica = (nome = '', comissao = 45) => ({
  id: uid(), nome, preco_p: '', porcentagem_profissional: String(comissao),
});

/* ───────── Componentes Auxiliares ──────────────────────────────────────────── */
const Toggle = ({ value, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
      value
        ? 'bg-indigo-600 shadow-md shadow-indigo-200'
        : 'bg-slate-300'
    }`}
    aria-label={label}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${value ? 'translate-x-6' : ''}`} />
  </button>
);

const StepperBar = ({ etapa, totalEtapas }) => {
  const labels = ['Boas-vindas', 'Equipe', 'Serviços', 'Despesas', 'Revisão'];
  const icons  = [User, Briefcase, Scissors, Building, CheckCircle2];
  return (
    <div className="flex items-center justify-center gap-1 mb-8 w-full max-w-xl mx-auto px-2">
      {Array.from({ length: totalEtapas }, (_, i) => {
        const Icon = icons[i];
        const done = etapa > i;
        const active = etapa === i;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center relative z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                done   ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' :
                active ? 'bg-indigo-50 text-indigo-600 border-2 border-indigo-600 shadow-sm' :
                         'bg-white text-slate-400 border-2 border-slate-200'
              }`}>
                {done ? <Check size={18} /> : <Icon size={18} />}
              </div>
              <span className={`absolute -bottom-6 text-[10px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                active ? 'text-indigo-700' : done ? 'text-slate-600' : 'text-slate-400'
              }`}>{labels[i]}</span>
            </div>
            {i < totalEtapas - 1 && (
              <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-500 ${
                etapa > i ? 'bg-indigo-600' : 'bg-slate-200'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

const Confetti = () => {
  const colors = ['#4f46e5', '#3b82f6', '#10b981', '#f59e0b', '#6366f1'];
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {Array.from({ length: 40 }, (_, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: colors[i % colors.length],
            animationDelay: `${Math.random() * 1.5}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
            width: `${6 + Math.random() * 8}px`,
            height: `${6 + Math.random() * 8}px`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
};

/* ───────── COMPONENTE PRINCIPAL ───────────────────────────────────────────── */
export default function WizardPrimeiroAcesso({ salaoId }) {
  const [etapa, setEtapa]           = useState(0);
  const [salvando, setSalvando]     = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [animKey, setAnimKey]       = useState(0);

  // ─── Etapa 0: Boas-vindas ──────────────────────────────────────────────
  const [nomeProprietaria, setNomeProprietaria] = useState('');

  // ─── Etapa 1: Equipe ──────────────────────────────────────────────────
  const [temFuncionarios, setTemFuncionarios] = useState(false);
  const [funcionarios, setFuncionarios] = useState([
    { id: uid(), nome: '', cargo: 'FUNCIONARIO', salario_fixo: '' },
  ]);

  const addFunc    = () => setFuncionarios(f => [...f, { id: uid(), nome: '', cargo: 'FUNCIONARIO', salario_fixo: '' }]);
  const removeFunc = (id) => setFuncionarios(f => f.filter(x => x.id !== id));
  const updateFunc = (id, k, v) => setFuncionarios(f => f.map(x => x.id === id ? { ...x, [k]: v } : x));

  // ─── Etapa 2: Serviços e Produtos (3 categorias V6) ──────────────────────
  const [servicosCabelo, setServicosCabelo]     = useState([]);
  const [produtosAplicados, setProdutosAplicados] = useState([]);
  const [servicosEstetica, setServicosEstetica] = useState([]);

  const addCabelo = (nome = '', comissao = 40) => setServicosCabelo(prev => [...prev, novoProcCabelo(nome, comissao)]);
  const addProduto = (nome = '', marca = '') => setProdutosAplicados(prev => [...prev, novoProdutoAplicado(nome, marca)]);
  const addEstetica = (nome = '', comissao = 45) => setServicosEstetica(prev => [...prev, novoProcEstetica(nome, comissao)]);

  const removeCabelo = (id) => setServicosCabelo(prev => prev.filter(x => x.id !== id));
  const removeProduto = (id) => setProdutosAplicados(prev => prev.filter(x => x.id !== id));
  const removeEstetica = (id) => setServicosEstetica(prev => prev.filter(x => x.id !== id));

  const updateCabelo = (id, k, v) => setServicosCabelo(prev => prev.map(x => x.id === id ? { ...x, [k]: v } : x));
  const updateProduto = (id, k, v) => setProdutosAplicados(prev => prev.map(x => x.id === id ? { ...x, [k]: v } : x));
  const updateEstetica = (id, k, v) => setServicosEstetica(prev => prev.map(x => x.id === id ? { ...x, [k]: v } : x));

  const isCabeloAdded = (nome) => servicosCabelo.some(p => p.nome === nome);
  const isProdutoAdded = (nome) => produtosAplicados.some(p => p.nome === nome);
  const isEsteticaAdded = (nome) => servicosEstetica.some(p => p.nome === nome);

  // ─── Etapa 3: Custos Fixos (salva em custos_fixos_itens) ────────────────
  const [atendimentosMes, setAtendimentosMes] = useState(100);
  const [catAtiva, setCatAtiva] = useState('SERVICO_CABELO');
  const [custos, setCustos] = useState(
    CUSTOS_PADRAO.map(d => ({ id: uid(), nome: d.nome, tipo: d.tipo, valor: '' }))
  );
  const [custosExtras, setCustosExtras] = useState([]);

  const addCustoExtra    = () => setCustosExtras(d => [...d, { id: uid(), nome: '', tipo: 'OUTRO', valor: '' }]);
  const removeCustoExtra = (id) => setCustosExtras(d => d.filter(x => x.id !== id));
  const updateCusto = (id, k, v) => {
    setCustos(d => d.map(x => x.id === id ? { ...x, [k]: v } : x));
    setCustosExtras(d => d.map(x => x.id === id ? { ...x, [k]: v } : x));
  };

  const totalCustos = [...custos, ...custosExtras]
    .reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
  const custoPorAtendimento = atendimentosMes > 0
    ? (totalCustos / atendimentosMes).toFixed(2)
    : '0.00';

  // ─── Navegação ─────────────────────────────────────────────────────────
  const avancar = () => { setAnimKey(k => k + 1); setEtapa(e => Math.min(e + 1, 4)); };
  const voltar  = () => { setAnimKey(k => k + 1); setEtapa(e => Math.max(e - 1, 0)); };

  // ─── Contadores para resumo ─────────────────────────────────────────────
  const totalFuncs = temFuncionarios ? funcionarios.filter(f => f.nome.trim()).length : 0;
  const totalProcs = servicosCabelo.filter(p => p.nome.trim()).length
    + produtosAplicados.filter(p => p.nome.trim()).length
    + servicosEstetica.filter(p => p.nome.trim()).length;
  const totalDesps = [...custos, ...custosExtras].filter(d => d.nome.trim() && d.valor).length;

  // ─── Finalizar ─────────────────────────────────────────────────────────
  const finalizar = async () => {
    setSalvando(true);
    try {
      // 1. Marca salão como configurado + salva nome do gestor (mantendo o campo do banco)
      const updateData = { configurado: true };
      if (nomeProprietaria.trim()) {
        updateData.nome_proprietaria = nomeProprietaria.trim();
      }
      const { error: salaoErr } = await supabase
        .from('saloes')
        .update(updateData)
        .eq('id', salaoId);
      if (salaoErr) throw salaoErr;

      // 2. Gestor como profissional (se ele atende)
      if (nomeProprietaria.trim()) {
        const { error: propError } = await supabase.from('profissionais').insert({
          salao_id:     salaoId,
          nome:         nomeProprietaria.trim(),
          cargo:        'PROPRIETARIO',
          salario_fixo: 0,
          ativo:        true,
        });
        if (propError) throw propError;
      }

      // 3. Funcionários
      if (temFuncionarios) {
        const validos = funcionarios.filter(f => f.nome.trim());
        if (validos.length > 0) {
          const { error } = await supabase.from('profissionais').insert(
            validos.map(f => ({
              salao_id:     salaoId,
              nome:         f.nome.trim(),
              cargo:        f.cargo,
              salario_fixo: Number(f.salario_fixo) || 0,
              ativo:        true,
            }))
          );
          if (error) throw error;
        }
      }

      // 4. Serviços e Produtos (V6)
      const rows = [];
      
      servicosCabelo.filter(p => p.nome.trim()).forEach(p => {
        rows.push({
          salao_id: salaoId, nome: p.nome.trim(), categoria: 'SERVICO_CABELO', requer_comprimento: true,
          preco_p: Number(p.preco_p) || null, preco_m: Number(p.preco_m) || null, preco_g: Number(p.preco_g) || null,
          porcentagem_profissional: Number(p.porcentagem_profissional) || 40, custo_variavel: Number(p.custo_variavel) || 0,
          ativo: true,
        });
      });

      produtosAplicados.filter(p => p.nome.trim()).forEach(p => {
        const pFrasco = Number(p.preco_frasco) || 0;
        const aplicacoes = Math.max(Number(p.aplicacoes_por_frasco) || 1, 1);
        rows.push({
          salao_id: salaoId, nome: p.nome.trim(), categoria: 'PRODUTO_APLICADO', requer_comprimento: false,
          preco_p: Number(p.preco_p) || null, preco_frasco: pFrasco, aplicacoes_por_frasco: aplicacoes,
          custo_variavel: pFrasco / aplicacoes,
          porcentagem_profissional: 0, ativo: true,
        });
      });

      servicosEstetica.filter(p => p.nome.trim()).forEach(p => {
        rows.push({
          salao_id: salaoId, nome: p.nome.trim(), categoria: 'SERVICO_ESTETICA', requer_comprimento: false,
          preco_p: Number(p.preco_p) || null, porcentagem_profissional: Number(p.porcentagem_profissional) || 45,
          custo_variavel: 0, ativo: true,
        });
      });

      if (rows.length > 0) {
        const { error } = await supabase.from('procedimentos').insert(rows);
        if (error) throw error;
      }

      // 5. Custos Fixos (salva em custos_fixos_itens!)
      const todosCustos = [...custos, ...custosExtras].filter(d => d.nome.trim() && d.valor);
      if (todosCustos.length > 0) {
        const { error } = await supabase.from('custos_fixos_itens').insert(
          todosCustos.map(d => ({
            salao_id:   salaoId,
            descricao:  d.nome.trim(),
            tipo:       d.tipo,
            valor:      Number(d.valor),
            valor_mensal: Number(d.valor),
            ativo:      true
          }))
        );
        if (error) throw error;
      }

      // 6. Atualizar atendimentos_mes na config
      if (atendimentosMes > 0) {
        await supabase.from('configuracoes').update({ qtd_atendimentos_mes: Number(atendimentosMes) }).eq('salao_id', salaoId);
      }

      // Sucesso!
      setShowConfetti(true);
      setTimeout(() => window.location.reload(), 2000);

    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
      setSalvando(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════ */
  /*  RENDER                                                                */
  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center py-8 px-4 sm:py-12 font-sans text-slate-800">
      {showConfetti && <Confetti />}

      <div className="w-full max-w-2xl">
        {/* ── Header ── */}
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Configuração do Sistema
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Personalize seu ambiente de gestão. Estes dados poderão ser ajustados posteriormente.
          </p>
        </div>

        {/* ── Stepper ── */}
        <StepperBar etapa={etapa} totalEtapas={5} />

        {/* ── Conteúdo Animado ── */}
        <div key={animKey} className="animate-wizard-slide mt-12">

          {/* ═══════════ ETAPA 0 — BOAS-VINDAS ═══════════ */}
          {etapa === 0 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                  <User size={32} className="text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Bem-vindo(a) ao seu novo painel</h2>
                <p className="text-sm text-slate-500 mb-8">
                  Para iniciarmos a personalização do sistema,<br />
                  como você gostaria de ser chamado(a)?
                </p>

                <div className="max-w-sm mx-auto text-left">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nome do Gestor(a)</label>
                  <input
                    type="text"
                    value={nomeProprietaria}
                    onChange={e => setNomeProprietaria(e.target.value.toUpperCase())}
                    placeholder="Ex: Carlos, Ana, Roberto..."
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all"
                    autoFocus
                  />
                </div>

                {nomeProprietaria.trim() && (
                  <div className="mt-6 animate-fadeIn">
                    <p className="text-sm text-indigo-600 font-medium bg-indigo-50 inline-block px-4 py-2 rounded-full">
                      Tudo certo, {nomeProprietaria.trim()}! Vamos prosseguir.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={avancar}
                  disabled={!nomeProprietaria.trim()}
                  className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Continuar <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════ ETAPA 1 — EQUIPE ═══════════ */}
          {etapa === 1 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Gestão de Equipe
                    </h2>
                    <p className="text-sm text-slate-500">Cadastre os profissionais que atuam no estabelecimento</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl mb-6 border border-slate-200">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">A equipe possui outros colaboradores?</p>
                    <p className="text-xs text-slate-500 mt-1">Ative caso existam outros profissionais cadastrados.</p>
                  </div>
                  <Toggle value={temFuncionarios} onChange={setTemFuncionarios} label="Toggle funcionários" />
                </div>

                {temFuncionarios && (
                  <div className="space-y-4 animate-fadeIn">
                    {funcionarios.map((f, idx) => (
                      <div key={f.id} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4 relative">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Colaborador {idx + 1}</span>
                          {funcionarios.length > 1 && (
                            <button onClick={() => removeFunc(f.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Remover">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        
                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1 block">Nome Completo</label>
                          <input
                            type="text" value={f.nome} onChange={e => updateFunc(f.id, 'nome', e.target.value.toUpperCase())}
                            placeholder="Ex: João da Silva"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-semibold text-slate-700 mb-1 block">Perfil / Cargo</label>
                            <select value={f.cargo} onChange={e => updateFunc(f.id, 'cargo', e.target.value)}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500">
                              <option value="FUNCIONARIO">Profissional</option>
                              <option value="PROPRIETARIO">Sócio / Gestor</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-700 mb-1 block">Salário Fixo (R$)</label>
                            <input type="number" value={f.salario_fixo} onChange={e => updateFunc(f.id, 'salario_fixo', e.target.value)}
                              placeholder="0.00"
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button onClick={addFunc} className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 font-semibold transition-all">
                      <UserPlus size={16} /> Adicionar outro colaborador
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-3">
                <Zap size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Nota sobre pagamentos:</strong> A taxa padrão de máquina de cartão está configurada para 5%. Ela pode ser ajustada posteriormente nas configurações.
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={voltar} className="flex-1 sm:flex-none sm:w-32 py-3.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button onClick={avancar} className="flex-1 py-3.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                  Avançar <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════ ETAPA 2 — PROCEDIMENTOS ═══════════ */}
          {etapa === 2 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Scissors size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Serviços e Valores</h2>
                    <p className="text-sm text-slate-500">Configure os serviços prestados e suas tabelas de preço</p>
                  </div>
                </div>

                {/* Tabs por categoria */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
                  {CATEGORIAS.map(cat => {
                    const count = cat.key === 'SERVICO_CABELO' ? servicosCabelo.length : cat.key === 'PRODUTO_APLICADO' ? produtosAplicados.length : servicosEstetica.length;
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setCatAtiva(cat.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                          catAtiva === cat.key
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span className="opacity-80">{cat.emoji}</span> {cat.label}
                        {count > 0 && (
                          <span className={`ml-1 w-5 h-5 rounded-full text-[10px] flex items-center justify-center ${
                            catAtiva === cat.key ? 'bg-white/20' : 'bg-slate-300 text-slate-800'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="text-sm text-slate-500 mb-6 font-medium">
                  {CATEGORIAS.find(c => c.key === catAtiva)?.descricao}
                </p>

                {/* ─── SERVICO_CABELO ───────────────────────────────────── */}
                {catAtiva === 'SERVICO_CABELO' && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Sugestões rápidas</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {SUGESTOES_CONST.SERVICO_CABELO.map(sug => {
                        const added = isCabeloAdded(sug.nome);
                        return (
                          <button key={sug.nome} onClick={() => { if (!added) addCabelo(sug.nome, sug.comissao); }} disabled={added}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${added ? 'bg-emerald-50 text-emerald-700 border-emerald-200 opacity-60 cursor-default' : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-400 hover:text-emerald-600'}`}>
                            {added ? <Check size={14} className="inline mr-1" /> : <Plus size={14} className="inline mr-1" />} {sug.nome}
                          </button>
                        );
                      })}
                    </div>

                    {servicosCabelo.length > 0 && (
                      <div className="space-y-4">
                        {servicosCabelo.map(proc => (
                          <div key={proc.id} className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200 space-y-4 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <input type="text" value={proc.nome} onChange={e => updateCabelo(proc.id, 'nome', e.target.value.toUpperCase())} placeholder="Nome do Serviço" className="flex-1 border-0 bg-transparent text-base font-bold text-slate-900 outline-none placeholder:text-slate-400 p-0 focus:ring-0" />
                              <button onClick={() => removeCabelo(proc.id)} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div><label className="text-xs font-semibold text-slate-600 block mb-1">P / Curto (R$)</label><input type="number" value={proc.preco_p} onChange={e => updateCabelo(proc.id, 'preco_p', e.target.value)} placeholder="0.00" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" /></div>
                              <div><label className="text-xs font-semibold text-slate-600 block mb-1">M / Médio (R$)</label><input type="number" value={proc.preco_m} onChange={e => updateCabelo(proc.id, 'preco_m', e.target.value)} placeholder="0.00" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" /></div>
                              <div><label className="text-xs font-semibold text-slate-600 block mb-1">G / Longo (R$)</label><input type="number" value={proc.preco_g} onChange={e => updateCabelo(proc.id, 'preco_g', e.target.value)} placeholder="0.00" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 mt-2">
                              <div><label className="text-xs font-semibold text-slate-600 block mb-1">Comissão (%)</label><input type="number" value={proc.porcentagem_profissional} onChange={e => updateCabelo(proc.id, 'porcentagem_profissional', e.target.value)} placeholder="40" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" /></div>
                              <div><label className="text-xs font-semibold text-slate-600 block mb-1">Custo Mat. P (R$)</label><input type="number" value={proc.custo_variavel} onChange={e => updateCabelo(proc.id, 'custo_variavel', e.target.value)} placeholder="0.00" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" /></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => addCabelo()} className="mt-4 flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-600 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 font-semibold transition-all"><Plus size={16} /> Adicionar serviço de cabelo manualmente</button>
                  </div>
                )}

                {/* ─── PRODUTO_APLICADO ─────────────────────────────────── */}
                {catAtiva === 'PRODUTO_APLICADO' && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Sugestões rápidas</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {SUGESTOES_CONST.PRODUTO_APLICADO.map(sug => {
                        const added = isProdutoAdded(sug.nome);
                        return (
                          <button key={sug.nome} onClick={() => { if (!added) addProduto(sug.nome, sug.marca); }} disabled={added}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${added ? 'bg-violet-50 text-violet-700 border-violet-200 opacity-60 cursor-default' : 'bg-white text-slate-700 border-slate-300 hover:border-violet-400 hover:text-violet-600'}`}>
                            {added ? <Check size={14} className="inline mr-1" /> : <Plus size={14} className="inline mr-1" />} {sug.nome}
                          </button>
                        );
                      })}
                    </div>

                    {produtosAplicados.length > 0 && (
                      <div className="space-y-4">
                        {produtosAplicados.map(proc => (
                          <div key={proc.id} className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200 space-y-4 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <input type="text" value={proc.nome} onChange={e => updateProduto(proc.id, 'nome', e.target.value.toUpperCase())} placeholder="Nome do Produto/Serviço" className="flex-1 border-0 bg-transparent text-base font-bold text-slate-900 outline-none placeholder:text-slate-400 p-0 focus:ring-0" />
                              <button onClick={() => removeProduto(proc.id)} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div><label className="text-xs font-semibold text-slate-600 block mb-1">Preço do Frasco/Kit (R$)</label><input type="number" value={proc.preco_frasco} onChange={e => updateProduto(proc.id, 'preco_frasco', e.target.value)} placeholder="0.00" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500" /></div>
                              <div><label className="text-xs font-semibold text-slate-600 block mb-1">Rende qtas aplicações?</label><input type="number" value={proc.aplicacoes_por_frasco} onChange={e => updateProduto(proc.id, 'aplicacoes_por_frasco', e.target.value)} placeholder="Ex: 10" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500" /></div>
                            </div>
                            <div className="border-t border-slate-200 pt-4 mt-2">
                              <label className="text-xs font-semibold text-slate-600 block mb-1">Valor Cobrado da Cliente por Aplicação (R$)</label>
                              <input type="number" value={proc.preco_p} onChange={e => updateProduto(proc.id, 'preco_p', e.target.value)} placeholder="0.00" className="w-full sm:w-1/2 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => addProduto()} className="mt-4 flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-600 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 font-semibold transition-all"><Plus size={16} /> Adicionar produto manualmente</button>
                  </div>
                )}

                {/* ─── SERVICO_ESTETICA ─────────────────────────────────── */}
                {catAtiva === 'SERVICO_ESTETICA' && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Sugestões rápidas</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {SUGESTOES_CONST.SERVICO_ESTETICA.map(sug => {
                        const added = isEsteticaAdded(sug.nome);
                        return (
                          <button key={sug.nome} onClick={() => { if (!added) addEstetica(sug.nome, sug.comissao); }} disabled={added}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${added ? 'bg-pink-50 text-pink-700 border-pink-200 opacity-60 cursor-default' : 'bg-white text-slate-700 border-slate-300 hover:border-pink-400 hover:text-pink-600'}`}>
                            {added ? <Check size={14} className="inline mr-1" /> : <Plus size={14} className="inline mr-1" />} {sug.nome}
                          </button>
                        );
                      })}
                    </div>

                    {servicosEstetica.length > 0 && (
                      <div className="space-y-4">
                        {servicosEstetica.map(proc => (
                          <div key={proc.id} className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200 space-y-4 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <input type="text" value={proc.nome} onChange={e => updateEstetica(proc.id, 'nome', e.target.value.toUpperCase())} placeholder="Nome do Serviço" className="flex-1 border-0 bg-transparent text-base font-bold text-slate-900 outline-none placeholder:text-slate-400 p-0 focus:ring-0" />
                              <button onClick={() => removeEstetica(proc.id)} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div><label className="text-xs font-semibold text-slate-600 block mb-1">Valor Cobrado (R$)</label><input type="number" value={proc.preco_p} onChange={e => updateEstetica(proc.id, 'preco_p', e.target.value)} placeholder="0.00" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500" /></div>
                              <div><label className="text-xs font-semibold text-slate-600 block mb-1">Comissão (%)</label><input type="number" value={proc.porcentagem_profissional} onChange={e => updateEstetica(proc.id, 'porcentagem_profissional', e.target.value)} placeholder="45" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500" /></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => addEstetica()} className="mt-4 flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-600 hover:text-pink-600 hover:border-pink-300 hover:bg-pink-50 font-semibold transition-all"><Plus size={16} /> Adicionar estética manualmente</button>
                  </div>
                )}
              </div>

              {/* Contador flutuante */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm text-indigo-800 font-medium">Total de serviços cadastrados:</span>
                <span className="text-lg font-bold text-indigo-700">{totalProcs}</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={voltar} className="flex-1 sm:flex-none sm:w-32 py-3.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button onClick={avancar} className="flex-1 py-3.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                  Avançar <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════ ETAPA 3 — DESPESAS ═══════════ */}
          {etapa === 3 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center text-violet-600">
                    <Building size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Custos Fixos Mensais</h2>
                    <p className="text-sm text-slate-500">Mapeamento para cálculo de lucratividade</p>
                  </div>
                </div>

                {/* Custos padrão com ícones */}
                <div className="space-y-4">
                  {custos.map((d, idx) => {
                    const config = CUSTOS_PADRAO[idx];
                    const Icon = config?.icon || ShoppingBag;
                    return (
                      <div key={d.id} className="flex items-center gap-4 bg-white rounded-xl p-3 border border-slate-200 hover:border-slate-300 transition-colors">
                        <div className={`w-10 h-10 rounded-lg bg-${config?.cor}-50 flex items-center justify-center flex-shrink-0 text-${config?.cor}-600`}>
                          <Icon size={18} />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 w-24 flex-shrink-0">{d.nome}</span>
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-2.5 text-sm font-medium text-slate-400">R$</span>
                          <input
                            type="number" value={d.valor}
                            onChange={e => updateCusto(d.id, 'valor', e.target.value)}
                            placeholder="0.00"
                            className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custos extras */}
                {custosExtras.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Despesas Adicionais</span>
                    {custosExtras.map(d => (
                      <div key={d.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-fadeIn bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <input type="text" value={d.nome} onChange={e => updateCusto(d.id, 'nome', e.target.value.toUpperCase())}
                          placeholder="Descrição"
                          className="w-full sm:flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                        
                        <div className="flex w-full sm:w-auto gap-3">
                          <select value={d.tipo} onChange={e => updateCusto(d.id, 'tipo', e.target.value)}
                            className="flex-1 sm:w-32 border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                            {TIPOS_CUSTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                          <div className="relative flex-1 sm:w-32">
                            <span className="absolute left-3 top-2.5 text-sm font-medium text-slate-400">R$</span>
                            <input type="number" value={d.valor} onChange={e => updateCusto(d.id, 'valor', e.target.value)}
                              placeholder="0.00" className="w-full border border-slate-300 rounded-lg pl-9 pr-2 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                          </div>
                          <button onClick={() => removeCustoExtra(d.id)} className="text-slate-400 hover:text-red-600 p-2 border border-transparent hover:bg-white rounded-lg transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={addCustoExtra} className="mt-4 flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 font-semibold transition-all">
                  <Plus size={16} /> Adicionar nova despesa
                </button>

                {/* Rateio de Atendimentos */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Previsão de Atendimentos</h3>
                  <p className="text-xs text-slate-500 mb-4">Quantos atendimentos o salão faz por mês em média? Isso definirá a taxa de custo fixo embutida em cada serviço.</p>
                  <div className="flex items-center gap-4">
                    <input type="number" value={atendimentosMes} onChange={e => setAtendimentosMes(e.target.value)}
                      className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                    <span className="text-sm font-semibold text-slate-700">atendimentos/mês</span>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="bg-slate-900 rounded-xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <p className="text-slate-400 text-sm font-medium mb-1">Custo Fixo Total / Mês</p>
                  <p className="text-white text-3xl font-extrabold">R$ {totalCustos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="h-px w-full md:h-12 md:w-px bg-slate-700"></div>
                <div className="text-center md:text-right">
                  <p className="text-slate-400 text-sm font-medium mb-1">Custo por Atendimento</p>
                  <p className="text-emerald-400 text-2xl font-bold">R$ {custoPorAtendimento}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={voltar} className="flex-1 sm:flex-none sm:w-32 py-3.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button onClick={avancar} className="flex-1 py-3.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                  Revisar <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════ ETAPA 4 — REVISÃO ═══════════ */}
          {etapa === 4 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                <div className="text-center mb-8 pb-6 border-b border-slate-100">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                    <CheckCircle2 size={32} className="text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Resumo da Configuração</h2>
                  <p className="text-sm text-slate-500 mt-2">Valide as informações antes de finalizar a implantação.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card Proprietária */}
                  {nomeProprietaria.trim() && (
                    <div className="flex items-start gap-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Gestor(a)</p>
                        <p className="text-base font-bold text-slate-900">{nomeProprietaria.trim()}</p>
                      </div>
                    </div>
                  )}

                  {/* Card Equipe */}
                  <div className="flex items-start gap-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Equipe</p>
                      <p className="text-base font-bold text-slate-900">
                        {temFuncionarios ? `${totalFuncs} Profissionais` : 'Atuação Individual'}
                      </p>
                    </div>
                  </div>

                  {/* Card Procedimentos */}
                  <div className="flex items-start gap-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                      <Scissors size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Serviços</p>
                      <p className="text-base font-bold text-slate-900 mb-2">{totalProcs} Cadastrados</p>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIAS.map(cat => {
                          const lista = cat.key === 'SERVICO_CABELO' ? servicosCabelo : cat.key === 'PRODUTO_APLICADO' ? produtosAplicados : servicosEstetica;
                          const n = lista.filter(p => p.nome.trim()).length;
                          return n > 0 ? (
                            <span key={cat.key} className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-md font-medium">
                              {cat.label}: {n}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Card Despesas */}
                  <div className="flex items-start gap-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 flex-shrink-0">
                      <Building size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Despesas Fixas</p>
                      <p className="text-base font-bold text-slate-900">R$ {totalCustos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-slate-500 mt-1">{totalDesps} itens cadastrados</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button onClick={voltar} disabled={salvando} className="w-full sm:w-1/3 py-4 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  <ChevronLeft size={16} /> Voltar para Edição
                </button>
                <button
                  onClick={finalizar}
                  disabled={salvando}
                  className="w-full sm:w-2/3 py-4 bg-slate-900 text-white font-bold rounded-lg shadow-md hover:bg-slate-800 disabled:opacity-70 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {salvando ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Finalizando implantação...
                    </>
                  ) : (
                    <>
                      <Settings size={18} /> Concluir Configuração e Acessar Painel
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
