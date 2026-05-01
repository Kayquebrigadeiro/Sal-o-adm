import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

// ─── Chips pré-definidos ───
const CHIPS_CABELO = [
  { nome: 'PROGRESSIVA', precoSugerido: 164.26 },
  { nome: 'CORTE', precoSugerido: 73.65 },
  { nome: 'COLORAÇÃO', precoSugerido: 136.00 },
  { nome: 'LUZES', precoSugerido: 206.11 },
  { nome: 'HIDRATAÇÃO', precoSugerido: 88.41 },
  { nome: 'BOTOX', precoSugerido: 122.24 },
  { nome: 'RECONSTRUÇÃO', precoSugerido: 116.56 },
  { nome: 'DETOX', precoSugerido: 101.02 },
  { nome: 'PLÁSTICA DOS FIOS', precoSugerido: 134.35 },
  { nome: 'KIT LAVATÓRIO', precoSugerido: 59.13 },
  { nome: 'NUTRIÇÃO', precoSugerido: 88.41 },
  { nome: 'RELAXAMENTO', precoSugerido: 78.21 },
];

const CHIPS_ESTETICA = [
  { nome: 'UNHAS GEL', precoSugerido: 56.11 },
  { nome: 'UNHAS TRADICIONAL', precoSugerido: 56.11 },
  { nome: 'SOBRANCELHA', precoSugerido: 54.00 },
  { nome: 'EXTENSÃO DE CÍLIOS', precoSugerido: 157.16 },
  { nome: 'DEPILAÇÃO', precoSugerido: 107.68 },
  { nome: 'BUSSO', precoSugerido: 57.16 },
];

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─── Componente principal ───
export default function WizardBemVinda() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [salaoId, setSalaoId] = useState(null);

  // Etapa 1
  const [nomeSalao, setNomeSalao] = useState('');
  const [nomeProprietaria, setNomeProprietaria] = useState('');
  const [telefone, setTelefone] = useState('');

  // Etapa 2
  const [qtdAtendimentos, setQtdAtendimentos] = useState(100);
  const [custos, setCustos] = useState([
    { descricao: 'ALUGUEL', tipo: 'ALUGUEL', valor: '' },
    { descricao: 'ENERGIA', tipo: 'ENERGIA', valor: '' },
    { descricao: 'ÁGUA', tipo: 'AGUA', valor: '' },
    { descricao: 'INTERNET', tipo: 'INTERNET', valor: '' },
  ]);

  // Etapa 3
  const [equipe, setEquipe] = useState([]);

  // Etapa 4
  const [servicosSelecionados, setServicosSelecionados] = useState([]);

  // ─── Buscar dados iniciais ───
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: perfil } = await supabase
        .from('perfis_acesso')
        .select('salao_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (!perfil?.salao_id) return;
      setSalaoId(perfil.salao_id);

      // Buscar dados existentes do salão (pode não ter todos os campos)
      const { data: salao } = await supabase
        .from('saloes')
        .select('nome, nome_proprietaria, telefone')
        .eq('id', perfil.salao_id)
        .maybeSingle();
      if (salao) {
        setNomeSalao(salao.nome || '');
        setNomeProprietaria(salao.nome_proprietaria || '');
        setTelefone(salao.telefone || '');
      }
    };
    init();
  }, []);

  // ─── Cálculos em tempo real ───
  const totalCustos = useMemo(() =>
    custos.reduce((a, c) => a + (Number(c.valor) || 0), 0), [custos]);

  const custoRateado = useMemo(() => {
    const qtd = Math.max(Number(qtdAtendimentos) || 1, 1);
    return Math.round((totalCustos / qtd) * 100) / 100;
  }, [totalCustos, qtdAtendimentos]);

  // ─── Handlers ───
  const addCusto = () => setCustos([...custos, { descricao: '', tipo: 'OUTRO', valor: '' }]);
  const removeCusto = (i) => setCustos(custos.filter((_, idx) => idx !== i));
  const updateCusto = (i, field, val) => {
    const c = [...custos]; c[i] = { ...c[i], [field]: val }; setCustos(c);
  };

  const addProfissional = () => setEquipe([...equipe, { nome: '', cargo: 'FUNCIONARIO' }]);
  const removeProfissional = (i) => setEquipe(equipe.filter((_, idx) => idx !== i));
  const updateProfissional = (i, field, val) => {
    const e = [...equipe]; e[i] = { ...e[i], [field]: val }; setEquipe(e);
  };

  const toggleServico = (chip, tipo) => {
    const exists = servicosSelecionados.find(s => s.nome === chip.nome);
    if (exists) {
      setServicosSelecionados(servicosSelecionados.filter(s => s.nome !== chip.nome));
    } else {
      setServicosSelecionados([...servicosSelecionados, {
        nome: chip.nome,
        precoP: chip.precoSugerido,
        tipo, // 'CABELO' ou 'ESTETICA'
      }]);
    }
  };

  const updatePrecoServico = (nome, valor) => {
    setServicosSelecionados(servicosSelecionados.map(s =>
      s.nome === nome ? { ...s, precoP: Number(valor) || 0 } : s
    ));
  };

  // ─── Validação por etapa ───
  const validarEtapa = () => {
    setErro('');
    if (step === 1 && !nomeSalao.trim()) { setErro('Nome do salão é obrigatório'); return false; }
    if (step === 2) {
      if ((Number(qtdAtendimentos) || 0) <= 0) { setErro('Informe quantos atendimentos você faz por mês'); return false; }
      const temCusto = custos.some(c => (Number(c.valor) || 0) > 0);
      if (!temCusto) { setErro('Informe pelo menos 1 custo fixo'); return false; }
    }
    // Etapa 3: dona já vem na lista, sempre válida
    // Etapa 4: opcional
    return true;
  };

  // ─── Salvar etapa por etapa ───
  const salvarEtapa = async () => {
    if (!validarEtapa()) return;
    setLoading(true);
    setErro('');
    try {
      if (step === 1) {
        const { error } = await supabase.from('saloes')
          .update({ nome: nomeSalao.trim(), nome_proprietaria: nomeProprietaria.trim(), telefone: telefone.trim() })
          .eq('id', salaoId);
        if (error) throw error;
      }

      if (step === 2) {
        // Limpar custos antigos do wizard e inserir novos
        await supabase.from('custos_fixos_itens').delete().eq('salao_id', salaoId);
        const inserts = custos
          .filter(c => c.descricao.trim() && (Number(c.valor) || 0) > 0)
          .map(c => ({
            salao_id: salaoId,
            descricao: c.descricao.trim().toUpperCase(),
            tipo: c.tipo,
            valor: Number(c.valor) || 0,
            valor_mensal: Number(c.valor) || 0,
          }));
        if (inserts.length > 0) {
          const { error: errCusto } = await supabase.from('custos_fixos_itens').insert(inserts);
          if (errCusto) throw errCusto;
        }
        // Upsert configuracoes (pode não existir ainda)
        const { error: errCfg } = await supabase.from('configuracoes')
          .upsert({
            salao_id: salaoId,
            qtd_atendimentos_mes: Number(qtdAtendimentos),
            custo_fixo_por_atendimento: custoRateado,
          }, { onConflict: 'salao_id' });
        if (errCfg) throw errCfg;
      }

      if (step === 3) {
        // Limpar profissionais antigos e inserir novos
        await supabase.from('profissionais').delete().eq('salao_id', salaoId);
        const profs = [
          { salao_id: salaoId, nome: (nomeProprietaria || nomeSalao).trim().toUpperCase(), cargo: 'PROPRIETARIO', salario_fixo: 0 },
          ...equipe
            .filter(e => e.nome.trim())
            .map(e => ({ salao_id: salaoId, nome: e.nome.trim().toUpperCase(), cargo: e.cargo, salario_fixo: 0 })),
        ];
        const { error } = await supabase.from('profissionais').insert(profs);
        if (error) throw error;
      }

      if (step === 4) {
        // Inserir serviços selecionados (se houver)
        if (servicosSelecionados.length > 0) {
          const servInserts = servicosSelecionados.map(s => ({
            salao_id: salaoId,
            nome: s.nome,
            categoria: s.tipo === 'CABELO' ? 'SERVICO_CABELO' : 'SERVICO_ESTETICA',
            requer_comprimento: s.tipo === 'CABELO',
            preco_p: s.precoP,
            preco_m: s.tipo === 'CABELO' ? Number((s.precoP * 1.20).toFixed(2)) : null,
            preco_g: s.tipo === 'CABELO' ? Number((s.precoP * 1.30).toFixed(2)) : null,
            ganho_liquido_desejado: 0,
            custo_variavel: 0,
            ativo: true,
          }));
          const { error } = await supabase.from('procedimentos').insert(servInserts);
          if (error) throw error;
        }
        // FINALIZAR — marcar como configurado
        const { error: errFinal } = await supabase.from('saloes')
          .update({ configurado: true })
          .eq('id', salaoId);
        if (errFinal) throw errFinal;

        window.location.reload();
        return;
      }

      setStep(step + 1);
    } catch (err) {
      console.error('[Wizard] Erro:', err);
      setErro('Erro ao salvar: ' + (err.message || 'Tente novamente'));
    } finally {
      setLoading(false);
    }
  };

  // ─── Progress dots ───
  const Dots = () => (
    <div className="flex items-center gap-2">
      {[1,2,3,4].map(i => (
        <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
          i < step ? 'bg-emerald-400' : i === step ? 'bg-rose-400 scale-125 shadow-lg shadow-rose-400/40' : 'bg-white/20'
        }`} />
      ))}
    </div>
  );

  const STEP_TITLES = [
    '', '✨ Vamos começar!', '💰 Quanto custa manter o salão?',
    '👥 Quem trabalha no seu salão?', '✂️ O que você oferece?'
  ];

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-6 animate-fadeIn">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-rose-500/20">
            <span className="text-2xl">✂️</span>
          </div>
          <h1 className="text-2xl font-black text-white">Configuração do seu Salão</h1>
          <p className="text-slate-400 text-sm mt-1">Etapa {step} de 4 — {STEP_TITLES[step]}</p>
          <div className="flex justify-center mt-4"><Dots /></div>
        </div>

        {/* Card */}
        <div className="bg-white/[0.07] backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-wizard-slide">
          <div className="p-6 space-y-5">

            {/* ═══ ETAPA 1 — Identidade ═══ */}
            {step === 1 && (<>
              <Field label="Como se chama seu salão?" value={nomeSalao} onChange={setNomeSalao} placeholder="SALÃO DA MARIA" required />
              <Field label="Qual é o seu nome?" value={nomeProprietaria} onChange={setNomeProprietaria} placeholder="MARIA SILVA" />
              <Field label="WhatsApp do salão (opcional)" value={telefone} onChange={setTelefone} placeholder="(11) 99999-9999" />
            </>)}

            {/* ═══ ETAPA 2 — Custos Fixos ═══ */}
            {step === 2 && (<>
              <Field label="Quantos atendimentos você faz por mês?" type="number" value={qtdAtendimentos} onChange={v => setQtdAtendimentos(v)} placeholder="100" required />

              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Seus custos mensais:</p>
              {custos.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className="flex-1 bg-white/10 border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400"
                    value={c.descricao} onChange={e => updateCusto(i, 'descricao', e.target.value.toUpperCase())} placeholder="Descrição" />
                  <div className="relative w-28">
                    <span className="absolute left-2 top-2 text-slate-500 text-sm">R$</span>
                    <input type="number" className="w-full bg-white/10 border border-white/10 text-white rounded-lg pl-8 pr-2 py-2 text-sm outline-none focus:border-rose-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={c.valor} onChange={e => updateCusto(i, 'valor', e.target.value)} placeholder="0,00" />
                  </div>
                  {custos.length > 1 && (
                    <button onClick={() => removeCusto(i)} className="text-red-400 hover:text-red-300 text-lg px-1">✕</button>
                  )}
                </div>
              ))}
              <button onClick={addCusto} className="text-sm text-rose-400 font-bold hover:text-rose-300">+ Adicionar outro custo</button>

              {/* Resumo em tempo real */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-xs font-bold text-emerald-400 mb-1">💡 Cada atendimento precisa gerar:</p>
                <p className="text-white font-black text-lg">
                  {fmt(totalCustos)} ÷ {qtdAtendimentos || 1} = <span className="text-emerald-400">{fmt(custoRateado)}</span>/atend.
                </p>
              </div>
            </>)}

            {/* ═══ ETAPA 3 — Equipe ═══ */}
            {step === 3 && (<>
              <p className="text-sm text-slate-300">Você (Proprietária) já está na lista! 👑</p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
                <span className="text-lg">👑</span>
                <div>
                  <p className="text-white font-bold text-sm">{(nomeProprietaria || nomeSalao).toUpperCase()}</p>
                  <p className="text-amber-300 text-xs">Proprietária</p>
                </div>
              </div>

              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">Tem mais alguém na equipe?</p>
              {equipe.map((e, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input className="flex-1 bg-white/10 border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400"
                      value={e.nome} onChange={ev => updateProfissional(i, 'nome', ev.target.value)} placeholder="Nome" />
                    <select className="bg-white/10 border border-white/10 text-white rounded-lg px-2 py-2 text-sm outline-none"
                      value={e.cargo} onChange={ev => updateProfissional(i, 'cargo', ev.target.value)}>
                      <option value="FUNCIONARIO">Funcionária</option>
                      <option value="PROPRIETARIO">Proprietária</option>
                    </select>
                    <button onClick={() => removeProfissional(i)} className="text-red-400 hover:text-red-300 text-sm">✕ Remover</button>
                  </div>
                </div>
              ))}
              <button onClick={addProfissional} className="text-sm text-rose-400 font-bold hover:text-rose-300">+ Adicionar profissional</button>
            </>)}

            {/* ═══ ETAPA 4 — Serviços (opcional) ═══ */}
            {step === 4 && (<>
              <p className="text-xs text-slate-400">Clique para adicionar (pode adicionar mais depois em Precificação):</p>

              <p className="text-xs font-bold text-rose-300 uppercase tracking-wider">Cabelo:</p>
              <div className="flex flex-wrap gap-2">
                {CHIPS_CABELO.map(chip => {
                  const sel = servicosSelecionados.find(s => s.nome === chip.nome);
                  return (
                    <button key={chip.nome} onClick={() => toggleServico(chip, 'CABELO')}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        sel ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-chip-pop'
                             : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      }`}>
                      {chip.nome}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs font-bold text-amber-300 uppercase tracking-wider mt-2">Estética:</p>
              <div className="flex flex-wrap gap-2">
                {CHIPS_ESTETICA.map(chip => {
                  const sel = servicosSelecionados.find(s => s.nome === chip.nome);
                  return (
                    <button key={chip.nome} onClick={() => toggleServico(chip, 'ESTETICA')}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        sel ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 animate-chip-pop'
                             : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      }`}>
                      {chip.nome}
                    </button>
                  );
                })}
              </div>

              {/* Editar preços dos selecionados */}
              {servicosSelecionados.length > 0 && (
                <div className="space-y-3 mt-2">
                  {servicosSelecionados.map(s => (
                    <div key={s.nome} className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-white font-bold text-xs mb-2">{s.tipo === 'CABELO' ? '✂️' : '💅'} {s.nome} — Qual o preço{s.tipo === 'CABELO' ? ' do Curto (P)' : ''}?</p>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <span className="absolute left-2 top-2 text-slate-500 text-sm">R$</span>
                          <input type="number" step="0.01" className="w-28 bg-white/10 border border-white/10 text-white rounded-lg pl-8 pr-2 py-2 text-sm outline-none focus:border-rose-400 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={s.precoP} onChange={e => updatePrecoServico(s.nome, e.target.value)} />
                        </div>
                        {s.tipo === 'CABELO' && (
                          <div className="text-xs text-slate-400">
                            <span>Médio: <b className="text-slate-300">{fmt(s.precoP * 1.20)}</b> (+20%)</span>
                            <span className="ml-2">Longo: <b className="text-slate-300">{fmt(s.precoP * 1.30)}</b> (+30%)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {servicosSelecionados.length === 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mt-2">
                  <p className="text-blue-300 text-xs">💡 Você pode adicionar seus serviços depois em <b>Precificação</b>.</p>
                </div>
              )}
            </>)}

          </div>

          {/* Erro */}
          {erro && (
            <div className="mx-6 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-xs font-bold">⚠️ {erro}</p>
            </div>
          )}

          {/* Navegação */}
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dots />
            </div>
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button onClick={() => { setStep(step - 1); setErro(''); }}
                  className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors">
                  ← Voltar
                </button>
              )}
              <button onClick={salvarEtapa} disabled={loading}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg disabled:opacity-50 ${
                  step === 4
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30 hover:from-emerald-600 hover:to-emerald-700'
                    : 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-rose-500/30 hover:from-rose-600 hover:to-amber-600'
                }`}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando...
                  </span>
                ) : step === 4 ? 'Concluir ✓' : 'Próximo →'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Componente de campo reutilizável ───
function Field({ label, value, onChange, placeholder, type = 'text', required }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/10 border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-rose-400 focus:bg-white/[0.12] transition-all placeholder:text-slate-600 font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
    </div>
  );
}
