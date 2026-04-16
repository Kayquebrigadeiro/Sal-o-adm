import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Sparkles, UserPlus, Trash2, Scissors, HandMetal, Eye, EyeOff,
  Gem, ChevronRight, ChevronLeft, Check, Home, Zap, Droplets,
  Wifi, ShoppingBag, Plus, PartyPopper, Star, Heart, Crown
} from 'lucide-react';

/* ───────── Enums alinhados ao schema V5 ───────────────────────────────────── */
const CATEGORIAS = [
  { key: 'CABELO',       label: 'Cabelo',       emoji: '💇‍♀️', comTamanho: true  },
  { key: 'UNHAS',        label: 'Unhas',        emoji: '💅',   comTamanho: false },
  { key: 'SOBRANCELHAS', label: 'Sobrancelhas', emoji: '✨',   comTamanho: false },
  { key: 'CILIOS',       label: 'Cílios',       emoji: '👁️',   comTamanho: false },
  { key: 'OUTRO',        label: 'Outros',       emoji: '🌟',   comTamanho: false },
];

const SUGESTOES = {
  CABELO: ['Corte', 'Progressiva', 'Coloração', 'Luzes', 'Escova', 'Hidratação', 'Botox Capilar', 'Relaxamento', 'Nutrição'],
  UNHAS: ['Esmaltação', 'Alongamento em Gel', 'Alongamento em Fibra', 'Unha Acrílica', 'Nail Art', 'Manutenção'],
  SOBRANCELHAS: ['Design', 'Henna', 'Micropigmentação', 'Laminação'],
  CILIOS: ['Volume Russo', 'Fio a Fio', 'Lifting de Cílios', 'Mega Volume', 'Manutenção'],
  OUTRO: ['Depilação', 'Limpeza de Pele', 'Maquiagem', 'Massagem', 'Peeling', 'Drenagem'],
};

const DESPESAS_PADRAO = [
  { nome: 'Aluguel',  tipo: 'ALUGUEL',  icon: Home,        cor: 'rose'    },
  { nome: 'Energia',  tipo: 'ENERGIA',  icon: Zap,         cor: 'amber'   },
  { nome: 'Água',     tipo: 'AGUA',     icon: Droplets,    cor: 'sky'     },
  { nome: 'Internet', tipo: 'INTERNET', icon: Wifi,        cor: 'violet'  },
  { nome: 'Produtos', tipo: 'MATERIAL', icon: ShoppingBag, cor: 'emerald' },
];

const TIPOS_DESPESA = [
  { value: 'ALUGUEL',     label: 'Aluguel'     },
  { value: 'ENERGIA',     label: 'Energia/Luz' },
  { value: 'AGUA',        label: 'Água'        },
  { value: 'INTERNET',    label: 'Internet'    },
  { value: 'MATERIAL',    label: 'Material'    },
  { value: 'EQUIPAMENTO', label: 'Equipamento' },
  { value: 'FORNECEDOR',  label: 'Fornecedor'  },
  { value: 'FUNCIONARIO', label: 'Funcionário' },
  { value: 'OUTRO',       label: 'Outro'       },
];

const uid = () => Math.random().toString(36).substr(2, 9);

const procVazio = (comTamanho) =>
  comTamanho
    ? { id: uid(), nome: '', preco_p: '', preco_m: '', preco_g: '', porcentagem_profissional: '40', custo_variavel: '0' }
    : { id: uid(), nome: '', preco_p: '', porcentagem_profissional: '40', custo_variavel: '0' };

/* ───────── Componentes Auxiliares ──────────────────────────────────────────── */
const Toggle = ({ value, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
      value
        ? 'bg-gradient-to-r from-rose-400 to-pink-500 shadow-lg shadow-rose-200'
        : 'bg-slate-300'
    }`}
    aria-label={label}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${value ? 'translate-x-6' : ''}`} />
  </button>
);

const StepperBar = ({ etapa, totalEtapas }) => {
  const labels = ['Boas-vindas', 'Equipe', 'Procedimentos', 'Despesas', 'Revisão'];
  const icons  = [Heart, Crown, Scissors, Home, PartyPopper];
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {Array.from({ length: totalEtapas }, (_, i) => {
        const Icon = icons[i];
        const done = etapa > i;
        const active = etapa === i;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                done   ? 'bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-lg shadow-rose-200 scale-100' :
                active ? 'bg-gradient-to-br from-rose-400 to-amber-400 text-white shadow-lg shadow-amber-200 scale-110' :
                         'bg-slate-100 text-slate-400 border border-slate-200'
              }`}>
                {done ? <Check size={16} /> : <Icon size={14} />}
              </div>
              <span className={`text-[10px] mt-1 font-medium whitespace-nowrap transition-colors ${
                active ? 'text-rose-600' : done ? 'text-rose-400' : 'text-slate-400'
              }`}>{labels[i]}</span>
            </div>
            {i < totalEtapas - 1 && (
              <div className={`w-6 sm:w-10 h-0.5 mx-1 rounded-full transition-all duration-500 self-start mt-4 ${
                etapa > i ? 'bg-gradient-to-r from-rose-400 to-pink-400' : 'bg-slate-200'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

const Confetti = () => {
  const colors = ['#f43f5e', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#06b6d4'];
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {Array.from({ length: 30 }, (_, i) => (
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

  // ─── Etapa 2: Procedimentos ────────────────────────────────────────────
  const [catAtiva, setCatAtiva] = useState('CABELO');
  const [procedimentos, setProcedimentos] = useState(
    Object.fromEntries(CATEGORIAS.map(c => [c.key, []]))
  );

  const addProc = (cat, nome = '') => {
    const comTamanho = CATEGORIAS.find(c => c.key === cat).comTamanho;
    const novo = procVazio(comTamanho);
    novo.nome = nome;
    setProcedimentos(p => ({ ...p, [cat]: [...p[cat], novo] }));
  };
  const removeProc = (cat, id) => setProcedimentos(p => ({ ...p, [cat]: p[cat].filter(x => x.id !== id) }));
  const updateProc = (cat, id, k, v) => setProcedimentos(p => ({
    ...p, [cat]: p[cat].map(x => x.id === id ? { ...x, [k]: v } : x)
  }));

  const isSugestaoAdded = (cat, nome) => procedimentos[cat].some(p => p.nome === nome);

  // ─── Etapa 3: Despesas ─────────────────────────────────────────────────
  const [despesas, setDespesas] = useState(
    DESPESAS_PADRAO.map(d => ({ id: uid(), nome: d.nome, tipo: d.tipo, valor: '' }))
  );
  const [despesasExtras, setDespesasExtras] = useState([]);

  const addDespesaExtra    = () => setDespesasExtras(d => [...d, { id: uid(), nome: '', tipo: 'OUTRO', valor: '' }]);
  const removeDespesaExtra = (id) => setDespesasExtras(d => d.filter(x => x.id !== id));
  const updateDespesa = (id, k, v) => {
    setDespesas(d => d.map(x => x.id === id ? { ...x, [k]: v } : x));
    setDespesasExtras(d => d.map(x => x.id === id ? { ...x, [k]: v } : x));
  };

  const totalDespesas = [...despesas, ...despesasExtras]
    .reduce((acc, d) => acc + (Number(d.valor) || 0), 0);

  // ─── Navegação ─────────────────────────────────────────────────────────
  const avancar = () => { setAnimKey(k => k + 1); setEtapa(e => Math.min(e + 1, 4)); };
  const voltar  = () => { setAnimKey(k => k + 1); setEtapa(e => Math.max(e - 1, 0)); };

  // ─── Contadores para resumo ─────────────────────────────────────────────
  const totalFuncs = temFuncionarios ? funcionarios.filter(f => f.nome.trim()).length : 0;
  const totalProcs = CATEGORIAS.reduce((acc, cat) => acc + procedimentos[cat.key].filter(p => p.nome.trim() && p.preco_p).length, 0);
  const totalDesps = [...despesas, ...despesasExtras].filter(d => d.nome.trim() && d.valor).length;

  // ─── Finalizar ─────────────────────────────────────────────────────────
  const finalizar = async () => {
    setSalvando(true);
    try {
      // 1. Marca salão como configurado + salva nome da proprietária
      const updateData = { configurado: true };
      if (nomeProprietaria.trim()) {
        updateData.nome_proprietaria = nomeProprietaria.trim();
      }
      const { error: salaoErr } = await supabase
        .from('saloes')
        .update(updateData)
        .eq('id', salaoId);
      if (salaoErr) throw salaoErr;

      // 2. Profissionais
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

      // 3. Procedimentos
      const rows = [];
      CATEGORIAS.forEach(cat => {
        procedimentos[cat.key]
          .filter(p => p.nome.trim() && p.preco_p)
          .forEach(p => {
            rows.push({
              salao_id:                 salaoId,
              nome:                     p.nome.trim(),
              categoria:                cat.key,
              requer_comprimento:       cat.comTamanho,
              preco_p:                  Number(p.preco_p) || null,
              preco_m:                  cat.comTamanho ? (Number(p.preco_m) || null) : null,
              preco_g:                  cat.comTamanho ? (Number(p.preco_g) || null) : null,
              porcentagem_profissional: Number(p.porcentagem_profissional) || 40,
              custo_variavel:           Number(p.custo_variavel) || 0,
              ativo:                    true,
            });
          });
      });
      if (rows.length > 0) {
        const { error } = await supabase.from('procedimentos').insert(rows);
        if (error) throw error;
      }

      // 4. Despesas
      const todasDespesas = [...despesas, ...despesasExtras].filter(d => d.nome.trim() && d.valor);
      if (todasDespesas.length > 0) {
        const hoje = new Date().toISOString().split('T')[0];
        const { error } = await supabase.from('despesas').insert(
          todasDespesas.map(d => ({
            salao_id:   salaoId,
            descricao:  d.nome.trim(),
            tipo:       d.tipo,
            valor:      Number(d.valor),
            valor_pago: 0,
            data:       hoje,
          }))
        );
        if (error) throw error;
      }

      // Sucesso!
      setShowConfetti(true);
      setTimeout(() => window.location.reload(), 3000);

    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
      setSalvando(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════ */
  /*  RENDER                                                                */
  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50 flex items-start justify-center py-6 px-4 sm:py-10">
      {showConfetti && <Confetti />}

      <div className="w-full max-w-2xl">
        {/* ── Header ── */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-1.5 shadow-sm border border-rose-100 mb-3">
            <Sparkles size={14} className="text-rose-400" />
            <span className="text-xs font-medium text-rose-600">Configuração Inicial</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 bg-clip-text text-transparent">
            Configure seu salão ✂️
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Preencha as informações abaixo — tudo pode ser editado depois.
          </p>
        </div>

        {/* ── Stepper ── */}
        <StepperBar etapa={etapa} totalEtapas={5} />

        {/* ── Conteúdo Animado ── */}
        <div key={animKey} className="animate-wizard-slide">

          {/* ═══════════ ETAPA 0 — BOAS-VINDAS ═══════════ */}
          {etapa === 0 && (
            <div className="space-y-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-rose-100 shadow-lg shadow-rose-100/30 p-6 sm:p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center shadow-lg shadow-rose-200 animate-float">
                  <Heart size={36} className="text-white" fill="white" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Bem-vinda ao seu novo salão! 🎉</h2>
                <p className="text-sm text-slate-500 mb-6">
                  Vamos configurar tudo juntas em poucos minutos.<br />
                  Primeiro, como podemos te chamar?
                </p>

                <div className="max-w-sm mx-auto">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 text-left">Seu nome</label>
                  <input
                    type="text"
                    value={nomeProprietaria}
                    onChange={e => setNomeProprietaria(e.target.value)}
                    placeholder="Ex: Maria, Jéssica, Teta..."
                    className="w-full border-2 border-rose-200 rounded-xl px-4 py-3 text-base text-center font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all"
                    autoFocus
                  />
                </div>

                {nomeProprietaria.trim() && (
                  <div className="mt-5 animate-bounce-in">
                    <p className="text-sm text-rose-500 font-medium">
                      Prazer, {nomeProprietaria.trim()}! 💕 Vamos arrasar!
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={avancar}
                disabled={!nomeProprietaria.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-rose-200 hover:shadow-xl hover:shadow-rose-300 disabled:opacity-40 disabled:shadow-none transition-all duration-300 flex items-center justify-center gap-2"
              >
                Vamos começar <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ═══════════ ETAPA 1 — EQUIPE ═══════════ */}
          {etapa === 1 && (
            <div className="space-y-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-rose-100 shadow-lg shadow-rose-100/30 p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                    <Crown size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      {nomeProprietaria ? `${nomeProprietaria}, ` : ''}sua equipe
                    </h2>
                    <p className="text-xs text-slate-400">Quem trabalha no salão além de você?</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl mb-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Tenho funcionários</p>
                    <p className="text-xs text-slate-400">Pessoas que trabalham no salão</p>
                  </div>
                  <Toggle value={temFuncionarios} onChange={setTemFuncionarios} label="Toggle funcionários" />
                </div>

                {temFuncionarios && (
                  <div className="space-y-3 animate-fadeIn">
                    {funcionarios.map((f, idx) => (
                      <div key={f.id} className="bg-gradient-to-r from-slate-50 to-rose-50/30 rounded-xl p-4 border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">Funcionário {idx + 1}</span>
                          {funcionarios.length > 1 && (
                            <button onClick={() => removeFunc(f.id)} className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <input
                          type="text" value={f.nome} onChange={e => updateFunc(f.id, 'nome', e.target.value)}
                          placeholder="Nome do funcionário"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 transition-all"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-medium text-slate-400 uppercase mb-1 block">Cargo</label>
                            <select value={f.cargo} onChange={e => updateFunc(f.id, 'cargo', e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-rose-300">
                              <option value="FUNCIONARIO">Funcionário(a)</option>
                              <option value="PROPRIETARIO">Sócio(a)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-medium text-slate-400 uppercase mb-1 block">Salário fixo R$</label>
                            <input type="number" value={f.salario_fixo} onChange={e => updateFunc(f.id, 'salario_fixo', e.target.value)}
                              placeholder="0,00"
                              className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-rose-300 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button onClick={addFunc} className="flex items-center gap-1.5 text-sm text-rose-500 hover:text-rose-600 font-semibold transition-colors">
                      <UserPlus size={14} /> Adicionar funcionário
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-3">
                <Zap size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Taxa de maquininha:</strong> 5% fixo sobre cartão — configurada automaticamente.
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={voltar} className="flex-1 py-3 border border-slate-200 text-slate-500 font-medium rounded-xl hover:bg-white transition-all flex items-center justify-center gap-1">
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button onClick={avancar} className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-rose-200 hover:shadow-xl transition-all flex items-center justify-center gap-1">
                  Próximo <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════ ETAPA 2 — PROCEDIMENTOS ═══════════ */}
          {etapa === 2 && (
            <div className="space-y-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-rose-100 shadow-lg shadow-rose-100/30 p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-md">
                    <Scissors size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Procedimentos e preços</h2>
                    <p className="text-xs text-slate-400">Toque nas sugestões para adicionar ou crie os seus</p>
                  </div>
                </div>

                {/* Tabs por categoria */}
                <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 mt-3 -mx-1 px-1 scrollbar-hide">
                  {CATEGORIAS.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setCatAtiva(cat.key)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                        catAtiva === cat.key
                          ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      <span>{cat.emoji}</span> {cat.label}
                      {procedimentos[cat.key].length > 0 && (
                        <span className={`ml-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                          catAtiva === cat.key ? 'bg-white/30 text-white' : 'bg-rose-100 text-rose-600'
                        }`}>
                          {procedimentos[cat.key].length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Sugestões (chips clicáveis) */}
                {CATEGORIAS.filter(c => c.key === catAtiva).map(cat => (
                  <div key={cat.key}>
                    <p className="text-xs font-medium text-slate-400 mb-2">Sugestões rápidas — toque para adicionar:</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {SUGESTOES[cat.key]?.map(sugestao => {
                        const added = isSugestaoAdded(cat.key, sugestao);
                        return (
                          <button
                            key={sugestao}
                            onClick={() => { if (!added) addProc(cat.key, sugestao); }}
                            disabled={added}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                              added
                                ? 'bg-rose-100 text-rose-600 border border-rose-200'
                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 active:scale-95'
                            }`}
                          >
                            {added ? '✓ ' : '+ '}{sugestao}
                          </button>
                        );
                      })}
                    </div>

                    {/* Procedimentos adicionados */}
                    {procedimentos[cat.key].length > 0 && (
                      <div className="space-y-3">
                        {procedimentos[cat.key].map(proc => (
                          <div key={proc.id} className="bg-gradient-to-r from-slate-50 to-rose-50/30 rounded-xl p-3 sm:p-4 border border-slate-100 space-y-3 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <input
                                type="text" value={proc.nome}
                                onChange={e => updateProc(cat.key, proc.id, 'nome', e.target.value)}
                                placeholder="Nome do procedimento"
                                className="flex-1 border-0 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-300"
                              />
                              <button onClick={() => removeProc(cat.key, proc.id)} className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </div>

                            {cat.comTamanho ? (
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[10px] font-medium text-slate-400 block mb-1">Curto R$</label>
                                  <input type="number" value={proc.preco_p} onChange={e => updateProc(cat.key, proc.id, 'preco_p', e.target.value)}
                                    placeholder="0" className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-rose-300" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-medium text-slate-400 block mb-1">Médio R$</label>
                                  <input type="number" value={proc.preco_m} onChange={e => updateProc(cat.key, proc.id, 'preco_m', e.target.value)}
                                    placeholder="0" className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-rose-300" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-medium text-slate-400 block mb-1">Longo R$</label>
                                  <input type="number" value={proc.preco_g} onChange={e => updateProc(cat.key, proc.id, 'preco_g', e.target.value)}
                                    placeholder="0" className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-rose-300" />
                                </div>
                              </div>
                            ) : (
                              <div>
                                <label className="text-[10px] font-medium text-slate-400 block mb-1">Preço R$</label>
                                <input type="number" value={proc.preco_p} onChange={e => updateProc(cat.key, proc.id, 'preco_p', e.target.value)}
                                  placeholder="0,00" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-rose-300" />
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-medium text-slate-400 block mb-1">Comissão %</label>
                                <input type="number" value={proc.porcentagem_profissional}
                                  onChange={e => updateProc(cat.key, proc.id, 'porcentagem_profissional', e.target.value)}
                                  placeholder="40" className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-rose-300" />
                              </div>
                              <div>
                                <label className="text-[10px] font-medium text-slate-400 block mb-1">Custo material R$</label>
                                <input type="number" value={proc.custo_variavel}
                                  onChange={e => updateProc(cat.key, proc.id, 'custo_variavel', e.target.value)}
                                  placeholder="0" className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-rose-300" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button onClick={() => addProc(cat.key)} className="mt-3 flex items-center gap-1.5 text-sm text-rose-500 hover:text-rose-600 font-semibold transition-colors">
                      <Plus size={14} /> Outro procedimento
                    </button>
                  </div>
                ))}
              </div>

              {/* Contador flutuante */}
              <div className="bg-white/70 backdrop-blur-sm border border-rose-100 rounded-xl p-3 text-center">
                <span className="text-xs text-slate-400">Total adicionado: </span>
                <span className="text-sm font-bold text-rose-600">{totalProcs} procedimento{totalProcs !== 1 ? 's' : ''}</span>
              </div>

              <div className="flex gap-3">
                <button onClick={voltar} className="flex-1 py-3 border border-slate-200 text-slate-500 font-medium rounded-xl hover:bg-white transition-all flex items-center justify-center gap-1">
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button onClick={avancar} className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-rose-200 hover:shadow-xl transition-all flex items-center justify-center gap-1">
                  Próximo <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════ ETAPA 3 — DESPESAS ═══════════ */}
          {etapa === 3 && (
            <div className="space-y-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-rose-100 shadow-lg shadow-rose-100/30 p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md">
                    <Home size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Despesas fixas mensais</h2>
                    <p className="text-xs text-slate-400">Quanto você paga por mês só para o salão funcionar?</p>
                  </div>
                </div>

                {/* Despesas padrão com ícones */}
                <div className="space-y-3">
                  {despesas.map((d, idx) => {
                    const config = DESPESAS_PADRAO[idx];
                    const Icon = config?.icon || ShoppingBag;
                    const corMap = {
                      rose: 'from-rose-400 to-pink-500',
                      amber: 'from-amber-400 to-orange-500',
                      sky: 'from-sky-400 to-blue-500',
                      violet: 'from-violet-400 to-purple-500',
                      emerald: 'from-emerald-400 to-teal-500',
                    };
                    return (
                      <div key={d.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${corMap[config?.cor] || corMap.rose} flex items-center justify-center shadow-sm flex-shrink-0`}>
                          <Icon size={16} className="text-white" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 w-20 flex-shrink-0">{d.nome}</span>
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-2.5 text-xs text-slate-400">R$</span>
                          <input
                            type="number" value={d.valor}
                            onChange={e => updateDespesa(d.id, 'valor', e.target.value)}
                            placeholder="0,00"
                            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300 transition-all"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Despesas extras */}
                {despesasExtras.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    <span className="text-xs font-semibold text-slate-500">Outras despesas</span>
                    {despesasExtras.map(d => (
                      <div key={d.id} className="flex items-center gap-2 animate-fadeIn">
                        <input type="text" value={d.nome} onChange={e => updateDespesa(d.id, 'nome', e.target.value)}
                          placeholder="Descrição"
                          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300" />
                        <select value={d.tipo} onChange={e => updateDespesa(d.id, 'tipo', e.target.value)}
                          className="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white outline-none w-28">
                          {TIPOS_DESPESA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <div className="relative w-24">
                          <span className="absolute left-2 top-2.5 text-xs text-slate-400">R$</span>
                          <input type="number" value={d.valor} onChange={e => updateDespesa(d.id, 'valor', e.target.value)}
                            placeholder="0" className="w-full border border-slate-200 rounded-lg pl-7 pr-2 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300" />
                        </div>
                        <button onClick={() => removeDespesaExtra(d.id)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={addDespesaExtra} className="mt-3 flex items-center gap-1.5 text-sm text-rose-500 hover:text-rose-600 font-semibold transition-colors">
                  <Plus size={14} /> Adicionar outra despesa
                </button>
              </div>

              {/* Total */}
              <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl p-4 text-center shadow-lg shadow-rose-200">
                <p className="text-rose-100 text-xs mb-0.5">Total de despesas fixas</p>
                <p className="text-white text-2xl font-bold">R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="flex gap-3">
                <button onClick={voltar} className="flex-1 py-3 border border-slate-200 text-slate-500 font-medium rounded-xl hover:bg-white transition-all flex items-center justify-center gap-1">
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button onClick={avancar} className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-rose-200 hover:shadow-xl transition-all flex items-center justify-center gap-1">
                  Revisar tudo <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════ ETAPA 4 — REVISÃO ═══════════ */}
          {etapa === 4 && (
            <div className="space-y-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-rose-100 shadow-lg shadow-rose-100/30 p-5 sm:p-6">
                <div className="text-center mb-5">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200 animate-bounce-in">
                    <PartyPopper size={28} className="text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Tudo pronto, {nomeProprietaria || 'linda'}! 🎉</h2>
                  <p className="text-xs text-slate-400 mt-1">Confira o resumo antes de salvar</p>
                </div>

                <div className="space-y-3">
                  {/* Card Proprietária */}
                  {nomeProprietaria.trim() && (
                    <div className="flex items-center gap-3 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-3 border border-rose-100">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                        <Heart size={14} className="text-white" fill="white" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Proprietária</p>
                        <p className="text-sm font-bold text-slate-800">{nomeProprietaria.trim()}</p>
                      </div>
                    </div>
                  )}

                  {/* Card Equipe */}
                  <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-100">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <Crown size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Equipe</p>
                      <p className="text-sm font-bold text-slate-800">
                        {temFuncionarios ? `${totalFuncs} funcionário${totalFuncs !== 1 ? 's' : ''}` : 'Trabalha sozinha'}
                      </p>
                    </div>
                  </div>

                  {/* Card Procedimentos */}
                  <div className="flex items-center gap-3 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-3 border border-rose-100">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                      <Scissors size={14} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 font-medium">Procedimentos</p>
                      <p className="text-sm font-bold text-slate-800">{totalProcs} cadastrado{totalProcs !== 1 ? 's' : ''}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {CATEGORIAS.map(cat => {
                          const n = procedimentos[cat.key].filter(p => p.nome.trim() && p.preco_p).length;
                          return n > 0 ? (
                            <span key={cat.key} className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-medium">
                              {cat.emoji} {n}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Card Despesas */}
                  <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-100">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                      <Home size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Despesas fixas</p>
                      <p className="text-sm font-bold text-slate-800">
                        {totalDesps} despesa{totalDesps !== 1 ? 's' : ''} ≈ R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Card Maquininha */}
                  <div className="flex items-center gap-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-3 border border-violet-100">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                      <Zap size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Taxa maquininha</p>
                      <p className="text-sm font-bold text-slate-800">5% (automático)</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={voltar} disabled={salvando} className="flex-1 py-3 border border-slate-200 text-slate-500 font-medium rounded-xl hover:bg-white transition-all flex items-center justify-center gap-1">
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button
                  onClick={finalizar}
                  disabled={salvando}
                  className="flex-1 py-3.5 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white font-bold rounded-xl shadow-lg shadow-rose-200 hover:shadow-xl hover:shadow-rose-300 disabled:opacity-60 transition-all duration-300 animate-pulse-glow flex items-center justify-center gap-2"
                >
                  {salvando ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Abrir meu salão!
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
