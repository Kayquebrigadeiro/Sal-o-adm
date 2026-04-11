import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

function gerarUsernameDoNome(nome) {
  return nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').substring(0, 20);
}

function gerarSenhaAleatoria() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  return Array.from({length: 8}).map(() => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

export default function NovoSalao() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  
  const [dados, setDados] = useState({
    nomeSalao: '', telefone: '', nomeProprietaria: '', username: '', senha: ''
  });

  const irParaEtapa2 = (e) => {
    e.preventDefault();
    if (!dados.nomeSalao || !dados.nomeProprietaria) return setErro('Nome do salão e da proprietária são obrigatórios.');
    setErro('');
    setDados({ ...dados, username: gerarUsernameDoNome(dados.nomeProprietaria), senha: gerarSenhaAleatoria() });
    setEtapa(2);
  };

  const finalizarCadastro = async () => {
    setSalvando(true);
    setErro('');
    
    try {
      // 1. Pegamos o ID do Vendedor
      const { data: { user }, error: erroUser } = await supabase.auth.getUser();
      if (erroUser || !user) throw new Error("Sessão expirada.");

      // 2. Criamos o Salão no banco normalmente
      const { data: salao, error: erroSalao } = await supabase
        .from('saloes')
        .insert([{ nome: dados.nomeSalao, telefone: dados.telefone, vendedor_id: user.id }])
        .select('id').single();

      if (erroSalao) throw erroSalao;

      // 3. A MÁGICA: Chamamos a Edge Function para criar a Proprietária sem nos deslogar!
      const emailFicticio = `${dados.username.replace(/[^a-zA-Z0-9]/g, '')}${Date.now()}@gmail.com`;
      
      const { data: funcData, error: funcError } = await supabase.functions.invoke('criar-proprietaria', {
        body: { 
          email: emailFicticio, 
          senha: dados.senha, 
          username: dados.username, 
          salao_id: salao.id, 
          vendedor_id: user.id 
        }
      });

      if (funcError) throw new Error("Erro ao gerar usuário: " + funcError.message);
      if (funcData?.error) throw new Error(funcData.error);

      alert('Salão e acessos criados com sucesso!');
      navigate('/admin/saloes');

    } catch (err) {
      console.error(err);
      setErro(err.message || 'Ocorreu um erro ao criar o salão.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Novo Salão</h1>
        <p className="text-sm text-slate-500 mt-1">Etapa {etapa} de 2: {etapa === 1 ? 'Dados Básicos' : 'Credenciais de Acesso'}</p>
      </div>

      {erro && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{erro}</div>}

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        {etapa === 1 && (
          <form onSubmit={irParaEtapa2} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Nome do Salão *</label><input type="text" required autoFocus value={dados.nomeSalao} onChange={e => setDados({...dados, nomeSalao: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Telefone (WhatsApp)</label><input type="text" value={dados.telefone} onChange={e => setDados({...dados, telefone: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Nome da Proprietária *</label><input type="text" required value={dados.nomeProprietaria} onChange={e => setDados({...dados, nomeProprietaria: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div className="pt-4 flex justify-end"><button type="submit" className="bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-slate-900">Próximo →</button></div>
          </form>
        )}

        {etapa === 2 && (
          <div className="space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="text-amber-800 font-bold mb-2">⚠️ Anote estas credenciais</h3>
              <p className="text-sm text-amber-700 mb-4">A proprietária precisará destes dados para o primeiro acesso.</p>
              <div className="bg-white border border-amber-100 rounded p-4 font-mono text-sm space-y-2">
                <p><span className="text-slate-500">Usuário: </span> <strong>{dados.username}</strong></p>
                <p><span className="text-slate-500">Senha: </span> <strong>{dados.senha}</strong></p>
              </div>
            </div>
            <div className="pt-4 flex justify-between">
              <button onClick={() => setEtapa(1)} disabled={salvando} className="text-slate-600 px-4 py-2.5 rounded-lg text-sm hover:bg-slate-100">← Voltar</button>
              <button onClick={finalizarCadastro} disabled={salvando} className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">{salvando ? 'A Criar...' : 'Finalizar Cadastro ✔'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
