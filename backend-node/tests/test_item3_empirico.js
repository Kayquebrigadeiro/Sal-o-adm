require('dotenv').config();
const pool = require('./src/config/db');
const app = require('./src/app');

async function test() {
  try {
    // 1. Dados fixos do salão de teste (salaoteste@teste.com)
    const EMAIL = 'salaoteste@teste.com';
    const SENHA = 'SUA_SENHA_DE_TESTE';
    const SALAO_ID = '5e66c4ba-b5fa-4612-b867-515d6244782c';
    const PROFISSIONAL_ID = 'c4ed57f0-ed2f-4e70-b8ba-362d23be30eb';
    const PROCEDIMENTO_ID = '157ab22e-0422-4062-b2f6-534b75fde1fd';

    console.log('=== DADOS DO TESTE ===');
    console.log(`Email: ${EMAIL}`);
    console.log(`Salão ID: ${SALAO_ID}`);
    console.log(`Profissional ID: ${PROFISSIONAL_ID} (FUNCIONARIO, comissão 20%)`);
    console.log(`Procedimento ID: ${PROCEDIMENTO_ID} (custo_variavel 0)`);
    console.log(`Config: taxa_maquininha_pct=5, custo_fixo_por_atendimento=15\n`);

    // 2. Calcular valores esperados ANTES da chamada API
    const valor_cobrado = 100;
    const taxa_maquininha_pct = 5;
    const custo_fixo_por_atendimento = 15;
    const porc_comissao = 20;
    const custo_variavel = 0;

    const valor_maquininha_esperado = 100 * (5 / 100); // 5
    const valor_profissional_esperado = 100 * (20 / 100); // 20
    const custo_fixo_esperado = 15;
    const custo_variavel_esperado = 0;
    const lucro_liquido_esperado = 100 - 5 - 15 - 0 - 20; // 60

    console.log('=== VALORES ESPERADOS ===');
    console.log(`valor_cobrado: 100`);
    console.log(`taxa_maquininha_pct: 5%`);
    console.log(`custo_fixo_por_atendimento: 15`);
    console.log(`porcentagem_comissao: 20%`);
    console.log(`custo_variavel: 0`);
    console.log(`---`);
    console.log(`valor_maquininha esperado: ${valor_maquininha_esperado}`);
    console.log(`valor_profissional esperado: ${valor_profissional_esperado}`);
    console.log(`custo_fixo esperado: ${custo_fixo_esperado}`);
    console.log(`custo_variavel esperado: ${custo_variavel_esperado}`);
    console.log(`lucro_liquido esperado: ${lucro_liquido_esperado}`);
    console.log('');

    // 3. Iniciar servidor e fazer chamadas
    const server = app.listen(0, async () => {
      const port = server.address().port;
      console.log(`Servidor de teste iniciado na porta ${port}\n`);

      try {
        // Login como salaoteste@teste.com
        const loginRes = await fetch(`http://localhost:${port}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: EMAIL, senha: SENHA })
        });
        const loginData = await loginRes.json();
        console.log('=== LOGIN RESPONSE ===');
        console.log(JSON.stringify(loginData, null, 2));
        console.log('');

        if (!loginData.token) {
          console.error('Falha no login');
          server.close();
          process.exit(1);
        }
        const token = loginData.token;
        console.log('Token obtido com sucesso\n');

        // Criar atendimento de teste
        const dataTeste = '2026-07-17';
        const horarioTeste = '14:00:00';

        const criarRes = await fetch(`http://localhost:${port}/atendimentos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            cliente: 'Teste Item 3 - Empírico',
            profissional_id: PROFISSIONAL_ID,
            data: dataTeste,
            horario: horarioTeste,
            procedimento_id: PROCEDIMENTO_ID,
            comprimento: 'P',
            valor_cobrado: valor_cobrado,
            valor_pago: 0,
            status: 'EXECUTADO'
          })
        });
        const criarData = await criarRes.json();
        console.log('=== RESPOSTA CRIAÇÃO ATENDIMENTO (POST /atendimentos) ===');
        console.log(JSON.stringify(criarData, null, 2));
        console.log('');

        if (!criarData.sucesso || !criarData.id) {
          console.error('Falha ao criar atendimento');
          server.close();
          process.exit(1);
        }

        const atendimentoId = criarData.id;
        console.log(`Atendimento criado com ID: ${atendimentoId}\n`);

        // Chamar PUT /atendimentos/:id/procedimentos
        const substituirRes = await fetch(`http://localhost:${port}/atendimentos/${atendimentoId}/procedimentos`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            procedimentos: [
              {
                procedimento_id: PROCEDIMENTO_ID,
                comprimento: 'P',
                valor_cobrado: valor_cobrado,
                valor_pago: 0,
                valor_indicado: valor_cobrado,
                sequencia: 1
              }
            ]
          })
        });
        const substituirData = await substituirRes.json();
        console.log('=== RESPOSTA PUT /atendimentos/:id/procedimentos ===');
        console.log(JSON.stringify(substituirData, null, 2));
        console.log('');

        // Buscar o atendimento atualizado no banco para ver os valores calculados
        const [atendimentosDB] = await pool.query(
          'SELECT * FROM atendimentos WHERE id = ?',
          [atendimentoId]
        );

        if (atendimentosDB.length === 0) {
          console.error('Atendimento não encontrado no banco após atualização');
          server.close();
          process.exit(1);
        }

        const atendDB = atendimentosDB[0];
        console.log('=== DADOS DO ATENDIMENTO NO BANCO (APÓS PUT) ===');
        console.log(JSON.stringify(atendDB, null, 2));
        console.log('');

        // 4. Comparação campo por campo
        console.log('=== COMPARAÇÃO CAMPO POR CAMPO ===');

        const valor_maquininha_recebido = parseFloat(atendDB.valor_maquininha);
        const valor_profissional_recebido = parseFloat(atendDB.valor_profissional);
        const custo_fixo_recebido = parseFloat(atendDB.custo_fixo);
        const custo_variavel_recebido = parseFloat(atendDB.custo_variavel);
        const lucro_liquido_recebido = parseFloat(atendDB.lucro_liquido);

        console.log(`valor_maquininha: esperado ${valor_maquininha_esperado}, veio ${valor_maquininha_recebido}, ${valor_maquininha_recebido === valor_maquininha_esperado ? 'BATEU' : 'NÃO BATEU'}`);
        console.log(`valor_profissional: esperado ${valor_profissional_esperado}, veio ${valor_profissional_recebido}, ${valor_profissional_recebido === valor_profissional_esperado ? 'BATEU' : 'NÃO BATEU'}`);
        console.log(`custo_fixo: esperado ${custo_fixo_esperado}, veio ${custo_fixo_recebido}, ${custo_fixo_recebido === custo_fixo_esperado ? 'BATEU' : 'NÃO BATEU'}`);
        console.log(`custo_variavel: esperado ${custo_variavel_esperado}, veio ${custo_variavel_recebido}, ${custo_variavel_recebido === custo_variavel_esperado ? 'BATEU' : 'NÃO BATEU'}`);
        console.log(`lucro_liquido: esperado ${lucro_liquido_esperado}, veio ${lucro_liquido_recebido}, ${lucro_liquido_recebido === lucro_liquido_esperado ? 'BATEU' : 'NÃO BATEU'}`);

        // Limpar: deletar atendimento de teste
        await pool.query('DELETE FROM atendimento_procedimentos WHERE atendimento_id = ?', [atendimentoId]);
        await pool.query('DELETE FROM atendimentos WHERE id = ?', [atendimentoId]);
        console.log('\nAtendimento de teste deletado (limpeza).');

        server.close();
        process.exit(0);
      } catch (err) {
        console.error('Erro durante teste:', err);
        server.close();
        process.exit(1);
      }
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();