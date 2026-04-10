import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

// --- Funções Auxiliares ---
function gerarUsernameDoNome(nome) {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, '_') // Substitui caracteres especiais por _
    .replace(/_+/g, '_') // Remove underscores duplicados
    .substring(0, 20); // Limita tamanho
}

function gerarSenhaAleatoria() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  let senha = '';
  for (let i = 0; i < 8; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
}

export default function NovoSalao({ userId }) {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  
  // Estado simplificado (apenas o essencial)
  const [dados, setDados] = useState({
    nomeSalao: '',
    telefone: '',
    nomeProprietaria: '',
    username: '',
    senha: ''
  });

  // --- Navegação entre etapas ---
  const irParaEtapa2 = (e) => {
    e.preventDefault();
    if (!dados.nomeSalao || !dados.nomeProprietaria) {
      setErro('O nome do salão e da proprietária são obrigatórios.');
      return;
    }
    setErro('');
    
    // Gera automaticamente as credenciais com base no nome
    const novoUsername = gerarUsernameDoNome(dados.nomeProprietaria);
    const novaSenha = gerarSenhaAleatoria();
    
    setDados({ ...dados, username: novoUsername, senha: novaSenha });
    setEtapa(2);
  };

  // --- Salvar no Banco de Dados ---
  const finalizarCadastro = async () => {
    setSalvando(true);
    setErro('');
    
    try {
      // 1. Criar o Salão (o banco já vai definir configurado = false por padrão)
      const { data: salao, error: erroSalao } = await supabase
        .from('saloes')
        .insert([{
          nome: dados.nomeSalao,
          telefone: dados.telefone,
          vendedor_id: userId,
          configurado: false // Forçando o false para garantir o Wizard depois
        }])
        .select('id')
        .single();

      if (erroSalao) throw erroSalao;

      // 2. Criar a conta de Autenticação para a Proprietária
      // O nome dela limpo + número único + @gmail.com (O Supabase é OBRIGADO a aceitar)
      const nomeLimpo = dados.username.replace(/[^a-zA-Z0-9]/g, '');
      const emailFicticio = `${nomeLimpo}${Date.now()}@gmail.com`; 
      
      const { error: erroAuth } = await supabase.auth.signUp({
        email: emailFicticio,
        password: dados.senha,
        options: {
          data: {
            salao_id: salao.id,
            vendedor_id: userId,
            cargo: 'PROPRIETARIO',
            username: dados.username,
            senha: dados.senha // Passado no metadata para o Trigger gravar na logins_gerados
          }
        }
      });

      if (erroAuth) throw erroAuth;

      alert('Salão criado com sucesso! Entregue as credenciais abaixo à proprietária.');
      navigate('/admin/saloes');

    } catch (err) {
      console.error('[NovoSalao] Erro:', err);
      setErro(err.message || 'Ocorreu um erro ao criar o salão.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Novo Salão</h1>
        <p className="text-sm text-slate-500 mt-1">
          Etapa {etapa} de 2: {etapa === 1 ? 'Dados Básicos' : 'Credenciais de Acesso'}
        </p>
      </div>

      {erro && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {erro}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        
        {/* ETAPA 1: DADOS BÁSICOS */}
        {etapa === 1 && (
          <form onSubmit={irParaEtapa2} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Salão *</label>
              <input
                type="text" required autoFocus
                value={dados.nomeSalao}
                onChange={e => setDados({...dados, nomeSalao: e.target.value})}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-slate-800 focus:outline-none"
                placeholder="Ex: Studio Beauty"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefone (WhatsApp)</label>
              <input
                type="text"
                value={dados.telefone}
                onChange={e => setDados({...dados, telefone: e.target.value})}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-slate-800 focus:outline-none"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Proprietária *</label>
              <input
                type="text" required
                value={dados.nomeProprietaria}
                onChange={e => setDados({...dados, nomeProprietaria: e.target.value})}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-slate-800 focus:outline-none"
                placeholder="Ex: Maria Silva"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button type="submit" className="bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors">
                Próximo →
              </button>
            </div>
          </form>
        )}

        {/* ETAPA 2: CREDENCIAIS */}
        {etapa === 2 && (
          <div className="space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="text-amber-800 font-bold mb-2 flex items-center gap-2">
                ⚠️ Anote estas credenciais
              </h3>
              <p className="text-sm text-amber-700 mb-4">
                A proprietária precisará destes dados para o <b>primeiro acesso</b>. Ao entrar, ela mesma irá configurar os profissionais e serviços.
              </p>
              
              <div className="bg-white border border-amber-100 rounded p-4 font-mono text-sm space-y-2">
                <p><span className="text-slate-500 select-none">Usuário: </span> <strong className="text-slate-900 text-base">{dados.username}</strong></p>
                <p><span className="text-slate-500 select-none">Senha: </span> <strong className="text-slate-900 text-base">{dados.senha}</strong></p>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button 
                type="button" 
                onClick={() => setEtapa(1)} 
                disabled={salvando}
                className="text-slate-600 px-4 py-2.5 rounded-lg text-sm hover:bg-slate-100 transition-colors"
              >
                ← Voltar
              </button>
              
              <button 
                onClick={finalizarCadastro} 
                disabled={salvando}
                className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {salvando ? 'A Criar...' : 'Finalizar Cadastro ✔'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
