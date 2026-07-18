require('dotenv').config();
const pool = require('./src/config/db');
const app = require('./src/app');

async function test() {
  try {
    const EMAIL = 'salaoteste@teste.com';
    const SENHA = 'MudarDepois123!';
    const SALAO_ID = '5e66c4ba-b5fa-4612-b867-515d6244782c';
    const PROFISSIONAL_ID = 'c4ed57f0-ed2f-4e70-b8ba-362d23be30eb';
    const PROC_PRINCIPAL_ID = '157ab22e-0422-4062-b2f6-534b75fde1fd'; // Massagem Terapêutica

    // Buscar um segundo procedimento
    const [procs] = await pool.query(
      'SELECT id, nome, custo_variavel FROM procedimentos WHERE salao_id = ? AND id != ? LIMIT 1',
      [SALAO_ID, PROC_PRINCIPAL_ID]
    );
    let PROC_ADICIONAL_ID;
    let PROC_ADICIONAL_NOME;
    let PROC_ADICIONAL_CUSTO = 0;

    if (procs.length > 0) {
      PROC_ADICIONAL_ID = procs[0].id;
      PROC_ADICIONAL_NOME = procs[0].nome;
      PROC_ADICIONAL_CUSTO = parseFloat(procs[0].custo_variavel || 0);
    } else {
      const { v4: uuidv4 } = require('uuid');
      PROC_ADICIONAL_ID = uuidv4();
      PROC_ADICIONAL_NOME = 'Procedimento Teste Adicional';
      await pool.query(
        'INSERT INTO procedimentos (id, salao_id, nome, custo_variavel, ativo) VALUES (?, ?, ?, 0, 1)',
        [PROC_ADICIONAL_ID, SALAO_ID, PROC_ADICIONAL_NOME]
      );
    }

    // Verificar produtos associados ao adicional
    const [prodAssoc] = await pool.query(
      'SELECT COUNT(*) as qtd FROM procedimento_produtos WHERE procedimento_id = ?',
      [PROC_ADICIONAL_ID]
    );
    if (prodAssoc[0].qtd > 0) {
      const { calcularCustoVariavelInsumos } = require('./src/services/financialEngine.service');
      const [prods] = await pool.query(
        `SELECT pc.preco_compra, pc.qtd_aplicacoes, pp.qtd_por_uso
         FROM procedimento_produtos pp
         JOIN produtos_catalogo pc ON pp.produto_id = pc.id
         WHERE pp.procedimento_id = ?`,
        [PROC_ADICIONAL_ID]
      );
      PROC_ADICIONAL_CUSTO = calcularCustoVariavelInsumos(prods.map(p => ({
        precoCompra: parseFloat(p.preco_compra),
        qtdAplicacoes: parseFloat(p.qtd_aplicacoes),
        qtdPorUso: parseFloat(p.qtd_por_uso)
      })));
    }

    console.log('=== DADOS DO TESTE ===');
    console.log(`Profissional: Carlos Simples (FUNCIONARIO, comissão 20%)`);
    console.log(`Procedimento principal: Massagem Terapêutica (custo_variavel 0)`);
    console.log(`Procedimento adicional: ${PROC_ADICIONAL_NOME} (custo_variavel ${PROC_ADICIONAL_CUSTO})`);
    console.log(`Config: taxa_maquininha_pct=5, custo_fixo_por_atendimento=15\n`);

    // 2. Calcular valores esperados na mão
    const valor_cobrado_principal = 100;
    const valor_cobrado_adicional = 50;
    const taxa_maquininha_pct = 5;
    const custo_fixo_por_atendimento = 15;
    const porc_comissao = 20;

    // --- Procedimento principal (valor 100) ---
    const vMaquininhaP = 100 * (5 / 100); // 5
    const vProfP = 100 * (20 / 100); // 20
    const vCustoFixoP = 15;
    const vCustoVarP = 0;
    const vLucroP = 100 - 5 - 15 - 0 - 20; // 60
    const vLucroPossivelP = 100 - 15 - 0 - 20; // 65

    // --- Procedimento adicional (valor 50) ---
    const vMaquininhaA = 50 * (5 / 100); // 2.5
    const vProfA = 50 * (20 / 100); // 10
    const vCustoFixoA = 15;
    const vCustoVarA = PROC_ADICIONAL_CUSTO;
    const vLucroA = 50 - 2.5 - 15 - vCustoVarA - 10; // 22.5 - custo_variavel
    const vLucroPossivelA = 50 - 15 - vCustoVarA - 10; // 25 - custo_variavel

    // --- TOTAIS (soma dos dois procedimentos) ---
    const totalValorCobrado = 100 + 50; // 150
    const totalValorMaquininha = vMaquininhaP + vMaquininhaA; // 7.5
    const totalValorProfissional = vProfP + vProfA; // 30
    const totalCustoFixo = vCustoFixoP + vCustoFixoA; // 30
    const totalCustoVariavel = vCustoVarP + vCustoVarA; // 0
    const totalLucroLiquido = vLucroP + vLucroA; // 82.5
    const totalLucroPossivel = vLucroPossivelP + vLucroPossivelA; // 90

    console.log('=== VALORES ESPERADOS (calculados na mão) ===');
    console.log('--- Procedimento Principal (valor 100) ---');
    console.log(`maquininha=5, profissional=20, custo_fixo=15, custo_var=0, lucro=60, lucro_possivel=65`);
    console.log('--- Procedimento Adicional (valor 50) ---');
    console.log(`maquininha=2.5, profissional=10, custo_fixo=15, custo_var=${vCustoVarA}, lucro=${vLucroA}, lucro_possivel=${vLucroPossivelA}`);
    console.log('--- TOTAIS (esperados em atendimentos após PUT) ---');
    console.log(`valor_cobrado=${totalValorCobrado}, maquininha=${totalValorMaquininha}, profissional=${totalValorProfissional}`);
    console.log(`custo_fixo=${totalCustoFixo}, custo_variavel=${totalCustoVariavel}, lucro_liquido=${totalLucroLiquido}, lucro_possivel=${totalLucroPossivel}`);
    console.log('');

    // 3. Iniciar servidor
    const server = app.listen(0, async () => {
      const port = server.address().port;
      console.log(`Servidor de teste iniciado na porta ${port}\n`);

      try {
        // Login
        const loginRes = await fetch(`http://localhost:${port}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: EMAIL, senha: SENHA })
        });
        const loginData = await loginRes.json();
        if (!loginData.token) {
          console.error('Falha no login');
          server.close();
          process.exit(1);
        }
        const token = loginData.token;
        console.log('Login OK\n');

        // Criar atendimento de teste
        const dataTeste = '2026-07-17';
        const horarioTeste = '16:00:00';

        const criarRes = await fetch(`http://localhost:${port}/atendimentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            cliente: 'Teste PUT Financeiro',
            profissional_id: PROFISSIONAL_ID,
            data: dataTeste,
            horario: horarioTeste,
            procedimento_id: PROC_PRINCIPAL_ID,
            comprimento: 'P',
            valor_cobrado: valor_cobrado_principal,
            valor_pago: 0,
            status: 'EXECUTADO'
          })
        });
        const criarData = await criarRes.json();
        if (!criarData.sucesso || !criarData.id) {
          console.error('Falha ao criar atendimento:', criarData);
          server.close();
          process.exit(1);
        }
        const atendimentoId = criarData.id;
        console.log(`Atendimento criado ID: ${atendimentoId}\n`);

        // 4. Chamar PUT /atendimentos/:id/procedimentos com 2 procedimentos
        const putBody = {
          procedimentos: [
            {
              procedimento_id: PROC_PRINCIPAL_ID,
              comprimento: 'P',
              valor_cobrado: valor_cobrado_principal,
              valor_pago: 0,
              valor_indicado: valor_cobrado_principal,
              sequencia: 1
            },
            {
              procedimento_id: PROC_ADICIONAL_ID,
              comprimento: 'P',
              valor_cobrado: valor_cobrado_adicional,
              valor_pago: 0,
              valor_indicado: valor_cobrado_adicional,
              sequencia: 2
            }
          ]
        };

        console.log('=== CHAMADA PUT /atendimentos/:id/procedimentos ===');
        console.log('Body:', JSON.stringify(putBody));
        console.log('');

        const substituirRes = await fetch(`http://localhost:${port}/atendimentos/${atendimentoId}/procedimentos`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(putBody)
        });
        const substituirData = await substituirRes.json();
        console.log('=== RESPOSTA DO PUT ===');
        console.log(JSON.stringify(substituirData, null, 2));
        console.log('');

        // 5. Verificar atendimento_procedimentos
        const [procedimentosSalvos] = await pool.query(
          'SELECT id, procedimento_id, valor_cobrado, sequencia FROM atendimento_procedimentos WHERE atendimento_id = ? ORDER BY sequencia',
          [atendimentoId]
        );
        console.log('=== REGISTROS EM atendimento_procedimentos ===');
        console.log(JSON.stringify(procedimentosSalvos, null, 2));
        console.log(`Quantidade: ${procedimentosSalvos.length} (esperado 2) => ${procedimentosSalvos.length === 2 ? 'OK' : 'ERRO'}`);
        console.log('');

        // 6. VERIFICAR VALORES FINANCEIROS EM atendimentos (O QUE IMPORTA!)
        const [atendDB] = await pool.query(
          'SELECT id, procedimento_id, valor_cobrado, valor_pago, valor_pendente, valor_maquininha, valor_profissional, custo_fixo, custo_variavel, lucro_liquido, lucro_possivel FROM atendimentos WHERE id = ?',
          [atendimentoId]
        );
        const a = atendDB[0];
        console.log('=== ATENDIMENTO PRINCIPAL (SELECT após PUT) ===');
        console.log(JSON.stringify(a, null, 2));
        console.log('');

        // 7. Comparação campo por campo
        console.log('=== COMPARAÇÃO CAMPO POR CAMPO (atendimentos) ===');
        const checks = [
          { campo: 'valor_cobrado', esperado: totalValorCobrado, veio: parseFloat(a.valor_cobrado) },
          { campo: 'valor_maquininha', esperado: totalValorMaquininha, veio: parseFloat(a.valor_maquininha) },
          { campo: 'valor_profissional', esperado: totalValorProfissional, veio: parseFloat(a.valor_profissional) },
          { campo: 'custo_fixo', esperado: totalCustoFixo, veio: parseFloat(a.custo_fixo) },
          { campo: 'custo_variavel', esperado: totalCustoVariavel, veio: parseFloat(a.custo_variavel) },
          { campo: 'lucro_liquido', esperado: totalLucroLiquido, veio: parseFloat(a.lucro_liquido) },
          { campo: 'lucro_possivel', esperado: totalLucroPossivel, veio: parseFloat(a.lucro_possivel) },
        ];
        let todosBateram = true;
        for (const c of checks) {
          const bateu = c.esperado === c.veio;
          if (!bateu) todosBateram = false;
          console.log(`${c.campo}: esperado ${c.esperado}, veio ${c.veio}, ${bateu ? 'BATEU' : 'NÃO BATEU'}`);
        }
        console.log(`\nProcedimento principal ID: ${a.procedimento_id} => ${a.procedimento_id === PROC_PRINCIPAL_ID ? 'OK' : 'ERRO'}`);
        console.log(`\nRESULTADO FINAL: ${todosBateram ? '✅ TODOS BATERAM' : '❌ ALGUM NÃO BATEU'}`);

        // Limpeza
        await pool.query('DELETE FROM atendimento_procedimentos WHERE atendimento_id = ?', [atendimentoId]);
        await pool.query('DELETE FROM atendimentos WHERE id = ?', [atendimentoId]);
        if (procs.length === 0) {
          await pool.query('DELETE FROM procedimentos WHERE id = ?', [PROC_ADICIONAL_ID]);
        }
        console.log('\nLimpeza concluída.');

        server.close();
        process.exit(todosBateram ? 0 : 1);
      } catch (err) {
        console.error('Erro:', err);
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