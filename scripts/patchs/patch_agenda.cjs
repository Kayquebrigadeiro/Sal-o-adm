const fs = require('fs');
let content = fs.readFileSync('src/pages/Agenda.jsx', 'utf8');

// 1. Add api import
content = content.replace(
  "import { useToast } from '../components/Toast';",
  "import { useToast } from '../components/Toast';\nimport { api } from '../services/api';"
);

// 2. carregar() supabase -> api
content = content.replace(
  "supabase.from('profissionais').select('id, nome, cargo').eq('salao_id', salaoId).eq('ativo', true).order('nome'),",
  "api.get('/cadastros/profissionais').then(r => r.json()),"
);
content = content.replace(
  "supabase.from('procedimentos').select('id, nome, categoria, requer_comprimento, preco_p, preco_m, preco_g, custo_variavel').eq('salao_id', salaoId).eq('ativo', true).order('nome'),",
  "api.get('/cadastros/procedimentos').then(r => r.json()),"
);
content = content.replace(
  "const sorted = (profRes.data || []).sort((a, b) => {",
  "const sorted = (profRes.data || profRes || []).sort((a, b) => {"
);
content = content.replace(
  "setProcedimentos(procRes.data || []);",
  "setProcedimentos(procRes.data || procRes || []);"
);

// 3. carregarAtendimentos
const carregarAtendimentosNovo = `const carregarAtendimentos = async () => {
    try {
      const response = await api.get('/atendimentos?data=' + dataSelecionada);
      if (!response.ok) throw new Error('Falha ao carregar');
      const resData = await response.json();
      const list = resData.data || resData || [];
      
      // Filtrar a data e fazer mapeamento local para substituir view
      const filtrados = list.filter(a => a.data && a.data.startsWith(dataSelecionada));
      
      const mapped = filtrados.map(a => {
        return {
          ...a,
          profissionais: { nome: profissionais.find(p => p.id === a.profissional_id)?.nome },
          procedimentos: [{
            procedimento_id: a.procedimento_id,
            procedimento_nome: procedimentos.find(p => p.id === a.procedimento_id)?.nome || 'Procedimento',
            comprimento: a.comprimento,
            valor_cobrado: a.valor_cobrado
          }]
        };
      });
      
      setAgendamentos(mapped);
    } catch (error) {
      console.error('[Agenda] Erro ao carregar:', error);
      showToast('ERRO AO CARREGAR AGENDA', 'error');
    }
  };`;

content = content.replace(
  /const carregarAtendimentos = async \(\) => {[\s\S]*?setAgendamentos\(data \|\| \[\]\);\n  };/,
  carregarAtendimentosNovo
);

// 4. Salvar (criar atendimento)
const salvarNovo = `
      const payload = {
        cliente: nomeCliente.toUpperCase(),
        data: dataSelecionada,
        horario: selecao.hora + ':00',
        profissional_id: selecao.profId,
        procedimento_id: servicos[0].procId,
        comprimento: servicos[0].requer_comprimento ? servicos[0].tamanho : null,
        valor_cobrado: servicos[0].valor_cobrado,
        valor_pago: novo.pago ? servicos.reduce((sum, s) => sum + s.valor_cobrado, 0) : 0,
        status: 'AGENDADO',
        procedimentos_adicionais: servicos.slice(1).map((s, idx) => ({
          procedimento_id: s.procId,
          comprimento: s.requer_comprimento ? s.tamanho : null,
          valor_cobrado: s.valor_cobrado,
          sequencia: idx + 2
        }))
      };

      const res = await api.post('/atendimentos', payload);
      if (!res.ok) {
         const err = await res.json();
         throw new Error(err.error || 'Erro ao criar atendimento na API');
      }
`;

content = content.replace(
  /const { data: rpcData, error: rpcError }[\s\S]*?if \(!rpcData\) throw new Error\('RPC de criação não retornou o id do atendimento'\);\n      }/,
  salvarNovo
);

// 5. togglePagamento
content = content.replace(
  /const { error } = await supabase\s*\.from\('atendimentos'\)\s*\.update\({ valor_pago: novoValorPago }\)\s*\.eq\('id', agendamentoSelecionado.id\)\s*\.eq\('salao_id', salaoId\);/,
  "const res = await api.put('/atendimentos/' + agendamentoSelecionado.id, { valor_pago: novoValorPago });\n      if (!res.ok) throw new Error('Erro na API ao atualizar pagamento');"
);

// 6. confirmarCancelarAgendamento
content = content.replace(
  /const { error } = await supabase\s*\.from\('atendimentos'\)\s*\.update\({ status: 'CANCELADO' }\)\s*\.eq\('id', agendamentoSelecionado.id\)\s*\.eq\('salao_id', salaoId\);/,
  "const res = await api.put('/atendimentos/' + agendamentoSelecionado.id, { status: 'CANCELADO' });\n      if (!res.ok) throw new Error('Erro na API ao cancelar');"
);

// 7. finalizarAtendimento
content = content.replace(
  /const { error } = await supabase\s*\.from\('atendimentos'\)\s*\.update\({ status: 'EXECUTADO' }\)\s*\.eq\('id', agendamentoSelecionado.id\)\s*\.eq\('salao_id', salaoId\);/,
  "const res = await api.put('/atendimentos/' + agendamentoSelecionado.id, { status: 'EXECUTADO' });\n      if (!res.ok) throw new Error('Erro na API ao finalizar');"
);

// 8. confirmarMover
content = content.replace(
  /const { error } = await supabase\s*\.from\('atendimentos'\)\s*\.update\([\s\S]*?\.eq\('salao_id', salaoId\);/,
  "const res = await api.put('/atendimentos/' + moverDados.agendId, {\n          profissional_id: moverDados.novoProfId,\n          horario: moverDados.novaHora + ':00',\n          data: moverDados.novaData\n        });\n      if (!res.ok) throw new Error('Erro na API ao mover');"
);

fs.writeFileSync('src/pages/Agenda.jsx', content);
console.log('Patch concluído com sucesso.');
