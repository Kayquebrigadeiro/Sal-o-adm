import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function GerenciarSalao({ userId }) {
  const { salaoId } = useParams();
  const navigate = useNavigate();
  const [salao, setSalao] = useState(null);
  const [logins, setLogins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, [salaoId]);

  const carregarDados = async () => {
    setLoading(true);
    // Busca informações básicas do salão
    const { data: salaoData } = await supabase
      .from('saloes')
      .select('id, nome, telefone, criado_em, ativo')
      .eq('id', salaoId)
      .single();
    
    setSalao(salaoData);

    // Busca os logins gerados para este salão
    const { data: loginsData } = await supabase
      .from('logins_gerados')
      .select('username, senha_temporaria, gerado_em')
      .eq('salao_id', salaoId)
      .order('gerado_em', { ascending: false });
    
    setLogins(loginsData || []);
    setLoading(false);
  };

  const copiarCredenciais = (username, senha) => {
    const texto = `Olá! Seguem os dados de acesso do seu salão:\n\n*Acesso ao Sistema:*\nSite: https://adm-salao.vercel.app\nUsuário: ${username}\nSenha: ${senha}\n\n*Importante:* Recomendamos que você altere sua senha no menu "Configurações > Minha Conta" logo no primeiro acesso.`;
    navigator.clipboard.writeText(texto);
    alert('Credenciais copiadas para a área de transferência!');
  };

  if (loading) {
    return <div className="p-8 text-gray-400">Carregando informações do salão...</div>;
  }

  if (!salao) {
    return <div className="p-8 text-red-500">Salão não encontrado ou deletado.</div>;
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/admin')}
          className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
        >
          ← Voltar
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{salao.nome}</h1>
          <p className="text-gray-500 text-sm">
            {salao.telefone ? `Tel: ${salao.telefone}` : 'Sem telefone cadastrado'} • 
            Cadastrado em {new Date(salao.criado_em).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Suporte e Acesso</h2>
          <p className="text-sm text-gray-500 mt-1">
            Aqui você encontra as credenciais iniciais que foram geradas para a dona do salão. 
            Caso ela esqueça a senha e ainda não tenha alterado no sistema, você pode reenviar estes dados.
          </p>
        </div>

        <div className="p-6">
          {logins.length === 0 ? (
            <div className="text-center p-6 bg-gray-50 rounded-lg text-gray-500 text-sm border border-dashed border-gray-300">
              Nenhuma credencial inicial foi registrada para este salão.
            </div>
          ) : (
            <div className="space-y-4">
              {logins.map((login, idx) => (
                <div key={idx} className="bg-sky-50 border border-sky-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">Usuário / E-mail</span>
                      <p className="text-gray-800 font-medium">{login.username}</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">Senha Temporária</span>
                      <p className="text-gray-800 font-mono bg-white px-2 py-1 rounded border border-sky-100 inline-block">
                        {login.senha_temporaria}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Gerado em: {new Date(login.gerado_em).toLocaleDateString('pt-BR')} às {new Date(login.gerado_em).toLocaleTimeString('pt-BR')}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => copiarCredenciais(login.username, login.senha_temporaria)}
                    className="shrink-0 bg-sky-500 text-white font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-sky-600 shadow-sm transition-colors"
                  >
                    Copiar para WhatsApp
                  </button>
                </div>
              ))}
              
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-amber-800 mb-1">Atenção</h3>
                <p className="text-xs text-amber-700">
                  Estas são as senhas <strong>temporárias</strong> criadas junto com o salão. 
                  Se a cliente tiver alterado a senha dentro das configurações do próprio salão, esta senha acima não funcionará mais.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
