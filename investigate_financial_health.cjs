const mysql = require('mysql2/promise');

const connection_config = {
  host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: 'SEU_USUARIO_DB_PROD',
  password: 'SUA_SENHA_DB_PROD',
  database: 'Salaosecreto'
};

async function investigate() {
  let conn;
  try {
    conn = await mysql.createConnection(connection_config);
    
    console.log('=== INVESTIGAÇÃO 1: SAÚDE FINANCEIRA ===\n');
    
    // Step 1: Find maria@gmail.com user and get salao_id
    console.log('1. Buscando usuário maria@gmail.com e seu salao_id...\n');
    
    const [usuarios] = await conn.execute(
      `SELECT id, email FROM usuarios WHERE email = 'maria@gmail.com'`
    );
    
    if (usuarios.length === 0) {
      console.log('❌ Usuário maria@gmail.com não encontrado');
      return;
    }
    
    const usuario_id = usuarios[0].id;
    console.log(`✓ Usuário encontrado: ID ${usuario_id}`);
    
    // Get salao_id from perfis_acesso
    const [perfis] = await conn.execute(
      `SELECT salao_id FROM perfis_acesso WHERE usuario_id = ?`,
      [usuario_id]
    );
    
    if (perfis.length === 0) {
      console.log('❌ Nenhum salão associado ao usuário');
      return;
    }
    
    const salao_id = perfis[0].salao_id;
    console.log(`✓ Salão ID encontrado: ${salao_id}\n`);
    
    // Step 2: Query all tables that affect health financial formula
    console.log(`2. Coletando dados de TODAS as tabelas para salao_id = ${salao_id}...\n`);
    
    // Atendimentos (EXECUTADO only)
    const [atendimentos] = await conn.execute(
      `SELECT id, data, lucro_real, valor_total, valor_procedimentos, comissao, status 
       FROM atendimentos 
       WHERE salao_id = ? AND status = 'EXECUTADO'`,
      [salao_id]
    );
    
    console.log(`📊 ATENDIMENTOS (status=EXECUTADO): ${atendimentos.length} registros`);
    if (atendimentos.length > 0) {
      atendimentos.forEach(a => {
        console.log(`  - ID: ${a.id}, Data: ${a.data}, Lucro Real: R$${a.lucro_real}, Total: R$${a.valor_total}, Status: ${a.status}`);
      });
      const soma_lucro = atendimentos.reduce((sum, a) => sum + (a.lucro_real || 0), 0);
      console.log(`  💰 SOMA LUCRO_REAL: R$${soma_lucro}\n`);
    } else {
      console.log(`  (nenhum)\n`);
    }
    
    // Homecare
    const [homecare] = await conn.execute(
      `SELECT id, data, lucro_real, valor_total, status 
       FROM homecare 
       WHERE salao_id = ? AND status = 'EXECUTADO'`,
      [salao_id]
    );
    
    console.log(`📊 HOMECARE (status=EXECUTADO): ${homecare.length} registros`);
    if (homecare.length > 0) {
      homecare.forEach(h => {
        console.log(`  - ID: ${h.id}, Data: ${h.data}, Lucro Real: R$${h.lucro_real}, Total: R$${h.valor_total}`);
      });
      const soma_homecare = homecare.reduce((sum, h) => sum + (h.lucro_real || 0), 0);
      console.log(`  💰 SOMA LUCRO_REAL: R$${soma_homecare}\n`);
    } else {
      console.log(`  (nenhum)\n`);
    }
    
    // Despesas
    const [despesas] = await conn.execute(
      `SELECT id, descricao, valor, tipo 
       FROM despesas 
       WHERE salao_id = ?`,
      [salao_id]
    );
    
    console.log(`📊 DESPESAS: ${despesas.length} registros`);
    if (despesas.length > 0) {
      despesas.forEach(d => {
        console.log(`  - ID: ${d.id}, Descrição: ${d.descricao}, Valor: R$${d.valor}, Tipo: ${d.tipo}`);
      });
      const soma_despesas = despesas.reduce((sum, d) => sum + (d.valor || 0), 0);
      console.log(`  💰 SOMA DESPESAS: R$${soma_despesas}\n`);
    } else {
      console.log(`  (nenhum)\n`);
    }
    
    // Profissionais com salário fixo ATIVO
    const [profissionais] = await conn.execute(
      `SELECT id, nome, salario_fixo, ativo 
       FROM profissionais 
       WHERE salao_id = ? AND ativo = true AND salario_fixo IS NOT NULL AND salario_fixo > 0`,
      [salao_id]
    );
    
    console.log(`📊 PROFISSIONAIS (ativo=true, salario_fixo > 0): ${profissionais.length} registros`);
    if (profissionais.length > 0) {
      profissionais.forEach(p => {
        console.log(`  - ID: ${p.id}, Nome: ${p.nome}, Salário Fixo: R$${p.salario_fixo}, Ativo: ${p.ativo}`);
      });
      const soma_salarios = profissionais.reduce((sum, p) => sum + (p.salario_fixo || 0), 0);
      console.log(`  💰 SOMA SALÁRIOS FIXOS: R$${soma_salarios}\n`);
    } else {
      console.log(`  (nenhum)\n`);
    }
    
    // Step 3: Calculate formula manually
    console.log('=== CÁLCULO MANUAL DA FÓRMULA ===\n');
    
    const soma_lucro_atendimentos = atendimentos.reduce((sum, a) => sum + (a.lucro_real || 0), 0);
    const soma_lucro_homecare = homecare.reduce((sum, h) => sum + (h.lucro_real || 0), 0);
    const soma_despesas = despesas.reduce((sum, d) => sum + (d.valor || 0), 0);
    const soma_salarios = profissionais.reduce((sum, p) => sum + (p.salario_fixo || 0), 0);
    
    const saude_financeira_calculada = soma_lucro_atendimentos + soma_lucro_homecare - soma_despesas - soma_salarios;
    
    console.log(`Lucro Atendimentos (EXECUTADO):  + R$${soma_lucro_atendimentos}`);
    console.log(`Lucro Homecare (EXECUTADO):      + R$${soma_lucro_homecare}`);
    console.log(`Total Despesas:                  - R$${soma_despesas}`);
    console.log(`Total Salários Fixos (ativos):   - R$${soma_salarios}`);
    console.log(`────────────────────────────────────────`);
    console.log(`SAÚDE FINANCEIRA CALCULADA:      = R$${saude_financeira_calculada}`);
    console.log(`\nEsperado no card de saúde:        R$500`);
    console.log(`Discrepância: R$${Math.abs(saude_financeira_calculada - 500)}\n`);
    
    // Step 4: Check for old test data
    console.log('=== VERIFICAÇÃO: DADOS DE TESTE ANTIGOS? ===\n');
    
    const [todos_atendimentos] = await conn.execute(
      `SELECT id, data, status, valor_total, criado_em 
       FROM atendimentos 
       WHERE salao_id = ?
       ORDER BY criado_em DESC`,
      [salao_id]
    );
    
    console.log(`Total de atendimentos (qualquer status): ${todos_atendimentos.length}`);
    if (todos_atendimentos.length > 0) {
      console.log('Últimos 10 atendimentos:');
      todos_atendimentos.slice(0, 10).forEach(a => {
        console.log(`  - ID: ${a.id}, Data: ${a.data}, Status: ${a.status}, Valor: R$${a.valor_total}, Criado em: ${a.criado_em}`);
      });
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

investigate();
