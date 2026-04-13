import { useState } from 'react';
import { supabase } from '../supabaseClient';

const DIAS_SEMANA = [
  { key: 'seg', label: 'Segunda' },
  { key: 'ter', label: 'Terça' },
  { key: 'qua', label: 'Quarta' },
  { key: 'qui', label: 'Quinta' },
  { key: 'sex', label: 'Sexta' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
];

const CATEGORIAS = [
  { key: 'cabelo',   label: 'Cabelos',  comTamanho: true },
  { key: 'unhas',    label: 'Unhas',    comTamanho: false },
  { key: 'estetica', label: 'Estética', comTamanho: false },
  { key: 'outros',   label: 'Outros',   comTamanho: false },
];

const DESPESAS_PADRAO = ['Aluguel', 'Água', 'Luz', 'Internet', 'Produtos'];

const uid = () => Math.random().toString(36).substr(2, 9);

const procVazio = (comTamanho) =>
  comTamanho
    ? { id: uid(), nome: '', valor_curto: '', valor_medio: '', valor_longo: '' }
    : { id: uid(), nome: '', valor: '' };

const Toggle = ({ value, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-emerald-500' : 'bg-slate-300'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
  </button>
);

export default function WizardPrimeiroAcesso({ salaoId }) {
  const [etapa, setEtapa]     = useState(1);
  const [salvando, setSalvando] = useState(false);

  // ── Etapa 1: Equipe ──────────────────────────────────────────────────────
  const [nomeProprietaria, setNomeProprietaria] = useState('');
  const [temFuncionarios, setTemFuncionarios]   = useState(false);
  const [funcionarios, setFuncionarios] = useState([
    { id: uid(), nome: '', cargo: 'FUNCIONARIO', comissao: '' },
  ]);

  const addFunc    = () => setFuncionarios(f => [...f, { id: uid(), nome: '', cargo: 'FUNCIONARIO', comissao: '' }]);
  const removeFunc = (id) => setFuncionarios(f => f.filter(x => x.id !== id));
  const updateFunc = (id, k, v) => setFuncionarios(f => f.map(x => x.id === id ? { ...x, [k]: v } : x));

  // ── Etapa 2: Horário ─────────────────────────────────────────────────────
  const [horario, setHorario] = useState(
    Object.fromEntries(
      DIAS_SEMANA.map(d => [d.key, { aberto: d.key !== 'dom', abertura: '08:00', fechamento: '18:00' }])
    )
  );
  const updateHorario = (dia, k, v) => setHorario(h => ({ ...h, [dia]: { ...h[dia], [k]: v } }));

  // ── Etapa 3: Procedimentos ───────────────────────────────────────────────
  const [procedimentos, setProcedimentos] = useState(
    Object.fromEntries(CATEGORIAS.map(c => [c.key, [procVazio(c.comTamanho)]]))
  );

  const addProc    = (cat) => setProcedimentos(p => ({ ...p, [cat]: [...p[cat], procVazio(CATEGORIAS.find(c => c.key === cat).comTamanho)] }));
  const removeProc = (cat, id) => setProcedimentos(p => ({ ...p, [cat]: p[cat].filter(x => x.id !== id) }));
  const updateProc = (cat, id, k, v) => setProcedimentos(p => ({ ...p, [cat]: p[cat].map(x => x.id === id ? { ...x, [k]: v } : x) }));

  // ── Etapa 4: Despesas ────────────────────────────────────────────────────
  const [despesas, setDespesas] = useState(DESPESAS_PADRAO.map(nome => ({ id: uid(), nome, valor: '' })));

  const addDespesa    = () => setDespesas(d => [...d, { id: uid(), nome: '', valor: '' }]);
  const removeDespesa = (id) => setDespesas(d => d.filter(x => x.id !== id));
  const updateDespesa = (id, k, v) => setDespesas(d => d.map(x => x.id === id ? { ...x, [k]: v } : x));

  // ── Finalizar ─────────────────────────────────────────────────────────────
  const finalizar = async () => {
    setSalvando(true);
    try {
      // 1. Marca salão como configurado + horário + nome proprietária
      const { error: salaoErr } = await supabase
        .from('saloes')
        .update({ configurado: true, nome_proprietaria: nomeProprietaria.trim(), horario })
        .eq('id', salaoId);
      if (salaoErr) throw salaoErr;

      // 2. Profissionais
      if (temFuncionarios) {
        const validos = funcionarios.filter(f => f.nome.trim());
        if (validos.length > 0) {
          const { error } = await supabase.from('profissionais').insert(
            validos.map(f => ({
              salao_id:             salaoId,
              nome:                 f.nome.trim(),
              cargo:                f.cargo,
              comissao_percentual:  Number(f.comissao) || 0,
              ativo:                true,
            }))
          );
          if (error) throw error;
        }
      }

      // 3. Procedimentos
      const rows = [];

      // Cabelos — 3 variações de tamanho viram 3 linhas separadas
      procedimentos.cabelo
        .filter(p => p.nome.trim())
        .forEach(p => {
          if (p.valor_curto) rows.push({ salao_id: salaoId, nome: `${p.nome} (Curto)`,  valor: Number(p.valor_curto), categoria: 'CABELO' });
          if (p.valor_medio) rows.push({ salao_id: salaoId, nome: `${p.nome} (Médio)`,  valor: Number(p.valor_medio), categoria: 'CABELO' });
          if (p.valor_longo) rows.push({ salao_id: salaoId, nome: `${p.nome} (Longo)`,  valor: Number(p.valor_longo), categoria: 'CABELO' });
        });

      // Demais categorias
      ['unhas', 'estetica', 'outros'].forEach(cat => {
        procedimentos[cat]
          .filter(p => p.nome.trim() && p.valor)
          .forEach(p => {
            rows.push({ salao_id: salaoId, nome: p.nome.trim(), valor: Number(p.valor), categoria: cat.toUpperCase() });
          });
      });

      if (rows.length > 0) {
        const { error } = await supabase.from('procedimentos').insert(rows);
        if (error) throw error;
      }

      // 4. Despesas fixas
      const despesasValidas = despesas.filter(d => d.nome.trim() && d.valor);
      if (despesasValidas.length > 0) {
        const hoje = new Date().toISOString().split('T')[0];
        const { error } = await supabase.from('despesas').insert(
          despesasValidas.map(d => ({
            salao_id:    salaoId,
            descricao:   d.nome.trim(),
            valor:       Number(d.valor),
            valor_pago:  0,
            data:        hoje,
            tipo:        'FIXA',
          }))
        );
        if (error) throw error;
      }

      // Recarrega — App.jsx vai detectar configurado=true e redirecionar para a agenda
      window.location.reload();

    } catch (err) {
      alert('Erro ao salvar configurações: ' + err.message);
      setSalvando(false);
    }
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-2xl">

        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Configuração do Salão</h1>
          <p className="text-sm text-slate-500 mt-1">
            Preencha tudo agora e o salão já abre pronto. Você pode editar qualquer informação depois.
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-8">
          {[1,2,3,4].map(n => (
            <div key={n} className={`h-1 flex-1 rounded-full transition-all duration-300 ${etapa >= n ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          ))}
        </div>

        {/* ═══════════════════════════════ ETAPA 1 ═══════════════════════════════ */}
        {etapa === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800">Sua equipe</h2>

            {/* Nome da proprietária */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Proprietária</label>
              <input
                type="text"
                value={nomeProprietaria}
                onChange={e => setNomeProprietaria(e.target.value)}
                placeholder="Seu nome completo"
                className="mt-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Funcionários */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Tem funcionários?</p>
                  <p className="text-xs text-slate-400">Funcionários ou sócios que trabalham no salão</p>
                </div>
                <Toggle value={temFuncionarios} onChange={setTemFuncionarios} />
              </div>

              {temFuncionarios && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  {/* Labels */}
                  <div className="flex gap-2 text-xs text-slate-400">
                    <span className="flex-1">Nome</span>
                    <span className="w-32">Tipo</span>
                    <span className="w-20 text-center">Comissão %</span>
                    <span className="w-5" />
                  </div>

                  {funcionarios.map((f) => (
                    <div key={f.id} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={f.nome}
                        onChange={e => updateFunc(f.id, 'nome', e.target.value)}
                        placeholder="Nome do funcionário"
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <select
                        value={f.cargo}
                        onChange={e => updateFunc(f.id, 'cargo', e.target.value)}
                        className="w-32 border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white outline-none"
                      >
                        <option value="FUNCIONARIO">Funcionário</option>
                        <option value="SOCIO">Sócio</option>
                      </select>
                      <input
                        type="number"
                        value={f.comissao}
                        onChange={e => updateFunc(f.id, 'comissao', e.target.value)}
                        placeholder="0"
                        className="w-20 border border-slate-300 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {funcionarios.length > 1 && (
                        <button onClick={() => removeFunc(f.id)} className="w-5 text-red-400 hover:text-red-600 text-xl leading-none">×</button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={addFunc}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    + Adicionar funcionário
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (!nomeProprietaria.trim()) return alert('Informe seu nome.');
                setEtapa(2);
              }}
              className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
            >
              Próximo →
            </button>
          </div>
        )}

        {/* ═══════════════════════════════ ETAPA 2 ═══════════════════════════════ */}
        {etapa === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800">Horário de funcionamento</h2>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {DIAS_SEMANA.map((dia, i) => (
                <div
                  key={dia.key}
                  className={`flex items-center gap-3 px-4 py-3 ${i < DIAS_SEMANA.length - 1 ? 'border-b border-slate-100' : ''}`}
                >
                  <Toggle
                    value={horario[dia.key].aberto}
                    onChange={v => updateHorario(dia.key, 'aberto', v)}
                  />
                  <span className={`text-sm w-16 font-medium ${horario[dia.key].aberto ? 'text-slate-700' : 'text-slate-400'}`}>
                    {dia.label}
                  </span>
                  {horario[dia.key].aberto ? (
                    <div className="flex items-center gap-2 ml-auto">
                      <input
                        type="time"
                        value={horario[dia.key].abertura}
                        onChange={e => updateHorario(dia.key, 'abertura', e.target.value)}
                        className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-slate-400 text-xs">até</span>
                      <input
                        type="time"
                        value={horario[dia.key].fechamento}
                        onChange={e => updateHorario(dia.key, 'fechamento', e.target.value)}
                        className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 ml-auto italic">Fechado</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEtapa(1)} className="flex-1 py-3 border border-slate-300 text-slate-600 font-medium rounded-xl hover:bg-slate-50">← Voltar</button>
              <button onClick={() => setEtapa(3)} className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600">Próximo →</button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════ ETAPA 3 ═══════════════════════════════ */}
        {etapa === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Procedimentos e valores</h2>
              <p className="text-xs text-slate-400 mt-0.5">Cabelos têm preço por tamanho. As demais categorias têm preço único.</p>
            </div>

            {CATEGORIAS.map(cat => (
              <div key={cat.key} className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">{cat.label}</h3>

                {/* Labels das colunas para cabelo */}
                {cat.comTamanho && (
                  <div className="flex gap-2 mb-1.5 text-xs text-slate-400">
                    <span className="flex-1">Nome do procedimento</span>
                    <span className="w-[72px] text-center">Curto (R$)</span>
                    <span className="w-[72px] text-center">Médio (R$)</span>
                    <span className="w-[72px] text-center">Longo (R$)</span>
                    <span className="w-5" />
                  </div>
                )}

                <div className="space-y-2">
                  {procedimentos[cat.key].map((proc) => (
                    <div key={proc.id} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={proc.nome}
                        onChange={e => updateProc(cat.key, proc.id, 'nome', e.target.value)}
                        placeholder="Ex: Corte simples"
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {cat.comTamanho ? (
                        <>
                          <input type="number" value={proc.valor_curto} onChange={e => updateProc(cat.key, proc.id, 'valor_curto', e.target.value)} placeholder="0" className="w-[72px] border border-slate-300 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-500" />
                          <input type="number" value={proc.valor_medio} onChange={e => updateProc(cat.key, proc.id, 'valor_medio', e.target.value)} placeholder="0" className="w-[72px] border border-slate-300 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-500" />
                          <input type="number" value={proc.valor_longo} onChange={e => updateProc(cat.key, proc.id, 'valor_longo', e.target.value)} placeholder="0" className="w-[72px] border border-slate-300 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-500" />
                        </>
                      ) : (
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-slate-400 text-sm">R$</span>
                          <input type="number" value={proc.valor} onChange={e => updateProc(cat.key, proc.id, 'valor', e.target.value)} placeholder="0" className="w-28 border border-slate-300 rounded-lg pl-7 pr-2 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                      )}
                      {procedimentos[cat.key].length > 1 && (
                        <button onClick={() => removeProc(cat.key, proc.id)} className="w-5 text-red-400 hover:text-red-600 text-xl leading-none">×</button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => addProc(cat.key)}
                  className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  + Adicionar {cat.label.toLowerCase()}
                </button>
              </div>
            ))}

            <div className="flex gap-3">
              <button onClick={() => setEtapa(2)} className="flex-1 py-3 border border-slate-300 text-slate-600 font-medium rounded-xl hover:bg-slate-50">← Voltar</button>
              <button onClick={() => setEtapa(4)} className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600">Próximo →</button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════ ETAPA 4 ═══════════════════════════════ */}
        {etapa === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Despesas fixas mensais</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Taxa de maquininha: <strong>5% fixo</strong> sobre pagamentos em cartão — já inclusa nos cálculos.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex gap-2 text-xs text-slate-400 mb-1">
                <span className="flex-1">Despesa</span>
                <span className="w-32">Valor mensal (R$)</span>
                <span className="w-5" />
              </div>

              {despesas.map((d) => (
                <div key={d.id} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={d.nome}
                    onChange={e => updateDespesa(d.id, 'nome', e.target.value)}
                    placeholder="Ex: Aluguel"
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 text-sm">R$</span>
                    <input
                      type="number"
                      value={d.valor}
                      onChange={e => updateDespesa(d.id, 'valor', e.target.value)}
                      placeholder="0,00"
                      className="w-32 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <button onClick={() => removeDespesa(d.id)} className="w-5 text-red-400 hover:text-red-600 text-xl leading-none">×</button>
                </div>
              ))}

              <button onClick={addDespesa} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                + Adicionar despesa
              </button>
            </div>

            {/* Resumo antes de finalizar */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 space-y-1">
              <p className="font-medium text-slate-700 text-sm mb-2">Resumo do que será salvo</p>
              <p>✓ Proprietária: <strong className="text-slate-700">{nomeProprietaria}</strong></p>
              {temFuncionarios && <p>✓ {funcionarios.filter(f => f.nome.trim()).length} funcionário(s) cadastrado(s)</p>}
              <p>✓ Horário: {Object.values(horario).filter(h => h.aberto).length} dias por semana</p>
              <p>✓ {[
                ...procedimentos.cabelo.filter(p => p.nome.trim()),
                ...procedimentos.unhas.filter(p => p.nome.trim()),
                ...procedimentos.estetica.filter(p => p.nome.trim()),
                ...procedimentos.outros.filter(p => p.nome.trim()),
              ].length} procedimento(s) configurado(s)</p>
              <p>✓ {despesas.filter(d => d.nome.trim() && d.valor).length} despesa(s) fixa(s)</p>
              <p>✓ Taxa maquininha: 5% fixo</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEtapa(3)} className="flex-1 py-3 border border-slate-300 text-slate-600 font-medium rounded-xl hover:bg-slate-50" disabled={salvando}>
                ← Voltar
              </button>
              <button
                onClick={finalizar}
                disabled={salvando}
                className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 disabled:opacity-60 transition-colors"
              >
                {salvando ? 'Salvando...' : 'Abrir meu salão ✓'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
