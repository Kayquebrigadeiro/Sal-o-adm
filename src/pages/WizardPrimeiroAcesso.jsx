import { useState } from 'react';
import { supabase } from '../supabaseClient';

// ─── Categorias alinhadas com categoria_enum do banco ───────────────────────
const CATEGORIAS = [
  { key: 'CABELO',       label: 'Cabelos',     comTamanho: true  },
  { key: 'UNHAS',        label: 'Unhas',       comTamanho: false },
  { key: 'SOBRANCELHAS', label: 'Sobrancelhas',comTamanho: false },
  { key: 'CILIOS',       label: 'Cílios',      comTamanho: false },
  { key: 'OUTRO',        label: 'Outros',      comTamanho: false },
];

// ─── Despesas padrão mapeadas para tipo_despesa_enum ────────────────────────
const DESPESAS_PADRAO = [
  { nome: 'Aluguel',  tipo: 'ALUGUEL'  },
  { nome: 'Água',     tipo: 'AGUA'     },
  { nome: 'Luz',      tipo: 'ENERGIA'  },
  { nome: 'Internet', tipo: 'INTERNET' },
  { nome: 'Produtos', tipo: 'MATERIAL' },
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
  const [temFuncionarios, setTemFuncionarios] = useState(false);
  const [funcionarios, setFuncionarios] = useState([
    { id: uid(), nome: '', cargo: 'FUNCIONARIO', salario_fixo: '' },
  ]);

  const addFunc    = () => setFuncionarios(f => [...f, { id: uid(), nome: '', cargo: 'FUNCIONARIO', salario_fixo: '' }]);
  const removeFunc = (id) => setFuncionarios(f => f.filter(x => x.id !== id));
  const updateFunc = (id, k, v) => setFuncionarios(f => f.map(x => x.id === id ? { ...x, [k]: v } : x));

  // ── Etapa 2: Procedimentos ───────────────────────────────────────────────
  const [procedimentos, setProcedimentos] = useState(
    Object.fromEntries(CATEGORIAS.map(c => [c.key, [procVazio(c.comTamanho)]]))
  );

  const addProc = (cat) => {
    const comTamanho = CATEGORIAS.find(c => c.key === cat).comTamanho;
    setProcedimentos(p => ({ ...p, [cat]: [...p[cat], procVazio(comTamanho)] }));
  };
  const removeProc = (cat, id) => setProcedimentos(p => ({ ...p, [cat]: p[cat].filter(x => x.id !== id) }));
  const updateProc = (cat, id, k, v) => setProcedimentos(p => ({
    ...p, [cat]: p[cat].map(x => x.id === id ? { ...x, [k]: v } : x)
  }));

  // ── Etapa 3: Despesas ────────────────────────────────────────────────────
  const [despesas, setDespesas] = useState(
    DESPESAS_PADRAO.map(d => ({ id: uid(), nome: d.nome, tipo: d.tipo, valor: '' }))
  );

  const addDespesa    = () => setDespesas(d => [...d, { id: uid(), nome: '', tipo: 'OUTRO', valor: '' }]);
  const removeDespesa = (id) => setDespesas(d => d.filter(x => x.id !== id));
  const updateDespesa = (id, k, v) => setDespesas(d => d.map(x => x.id === id ? { ...x, [k]: v } : x));

  // ── Finalizar ─────────────────────────────────────────────────────────────
  const finalizar = async () => {
    setSalvando(true);
    try {
      // 1. Marca salão como configurado
      const { error: salaoErr } = await supabase
        .from('saloes')
        .update({ configurado: true })
        .eq('id', salaoId);
      if (salaoErr) throw salaoErr;

      // 2. Profissionais — salario_fixo conforme schema
      if (temFuncionarios) {
        const validos = funcionarios.filter(f => f.nome.trim());
        if (validos.length > 0) {
          const { error } = await supabase.from('profissionais').insert(
            validos.map(f => ({
              salao_id:    salaoId,
              nome:        f.nome.trim(),
              cargo:       f.cargo,
              salario_fixo: Number(f.salario_fixo) || 0,
              ativo:       true,
            }))
          );
          if (error) throw error;
        }
      }

      // 3. Procedimentos — uma linha por procedimento com preco_p / preco_m / preco_g
      const rows = [];
      CATEGORIAS.forEach(cat => {
        procedimentos[cat.key]
          .filter(p => p.nome.trim() && p.preco_p)
          .forEach(p => {
            rows.push({
              salao_id:                salaoId,
              nome:                    p.nome.trim(),
              categoria:               cat.key,
              requer_comprimento:      cat.comTamanho,
              preco_p:                 Number(p.preco_p) || null,
              preco_m:                 cat.comTamanho ? (Number(p.preco_m) || null) : null,
              preco_g:                 cat.comTamanho ? (Number(p.preco_g) || null) : null,
              porcentagem_profissional: Number(p.porcentagem_profissional) || 40,
              custo_variavel:          Number(p.custo_variavel) || 0,
              ativo:                   true,
            });
          });
      });

      if (rows.length > 0) {
        const { error } = await supabase.from('procedimentos').insert(rows);
        if (error) throw error;
      }

      // 4. Despesas — tipo como tipo_despesa_enum
      const despesasValidas = despesas.filter(d => d.nome.trim() && d.valor);
      if (despesasValidas.length > 0) {
        const hoje = new Date().toISOString().split('T')[0];
        const { error } = await supabase.from('despesas').insert(
          despesasValidas.map(d => ({
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

      // configuracoes (taxa 5%) já criada automaticamente pelo trigger handle_new_user_salao

      window.location.reload();

    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-2xl">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Configure seu salão</h1>
          <p className="text-sm text-slate-500 mt-1">Preencha as informações abaixo. Tudo pode ser editado depois em Configurações.</p>
        </div>

        {/* Barra de progresso */}
        <div className="flex gap-1.5 mb-3">
          {[1,2,3].map(n => (
            <div key={n} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${etapa >= n ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          ))}
        </div>
        <div className="flex mb-6">
          {['1. Equipe', '2. Procedimentos', '3. Despesas'].map((l, i) => (
            <span key={i} className={`flex-1 text-xs ${etapa === i + 1 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>{l}</span>
          ))}
        </div>

        {/* ═══════════════ ETAPA 1 — EQUIPE ═══════════════ */}
        {etapa === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800">Sua equipe</h2>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Tem funcionários?</p>
                  <p className="text-xs text-slate-400">Pessoas que trabalham no salão além de você</p>
                </div>
                <Toggle value={temFuncionarios} onChange={setTemFuncionarios} />
              </div>

              {temFuncionarios && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-12 gap-2 text-xs text-slate-400">
                    <span className="col-span-5">Nome</span>
                    <span className="col-span-3">Cargo</span>
                    <span className="col-span-3 text-center">Salário fixo R$</span>
                    <span className="col-span-1" />
                  </div>
                  {funcionarios.map(f => (
                    <div key={f.id} className="grid grid-cols-12 gap-2 items-center">
                      <input type="text" value={f.nome} onChange={e => updateFunc(f.id, 'nome', e.target.value)} placeholder="Nome" className="col-span-5 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                      <select value={f.cargo} onChange={e => updateFunc(f.id, 'cargo', e.target.value)} className="col-span-3 border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white outline-none">
                        <option value="FUNCIONARIO">Funcionário</option>
                        <option value="PROPRIETARIO">Sócio/Prop.</option>
                      </select>
                      <input type="number" value={f.salario_fixo} onChange={e => updateFunc(f.id, 'salario_fixo', e.target.value)} placeholder="0,00" className="col-span-3 border border-slate-300 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-500" />
                      {funcionarios.length > 1 && (
                        <button onClick={() => removeFunc(f.id)} className="col-span-1 text-red-400 hover:text-red-600 text-xl text-center">×</button>
                      )}
                    </div>
                  ))}
                  <button onClick={addFunc} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">+ Adicionar funcionário</button>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <strong>Taxa de maquininha:</strong> 5% fixo sobre pagamentos em cartão — configurada automaticamente.
            </div>

            <button onClick={() => setEtapa(2)} className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600">
              Próximo →
            </button>
          </div>
        )}

        {/* ═══════════════ ETAPA 2 — PROCEDIMENTOS ═══════════════ */}
        {etapa === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Procedimentos e preços</h2>
              <p className="text-xs text-slate-400 mt-0.5">Cabelos: preço por tamanho P/M/G. Demais categorias: preço único. Comissão = % sobre valor cobrado.</p>
            </div>

            {CATEGORIAS.map(cat => (
              <div key={cat.key} className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">{cat.label}</h3>

                <div className="grid grid-cols-12 gap-2 mb-1.5 text-xs text-slate-400">
                  <span className="col-span-4">Procedimento</span>
                  {cat.comTamanho ? (
                    <>
                      <span className="col-span-2 text-center">Curto R$</span>
                      <span className="col-span-2 text-center">Médio R$</span>
                      <span className="col-span-2 text-center">Longo R$</span>
                    </>
                  ) : (
                    <span className="col-span-6 text-center">Preço R$</span>
                  )}
                  <span className="col-span-2 text-center">Comissão%</span>
                </div>

                <div className="space-y-2">
                  {procedimentos[cat.key].map(proc => (
                    <div key={proc.id} className="grid grid-cols-12 gap-2 items-center">
                      <input type="text" value={proc.nome} onChange={e => updateProc(cat.key, proc.id, 'nome', e.target.value)} placeholder="Nome" className="col-span-4 border border-slate-300 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                      {cat.comTamanho ? (
                        <>
                          <input type="number" value={proc.preco_p} onChange={e => updateProc(cat.key, proc.id, 'preco_p', e.target.value)} placeholder="0" className="col-span-2 border border-slate-300 rounded-lg px-1 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-500" />
                          <input type="number" value={proc.preco_m} onChange={e => updateProc(cat.key, proc.id, 'preco_m', e.target.value)} placeholder="0" className="col-span-2 border border-slate-300 rounded-lg px-1 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-500" />
                          <input type="number" value={proc.preco_g} onChange={e => updateProc(cat.key, proc.id, 'preco_g', e.target.value)} placeholder="0" className="col-span-2 border border-slate-300 rounded-lg px-1 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-500" />
                        </>
                      ) : (
                        <input type="number" value={proc.preco_p} onChange={e => updateProc(cat.key, proc.id, 'preco_p', e.target.value)} placeholder="0" className="col-span-6 border border-slate-300 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-500" />
                      )}
                      <input type="number" value={proc.porcentagem_profissional} onChange={e => updateProc(cat.key, proc.id, 'porcentagem_profissional', e.target.value)} placeholder="40" className="col-span-2 border border-slate-300 rounded-lg px-1 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-500" />
                      {procedimentos[cat.key].length > 1 && (
                        <button onClick={() => removeProc(cat.key, proc.id)} className="col-span-1 text-red-400 hover:text-red-600 text-xl text-center">×</button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => addProc(cat.key)} className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium">+ Adicionar {cat.label.toLowerCase()}</button>
              </div>
            ))}

            <div className="flex gap-3">
              <button onClick={() => setEtapa(1)} className="flex-1 py-3 border border-slate-300 text-slate-600 font-medium rounded-xl hover:bg-slate-50">← Voltar</button>
              <button onClick={() => setEtapa(3)} className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600">Próximo →</button>
            </div>
          </div>
        )}

        {/* ═══════════════ ETAPA 3 — DESPESAS ═══════════════ */}
        {etapa === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Despesas fixas mensais</h2>
              <p className="text-xs text-slate-400 mt-0.5">Informe o valor mensal de cada despesa do salão.</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="grid grid-cols-12 gap-2 text-xs text-slate-400">
                <span className="col-span-4">Descrição</span>
                <span className="col-span-4">Tipo</span>
                <span className="col-span-3 text-center">Valor R$</span>
                <span className="col-span-1" />
              </div>
              {despesas.map(d => (
                <div key={d.id} className="grid grid-cols-12 gap-2 items-center">
                  <input type="text" value={d.nome} onChange={e => updateDespesa(d.id, 'nome', e.target.value)} placeholder="Ex: Aluguel" className="col-span-4 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                  <select value={d.tipo} onChange={e => updateDespesa(d.id, 'tipo', e.target.value)} className="col-span-4 border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white outline-none">
                    {TIPOS_DESPESA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input type="number" value={d.valor} onChange={e => updateDespesa(d.id, 'valor', e.target.value)} placeholder="0,00" className="col-span-3 border border-slate-300 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-500" />
                  <button onClick={() => removeDespesa(d.id)} className="col-span-1 text-red-400 hover:text-red-600 text-xl text-center">×</button>
                </div>
              ))}
              <button onClick={addDespesa} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">+ Adicionar despesa</button>
            </div>

            {/* Resumo */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700 text-sm mb-2">Resumo do que será salvo</p>
              {temFuncionarios && <p>✓ {funcionarios.filter(f => f.nome.trim()).length} funcionário(s)</p>}
              <p>✓ {CATEGORIAS.reduce((acc, cat) => acc + procedimentos[cat.key].filter(p => p.nome.trim() && p.preco_p).length, 0)} procedimento(s)</p>
              <p>✓ {despesas.filter(d => d.nome.trim() && d.valor).length} despesa(s) fixa(s)</p>
              <p>✓ Taxa maquininha: 5% (automático)</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEtapa(2)} className="flex-1 py-3 border border-slate-300 text-slate-600 font-medium rounded-xl hover:bg-slate-50" disabled={salvando}>← Voltar</button>
              <button onClick={finalizar} disabled={salvando} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 disabled:opacity-60">
                {salvando ? 'Salvando...' : 'Abrir meu salão ✓'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
