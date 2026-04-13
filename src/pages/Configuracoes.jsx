import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const CATEGORIAS = ['CABELO', 'UNHAS', 'SOBRANCELHAS', 'CILIOS', 'OUTRO'];

export default function Configuracoes({ salaoId }) {
  const { showToast } = useToast();
  const [abaAtiva, setAbaAtiva] = useState('procedimentos');
  const [loading, setLoading] = useState(true);

  // Estados
  const [procedimentos, setProcedimentos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [config, setConfig] = useState({ custo_fixo_por_atendimento: 29, taxa_maquininha_pct: 5, prolabore_mensal: 0 });

  // Modais
  const [modalProcAberto, setModalProcAberto] = useState(false);
  const [modalProfAberto, setModalProfAberto] = useState(false);
  const [editando, setEditando] = useState(null);

  // Forms
  const [formProc, setFormProc] = useState({
    nome: '',
    categoria: 'CABELO',
    requer_comprimento: true,
    preco_p: '',
    preco_m: '',
    preco_g: '',
    porcentagem_profissional: '40',
    custo_variavel: '0'
  });

  const [formProf, setFormProf] = useState({
    nome: '',
    cargo: 'FUNCIONARIO',
    salario_fixo: ''
  });

  useEffect(() => {
    carregarDados();
  }, [salaoId]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [procRes, profRes, configRes] = await Promise.all([
        supabase.from('procedimentos').select('*').eq('salao_id', salaoId).order('categoria, nome'),
        supabase.from('profissionais').select('*').eq('salao_id', salaoId).order('nome'),
        supabase.from('configuracoes').select('*').eq('salao_id', salaoId).single()
      ]);

      if (procRes.data) setProcedimentos(procRes.data);
      if (profRes.data) setProfissionais(profRes.data);
      if (configRes.data) setConfig(configRes.data);
    } catch (error) {
      showToast('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════ PROCEDIMENTOS ═══════════════════════════════
  const abrirModalProc = (proc = null) => {
    if (proc) {
      setEditando(proc);
      setFormProc({
        nome: proc.nome,
        categoria: proc.categoria,
        requer_comprimento: proc.requer_comprimento,
        preco_p: proc.preco_p,
        preco_m: proc.preco_m || '',
        preco_g: proc.preco_g || '',
        porcentagem_profissional: proc.porcentagem_profissional,
        custo_variavel: proc.custo_variavel
      });
    } else {
      setEditando(null);
      setFormProc({
        nome: '',
        categoria: 'CABELO',
        requer_comprimento: true,
        preco_p: '',
        preco_m: '',
        preco_g: '',
        porcentagem_profissional: '40',
        custo_variavel: '0'
      });
    }
    setModalProcAberto(true);
  };

  const salvarProcedimento = async () => {
    if (!formProc.nome.trim()) {
      showToast('Informe o nome do procedimento', 'error');
      return;
    }

    try {
      const dados = {
        salao_id: salaoId,
        nome: formProc.nome.trim(),
        categoria: formProc.categoria,
        requer_comprimento: formProc.requer_comprimento,
        preco_p: Number(formProc.preco_p) || 0,
        preco_m: formProc.requer_comprimento ? (Number(formProc.preco_m) || 0) : null,
        preco_g: formProc.requer_comprimento ? (Number(formProc.preco_g) || 0) : null,
        porcentagem_profissional: Number(formProc.porcentagem_profissional) || 40,
        custo_variavel: Number(formProc.custo_variavel) || 0,
        ativo: true
      };

      if (editando) {
        await supabase.from('procedimentos').update(dados).eq('id', editando.id);
        showToast('Procedimento atualizado', 'success');
      } else {
        await supabase.from('procedimentos').insert(dados);
        showToast('Procedimento criado', 'success');
      }

      setModalProcAberto(false);
      carregarDados();
    } catch (error) {
      showToast('Erro ao salvar: ' + error.message, 'error');
    }
  };

  const toggleAtivoProc = async (id, ativo) => {
    try {
      await supabase.from('procedimentos').update({ ativo: !ativo }).eq('id', id);
      showToast(ativo ? 'Procedimento desativado' : 'Procedimento ativado', 'success');
      carregarDados();
    } catch (error) {
      showToast('Erro ao atualizar', 'error');
    }
  };

  const deletarProcedimento = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este procedimento?')) return;
    try {
      await supabase.from('procedimentos').delete().eq('id', id);
      showToast('Procedimento deletado', 'success');
      carregarDados();
    } catch (error) {
      showToast('Erro ao deletar', 'error');
    }
  };

  // ═══════════════════════════════ PROFISSIONAIS ═══════════════════════════════
  const abrirModalProf = (prof = null) => {
    if (prof) {
      setEditando(prof);
      setFormProf({
        nome: prof.nome,
        cargo: prof.cargo,
        salario_fixo: prof.salario_fixo
      });
    } else {
      setEditando(null);
      setFormProf({
        nome: '',
        cargo: 'FUNCIONARIO',
        salario_fixo: ''
      });
    }
    setModalProfAberto(true);
  };

  const salvarProfissional = async () => {
    if (!formProf.nome.trim()) {
      showToast('Informe o nome do profissional', 'error');
      return;
    }

    try {
      const dados = {
        salao_id: salaoId,
        nome: formProf.nome.trim(),
        cargo: formProf.cargo,
        salario_fixo: Number(formProf.salario_fixo) || 0,
        ativo: true
      };

      if (editando) {
        await supabase.from('profissionais').update(dados).eq('id', editando.id);
        showToast('Profissional atualizado', 'success');
      } else {
        await supabase.from('profissionais').insert(dados);
        showToast('Profissional criado', 'success');
      }

      setModalProfAberto(false);
      carregarDados();
    } catch (error) {
      showToast('Erro ao salvar: ' + error.message, 'error');
    }
  };

  const toggleAtivoProf = async (id, ativo) => {
    try {
      await supabase.from('profissionais').update({ ativo: !ativo }).eq('id', id);
      showToast(ativo ? 'Profissional desativado' : 'Profissional ativado', 'success');
      carregarDados();
    } catch (error) {
      showToast('Erro ao atualizar', 'error');
    }
  };

  const deletarProfissional = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este profissional?')) return;
    try {
      await supabase.from('profissionais').delete().eq('id', id);
      showToast('Profissional deletado', 'success');
      carregarDados();
    } catch (error) {
      showToast('Erro ao deletar', 'error');
    }
  };

  // ═══════════════════════════════ CONFIGURAÇÕES ═══════════════════════════════
  const salvarConfiguracoes = async () => {
    try {
      await supabase.from('configuracoes').update({
        custo_fixo_por_atendimento: Number(config.custo_fixo_por_atendimento),
        taxa_maquininha_pct: Number(config.taxa_maquininha_pct),
        prolabore_mensal: Number(config.prolabore_mensal)
      }).eq('salao_id', salaoId);
      showToast('Configurações salvas', 'success');
    } catch (error) {
      showToast('Erro ao salvar', 'error');
    }
  };

  if (loading) return <div className="p-10 text-center">Carregando...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader title="Configurações" subtitle="Gerencie procedimentos, equipe e valores" />

      {/* Abas */}
      <div className="flex gap-6 border-b border-slate-200 mb-6">
        {[
          { key: 'procedimentos', label: 'Procedimentos' },
          { key: 'equipe', label: 'Equipe' },
          { key: 'financeiro', label: 'Financeiro' }
        ].map(aba => (
          <button
            key={aba.key}
            onClick={() => setAbaAtiva(aba.key)}
            className={`pb-3 text-sm font-medium transition-colors ${
              abaAtiva === aba.key
                ? 'border-b-2 border-emerald-500 text-emerald-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════ ABA PROCEDIMENTOS ═══════════════════════════════ */}
      {abaAtiva === 'procedimentos' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => abrirModalProc()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Plus size={18} /> Novo Procedimento
            </button>
          </div>

          {CATEGORIAS.map(cat => {
            const procsCategoria = procedimentos.filter(p => p.categoria === cat);
            if (procsCategoria.length === 0) return null;

            return (
              <div key={cat} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900">{cat}</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {procsCategoria.map(proc => (
                    <div key={proc.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{proc.nome}</p>
                          <div className="flex gap-4 mt-1 text-sm text-slate-600">
                            {proc.requer_comprimento ? (
                              <>
                                <span>P: R$ {proc.preco_p}</span>
                                <span>M: R$ {proc.preco_m}</span>
                                <span>G: R$ {proc.preco_g}</span>
                              </>
                            ) : (
                              <span>R$ {proc.preco_p}</span>
                            )}
                            <span>• Comissão: {proc.porcentagem_profissional}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleAtivoProc(proc.id, proc.ativo)}
                            className={`p-2 rounded-lg transition-colors ${
                              proc.ativo ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {proc.ativo ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                          </button>
                          <button
                            onClick={() => abrirModalProc(proc)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => deletarProcedimento(proc.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════ ABA EQUIPE ═══════════════════════════════ */}
      {abaAtiva === 'equipe' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => abrirModalProf()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Plus size={18} /> Novo Profissional
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {profissionais.map(prof => (
              <div key={prof.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{prof.nome}</p>
                    <div className="flex gap-4 mt-1 text-sm text-slate-600">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        prof.cargo === 'PROPRIETARIO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {prof.cargo === 'PROPRIETARIO' ? 'Proprietário' : 'Funcionário'}
                      </span>
                      <span>Salário: R$ {prof.salario_fixo}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAtivoProf(prof.id, prof.ativo)}
                      className={`p-2 rounded-lg transition-colors ${
                        prof.ativo ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {prof.ativo ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                    <button
                      onClick={() => abrirModalProf(prof)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => deletarProfissional(prof.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════ ABA FINANCEIRO ═══════════════════════════════ */}
      {abaAtiva === 'financeiro' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Custo fixo por atendimento (R$)</label>
              <input
                type="number"
                step="0.01"
                value={config.custo_fixo_por_atendimento}
                onChange={e => setConfig({ ...config, custo_fixo_por_atendimento: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">Rateio de água, luz, aluguel por atendimento</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Taxa maquininha (%)</label>
              <input
                type="number"
                step="0.1"
                value={config.taxa_maquininha_pct}
                disabled
                className="w-full border border-slate-300 rounded-lg px-4 py-2 bg-slate-100 text-slate-600 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 mt-1">Taxa fixa de 5% - não editável</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Pró-labore mensal (R$)</label>
              <input
                type="number"
                step="0.01"
                value={config.prolabore_mensal}
                onChange={e => setConfig({ ...config, prolabore_mensal: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">Meta de retirada mensal para despesas pessoais</p>
            </div>

            <button
              onClick={salvarConfiguracoes}
              className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Salvar Configurações
            </button>
          </div>
        </div>
      )}

      {/* Modal Procedimento */}
      <Modal open={modalProcAberto} onClose={() => setModalProcAberto(false)} title={editando ? 'Editar Procedimento' : 'Novo Procedimento'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
            <input
              type="text"
              value={formProc.nome}
              onChange={e => setFormProc({ ...formProc, nome: e.target.value })}
              placeholder="Ex: Progressiva, Corte, Manicure..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoria *</label>
            <select
              value={formProc.categoria}
              onChange={e => {
                const cat = e.target.value;
                setFormProc({ ...formProc, categoria: cat, requer_comprimento: cat === 'CABELO' });
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {formProc.requer_comprimento ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preço P (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formProc.preco_p}
                  onChange={e => setFormProc({ ...formProc, preco_p: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preço M (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formProc.preco_m}
                  onChange={e => setFormProc({ ...formProc, preco_m: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preço G (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formProc.preco_g}
                  onChange={e => setFormProc({ ...formProc, preco_g: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Preço (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formProc.preco_p}
                onChange={e => setFormProc({ ...formProc, preco_p: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Comissão (%)</label>
              <input
                type="number"
                value={formProc.porcentagem_profissional}
                onChange={e => setFormProc({ ...formProc, porcentagem_profissional: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Custo Variável (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formProc.custo_variavel}
                onChange={e => setFormProc({ ...formProc, custo_variavel: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setModalProcAberto(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={salvarProcedimento}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Profissional */}
      <Modal open={modalProfAberto} onClose={() => setModalProfAberto(false)} title={editando ? 'Editar Profissional' : 'Novo Profissional'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
            <input
              type="text"
              value={formProf.nome}
              onChange={e => setFormProf({ ...formProf, nome: e.target.value })}
              placeholder="Nome completo"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cargo *</label>
            <select
              value={formProf.cargo}
              onChange={e => setFormProf({ ...formProf, cargo: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="FUNCIONARIO">Funcionário</option>
              <option value="PROPRIETARIO">Proprietário</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Salário Fixo (R$)</label>
            <input
              type="number"
              step="0.01"
              value={formProf.salario_fixo}
              onChange={e => setFormProf({ ...formProf, salario_fixo: e.target.value })}
              placeholder="0,00"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setModalProfAberto(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={salvarProfissional}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
