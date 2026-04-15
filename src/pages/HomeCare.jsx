import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { ShoppingBag, Plus, Tag, TrendingUp, DollarSign, PackageOpen, AlertCircle } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function HomeCare({ salaoId }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // Dados
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [vendasHistorico, setVendasHistorico] = useState([]);
  
  // Modais
  const [modalProduto, setModalProduto] = useState(false);
  const [modalVenda, setModalVenda] = useState(false);
  
  const [formProd, setFormProd] = useState({ id: null, nome: '', custo: '', preco_venda: '', estoque: 0 });
  const [formVenda, setFormVenda] = useState({ cliente_id: '', produto_id: '', valor_cobrado: '' });

  useEffect(() => {
    if (salaoId) carregarDados();
  }, [salaoId]);

  const carregarDados = async () => {
    setLoading(true);
    // Simulação de busca no banco para o Frontend (depois ajustamos o SQL real)
    const { data: prods } = await supabase.from('procedimentos').select('*').eq('salao_id', salaoId).eq('categoria', 'PRODUTO');
    const { data: clis } = await supabase.from('clientes').select('*').eq('salao_id', salaoId).order('nome');
    
    // Como ainda não temos a tabela final de HomeCare no BD, vamos usar um estado vazio para o histórico por enquanto
    setProdutos(prods || [
      { id: '1', nome: 'Kit Shampoo + Condicionador Kérastase', custo_variavel: 120, preco_m: 200, ativo: true },
      { id: '2', nome: 'Máscara de Hidratação Wella', custo_variavel: 80, preco_m: 140, ativo: true }
    ]);
    setClientes(clis || []);
    setVendasHistorico([
      { id: 1, data: new Date().toLocaleDateString(), cliente: 'Maria Silva', produto: 'Máscara de Hidratação Wella', lucro: 60 }
    ]);
    setLoading(false);
  };

  const calcularLucroProduto = (custo, venda) => {
    return Number(venda) - Number(custo);
  };

  const registrarVenda = () => {
    if (!formVenda.cliente_id || !formVenda.produto_id || !formVenda.valor_cobrado) {
      return showToast('Preencha todos os campos da venda', 'error');
    }
    showToast('Venda registrada com sucesso! Lucro adicionado ao caixa.', 'success');
    setModalVenda(false);
    // Aqui entrará o insert no banco depois
  };

  const salvarProduto = () => {
    if (!formProd.nome || !formProd.custo || !formProd.preco_venda) {
      return showToast('Preencha os dados do produto', 'error');
    }
    showToast('Produto salvo no estoque!', 'success');
    setModalProduto(false);
  };

  // Resumo Rápido
  const lucroMensalProdutos = vendasHistorico.reduce((acc, curr) => acc + curr.lucro, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="text-emerald-600" /> HomeCare & Produtos
          </h1>
          <p className="text-slate-500">Aumente seu lucro vendendo produtos para as clientes levarem para casa.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={() => { setFormProd({ id: null, nome: '', custo: '', preco_venda: '', estoque: 1 }); setModalProduto(true); }} className="flex-1 md:flex-none bg-slate-100 text-slate-700 px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all">
            <PackageOpen size={20} /> Novo Produto
          </button>
          <button onClick={() => { setFormVenda({ cliente_id: '', produto_id: '', valor_cobrado: '' }); setModalVenda(true); }} className="flex-1 md:flex-none bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
            <Tag size={20} /> Nova Venda
          </button>
        </div>
      </div>

      {/* PAINEL DE RESUMO DE VENDAS */}
      <div className="bg-slate-900 rounded-3xl p-6 mb-8 text-white flex items-center justify-between shadow-xl">
        <div>
          <p className="text-emerald-400 font-bold text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
            <TrendingUp size={16}/> Lucro Limpo de HomeCare (Mês)
          </p>
          <h2 className="text-4xl font-black">{fmt(lucroMensalProdutos)}</h2>
        </div>
        <div className="hidden md:block bg-slate-800 p-4 rounded-2xl border border-slate-700">
          <p className="text-xs text-slate-400 font-bold uppercase mb-1">Dica de Gestão</p>
          <p className="text-sm text-slate-300 max-w-xs">Ofereça um produto de manutenção sempre que finalizar um serviço químico. A conversão média é de 30%.</p>
        </div>
      </div>

      {/* VITRINE / ESTOQUE DE PRODUTOS */}
      <h3 className="font-bold text-slate-800 mb-4 text-lg">Seus Produtos (Prateleira)</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {produtos.map(prod => (
          <div key={prod.id} className="bg-white border border-slate-200 rounded-3xl p-5 hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-50 text-emerald-700 font-bold text-xs px-3 py-1 rounded-bl-xl">
              Lucro: {fmt(calcularLucroProduto(prod.custo_variavel, prod.preco_m))}
            </div>
            
            <h4 className="font-bold text-slate-900 pr-16 leading-tight mt-2 mb-4">{prod.nome}</h4>
            
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Preço de Custo</p>
                <p className="font-semibold text-slate-500">{fmt(prod.custo_variavel)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Preço de Venda</p>
                <p className="text-xl font-black text-emerald-600">{fmt(prod.preco_m)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* HISTÓRICO DE VENDAS */}
      <h3 className="font-bold text-slate-800 mb-4 text-lg">Últimas Vendas</h3>
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
        {vendasHistorico.map((venda, i) => (
          <div key={i} className="flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
            <div>
              <p className="font-bold text-slate-800">{venda.produto}</p>
              <p className="text-xs text-slate-500">Vendida para <span className="font-semibold text-slate-700">{venda.cliente}</span> em {venda.data}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-emerald-600 uppercase">Lucro</p>
              <p className="font-black text-emerald-600">+{fmt(venda.lucro)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: NOVA VENDA */}
      <Modal open={modalVenda} onClose={() => setModalVenda(false)} title="Registrar Venda de Produto">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Cliente</label>
            <select className="w-full border-2 border-slate-100 p-3 rounded-2xl outline-none" value={formVenda.cliente_id} onChange={e => setFormVenda({...formVenda, cliente_id: e.target.value})}>
              <option value="">Selecione a cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Produto Selecionado</label>
            <select 
              className="w-full border-2 border-slate-100 p-3 rounded-2xl outline-none bg-slate-50 font-bold" 
              value={formVenda.produto_id} 
              onChange={e => {
                const p = produtos.find(x => x.id === e.target.value);
                setFormVenda({...formVenda, produto_id: e.target.value, valor_cobrado: p ? p.preco_m : ''});
              }}
            >
              <option value="">Escolha na prateleira...</option>
              {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Valor Pago (R$)</label>
            <input 
              type="number" className="w-full border-2 border-emerald-200 bg-emerald-50 text-emerald-700 p-3 rounded-2xl font-black text-xl outline-none"
              value={formVenda.valor_cobrado} onChange={e => setFormVenda({...formVenda, valor_cobrado: e.target.value})}
            />
          </div>

          <button onClick={registrarVenda} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg mt-2">
            Confirmar Venda
          </button>
        </div>
      </Modal>

      {/* MODAL: NOVO PRODUTO */}
      <Modal open={modalProduto} onClose={() => setModalProduto(false)} title="Adicionar à Prateleira">
        <div className="space-y-4">
          <input type="text" placeholder="Nome do Produto (Ex: Óleo de Argan 50ml)" className="w-full border-b-2 border-slate-200 p-3 font-bold outline-none text-lg focus:border-slate-900 uppercase" value={formProd.nome} onChange={e => setFormProd({...formProd, nome: e.target.value.toUpperCase()})} />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Custo (R$)</label>
               <input type="number" className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold outline-none" value={formProd.custo} onChange={e => setFormProd({...formProd, custo: e.target.value})} />
            </div>
            <div>
               <label className="text-xs font-bold text-emerald-600 uppercase mb-1 block">Venda (R$)</label>
               <input type="number" className="w-full border-2 border-emerald-200 bg-emerald-50 p-3 rounded-xl font-bold text-emerald-700 outline-none" value={formProd.preco_venda} onChange={e => setFormProd({...formProd, preco_venda: e.target.value})} />
            </div>
          </div>

          {formProd.custo && formProd.preco_venda && (
            <div className="bg-slate-50 p-3 rounded-xl flex justify-between items-center border border-slate-100">
               <span className="text-sm font-bold text-slate-500">Lucro por unidade:</span>
               <span className="font-black text-emerald-600 text-lg">{fmt(calcularLucroProduto(formProd.custo, formProd.preco_venda))}</span>
            </div>
          )}

          <button onClick={salvarProduto} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg mt-2">
            Salvar Produto
          </button>
        </div>
      </Modal>
    </div>
  );
}
