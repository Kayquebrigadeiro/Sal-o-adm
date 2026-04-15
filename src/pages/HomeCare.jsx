import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { PackageOpen, Plus, Tag, TrendingUp, Save, Edit2, Trash2 } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function HomeCare({ salaoId }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  
  // Modais e Formulários
  const [modalVenda, setModalVenda] = useState(false);
  const [formVenda, setFormVenda] = useState({ cliente_id: '', produto_id: '', valor_cobrado: '' });
  
  // Controle da "Linha" de Adicionar/Editar
  const [editando, setEditando] = useState(null);
  const [formProd, setFormProd] = useState({ id: null, nome: '', custo_variavel: '', preco_m: '' });

  useEffect(() => {
    if (salaoId) carregarDados();
  }, [salaoId]);

  const carregarDados = async () => {
    setLoading(true);
    // Simulação inicial para você visualizar a "planilha"
    setProdutos([
      { id: '1', nome: 'SHAMPOO KÉRASTASE 250ML', custo_variavel: 80, preco_m: 150 },
      { id: '2', nome: 'MÁSCARA WELLA NUTRI', custo_variavel: 65, preco_m: 120 },
      { id: '3', nome: 'ÓLEO REPARADOR ARGAN', custo_variavel: 30, preco_m: 70 },
    ]);
    
    const { data: clis } = await supabase.from('clientes').select('*').eq('salao_id', salaoId).order('nome');
    setClientes(clis || []);
    setLoading(false);
  };

  const calcularLucro = (custo, venda) => Number(venda || 0) - Number(custo || 0);
  const calcularMargem = (custo, venda) => {
    const lucro = calcularLucro(custo, venda);
    if (!venda || venda == 0) return 0;
    return ((lucro / venda) * 100).toFixed(1);
  };

  const salvarProduto = () => {
    if (!formProd.nome || !formProd.custo_variavel || !formProd.preco_m) {
      return showToast('Preencha nome, custo e venda', 'error');
    }
    
    if (formProd.id) {
      setProdutos(produtos.map(p => p.id === formProd.id ? formProd : p));
      showToast('Linha atualizada!', 'success');
    } else {
      setProdutos([...produtos, { ...formProd, id: Date.now().toString() }]);
      showToast('Produto adicionado à planilha!', 'success');
    }
    setFormProd({ id: null, nome: '', custo_variavel: '', preco_m: '' });
    setEditando(null);
  };

  const editarLinha = (prod) => {
    setEditando(prod.id);
    setFormProd(prod);
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setFormProd({ id: null, nome: '', custo_variavel: '', preco_m: '' });
  };

  const removerProduto = (id) => {
    if(confirm('Remover este produto da lista?')) {
      setProdutos(produtos.filter(p => p.id !== id));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <PackageOpen className="text-emerald-600" /> Planilha de Produtos
          </h1>
          <p className="text-slate-500">Cadastre custos e preços de venda de forma rápida.</p>
        </div>
        <button onClick={() => setModalVenda(true)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg">
          <Tag size={20} /> Registrar Venda
        </button>
      </div>

      {/* PLANILHA DE PRODUTOS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
              <th className="p-4 font-bold">Nome do Produto</th>
              <th className="p-4 font-bold">Custo (R$)</th>
              <th className="p-4 font-bold">Venda (R$)</th>
              <th className="p-4 font-bold text-emerald-400">Lucro (R$)</th>
              <th className="p-4 font-bold text-blue-400">Margem (%)</th>
              <th className="p-4 font-bold text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {/* LINHA DE CADASTRO RÁPIDO (Como digitar na última linha do Excel) */}
            <tr className="bg-slate-50 border-b-2 border-slate-200">
              <td className="p-3">
                <input type="text" placeholder="Adicionar novo produto..." className="w-full bg-white border border-slate-200 p-2 rounded-lg font-bold outline-none focus:border-slate-900 uppercase" value={!editando ? formProd.nome : ''} onChange={e => !editando && setFormProd({...formProd, nome: e.target.value.toUpperCase()})} disabled={editando !== null} />
              </td>
              <td className="p-3">
                <input type="number" placeholder="0.00" className="w-24 bg-white border border-slate-200 p-2 rounded-lg outline-none" value={!editando ? formProd.custo_variavel : ''} onChange={e => !editando && setFormProd({...formProd, custo_variavel: e.target.value})} disabled={editando !== null} />
              </td>
              <td className="p-3">
                <input type="number" placeholder="0.00" className="w-24 bg-white border border-emerald-200 p-2 rounded-lg outline-none text-emerald-700 font-bold" value={!editando ? formProd.preco_m : ''} onChange={e => !editando && setFormProd({...formProd, preco_m: e.target.value})} disabled={editando !== null} />
              </td>
              <td className="p-3 font-black text-emerald-600">
                {!editando && formProd.custo_variavel && formProd.preco_m ? fmt(calcularLucro(formProd.custo_variavel, formProd.preco_m)) : '-'}
              </td>
              <td className="p-3 font-bold text-blue-600">
                {!editando && formProd.custo_variavel && formProd.preco_m ? `${calcularMargem(formProd.custo_variavel, formProd.preco_m)}%` : '-'}
              </td>
              <td className="p-3 text-right">
                <button onClick={salvarProduto} disabled={editando !== null} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-30">
                  + Incluir
                </button>
              </td>
            </tr>

            {/* DADOS DA PLANILHA */}
            {produtos.map(prod => (
              <tr key={prod.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                {editando === prod.id ? (
                  /* MODO EDIÇÃO DA LINHA */
                  <>
                    <td className="p-3"><input type="text" className="w-full border p-2 rounded-lg font-bold uppercase" value={formProd.nome} onChange={e => setFormProd({...formProd, nome: e.target.value.toUpperCase()})} /></td>
                    <td className="p-3"><input type="number" className="w-24 border p-2 rounded-lg" value={formProd.custo_variavel} onChange={e => setFormProd({...formProd, custo_variavel: e.target.value})} /></td>
                    <td className="p-3"><input type="number" className="w-24 border p-2 rounded-lg font-bold text-emerald-700" value={formProd.preco_m} onChange={e => setFormProd({...formProd, preco_m: e.target.value})} /></td>
                    <td className="p-3 font-black text-emerald-600">{fmt(calcularLucro(formProd.custo_variavel, formProd.preco_m))}</td>
                    <td className="p-3 font-bold text-blue-600">{calcularMargem(formProd.custo_variavel, formProd.preco_m)}%</td>
                    <td className="p-3 text-right flex justify-end gap-2">
                      <button onClick={cancelarEdicao} className="text-slate-400 hover:text-slate-600 px-2 font-bold text-sm">Cancelar</button>
                      <button onClick={salvarProduto} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-bold"><Save size={16}/></button>
                    </td>
                  </>
                ) : (
                  /* MODO LEITURA (EXIBIÇÃO) */
                  <>
                    <td className="p-4 font-bold text-slate-800">{prod.nome}</td>
                    <td className="p-4 text-slate-500 font-medium">{fmt(prod.custo_variavel)}</td>
                    <td className="p-4 text-slate-800 font-bold">{fmt(prod.preco_m)}</td>
                    <td className="p-4 font-black text-emerald-600">{fmt(calcularLucro(prod.custo_variavel, prod.preco_m))}</td>
                    <td className="p-4 font-bold text-blue-600">
                      <span className="bg-blue-50 px-2 py-1 rounded-md">{calcularMargem(prod.custo_variavel, prod.preco_m)}%</span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => editarLinha(prod)} className="p-2 text-slate-400 hover:text-slate-700"><Edit2 size={18}/></button>
                      <button onClick={() => removerProduto(prod.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL PARA REGISTRAR A VENDA (O PDV) */}
      <Modal open={modalVenda} onClose={() => setModalVenda(false)} title="Registrar Venda de Produto">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Produto (Prateleira)</label>
            <select 
              className="w-full border-2 border-slate-100 p-3 rounded-2xl outline-none font-bold" 
              value={formVenda.produto_id} 
              onChange={e => {
                const p = produtos.find(x => x.id === e.target.value);
                setFormVenda({...formVenda, produto_id: e.target.value, valor_cobrado: p ? p.preco_m : ''});
              }}
            >
              <option value="">Selecione o que foi vendido...</option>
              {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Cliente</label>
            <select className="w-full border-2 border-slate-100 p-3 rounded-2xl outline-none" value={formVenda.cliente_id} onChange={e => setFormVenda({...formVenda, cliente_id: e.target.value})}>
              <option value="">Selecione a cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Valor Pago (R$)</label>
            <input 
              type="number" className="w-full border-2 border-emerald-200 bg-emerald-50 text-emerald-700 p-3 rounded-2xl font-black text-xl outline-none"
              value={formVenda.valor_cobrado} onChange={e => setFormVenda({...formVenda, valor_cobrado: e.target.value})}
            />
          </div>
          <button onClick={() => { showToast('Venda salva!', 'success'); setModalVenda(false); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg mt-2">
            Salvar Venda no Caixa
          </button>
        </div>
      </Modal>

    </div>
  );
}
