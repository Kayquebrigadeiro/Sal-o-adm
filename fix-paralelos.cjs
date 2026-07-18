const fs = require('fs');
let code = fs.readFileSync('Paralelos.jsx.bak', 'utf-8');

// Replace import
code = code.replace(
  "import { supabase } from '../supabaseClient';",
  "import { api } from '../services/api';"
);

// Replace carregarDados
code = code.replace(
  `  const carregarDados = async () => {
    setLoading(true);
    try {
      const [ano, mes] = mesSelecionado.split('-');
      const inicioMes = \`\${ano}-\${mes}-01\`;
      const fimMes = new Date(ano, mes, 0).toISOString().split('T')[0];

      const [paralelosRes, profsRes] = await Promise.all([
        supabase.from('procedimentos_paralelos')
          .select('id, data, cliente, descricao, valor, valor_pago, valor_pendente, valor_profissional, profissional_id, profissionais(nome)')
          .eq('salao_id', salaoId)
          .gte('data', inicioMes)
          .lte('data', fimMes)
          .order('data', { ascending: false }),
        supabase.from('profissionais').select('id, nome').eq('salao_id', salaoId).eq('ativo', true)
      ]);

      setParalelos(paralelosRes.data || []);
      setProfissionais(profsRes.data || []);
    } catch (error) {
      showToast('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };`,
  `  const carregarDados = async () => {
    setLoading(true);
    try {
      const [ano, mes] = mesSelecionado.split('-');
      const [resPar, resProf] = await Promise.all([
        api.get('/cadastros/procedimentos-paralelos'),
        api.get('/cadastros/profissionais')
      ]);

      if (!resPar.ok || !resProf.ok) throw new Error('Erro nas requisições');

      const dataPar = await resPar.json();
      const dataProf = await resProf.json();

      const filtrados = (dataPar || []).filter(v => {
        if (!v.data) return false;
        const d = typeof v.data === 'string' ? v.data.slice(0, 7) : '';
        return d === \`\${ano}-\${mes}\`;
      }).sort((a, b) => (b.data || '').localeCompare(a.data || ''));

      const mapProfs = {};
      (dataProf || []).forEach(p => mapProfs[p.id] = p.nome);

      const paralelosComProf = filtrados.map(p => ({
        ...p,
        profissionais: { nome: mapProfs[p.profissional_id] || '' }
      }));

      setParalelos(paralelosComProf);
      setProfissionais(dataProf || []);
    } catch (error) {
      showToast('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };`
);

// Replace salvar
code = code.replace(
  `  const salvar = async () => {
    try {
      const dados = {
        salao_id: salaoId,
        data: form.data,
        cliente: form.cliente,
        descricao: form.descricao,
        profissional_id: form.profissional_id || null,
        valor: Number(form.valor),
        valor_pago: Number(form.valor_pago),
        valor_profissional: Number(form.valor_profissional)
      };

      if (paraleloEditando) {
        await supabase.from('procedimentos_paralelos').update(dados).eq('id', paraleloEditando.id).eq('salao_id', salaoId);
        showToast('Atualizado', 'success');
      } else {
        await supabase.from('procedimentos_paralelos').insert(dados);
        showToast('Criado', 'success');
      }
      setModalAberto(false);
      carregarDados();
    } catch (error) {
      showToast('Erro ao salvar', 'error');
    }
  };`,
  `  const salvar = async () => {
    try {
      const v = Number(form.valor || 0);
      const p = Number(form.valor_pago || 0);
      const dados = {
        data: form.data,
        cliente: form.cliente,
        descricao: form.descricao,
        profissional_id: form.profissional_id || null,
        valor: v,
        valor_pago: p,
        valor_pendente: v - p,
        valor_profissional: Number(form.valor_profissional || 0)
      };

      let res;
      if (paraleloEditando) {
        res = await api.put('/cadastros/procedimentos-paralelos/' + paraleloEditando.id, dados);
      } else {
        res = await api.post('/cadastros/procedimentos-paralelos', dados);
      }
      
      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.error || 'Erro na API');
      }

      showToast(paraleloEditando ? 'Atualizado' : 'Criado', 'success');
      setModalAberto(false);
      carregarDados();
    } catch (error) {
      showToast(error.message || 'Erro ao salvar', 'error');
    }
  };`
);

// Replace deletar
code = code.replace(
  `  const deletar = async (id) => {
    try {
      await supabase.from('procedimentos_paralelos').delete().eq('id', id).eq('salao_id', salaoId);
      showToast('Deletado', 'success');
      carregarDados();
    } catch (error) {
      showToast('Erro ao deletar', 'error');
    }
  };`,
  `  const deletar = async (id) => {
    try {
      const res = await api.delete('/cadastros/procedimentos-paralelos/' + id);
      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.error || 'Erro na API');
      }
      showToast('Deletado', 'success');
      carregarDados();
    } catch (error) {
      showToast(error.message || 'Erro ao deletar', 'error');
    }
  };`
);

fs.writeFileSync('src/pages/Paralelos.jsx', code);
console.log('Feito!');
