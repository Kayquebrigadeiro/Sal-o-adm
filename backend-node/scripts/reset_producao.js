/**
 * RESET DE PRODUÇÃO — apaga TODAS as contas e dados do banco e (opcionalmente)
 * cria uma conta ADM (VENDEDOR) logo em seguida, pronta para gerar salões.
 *
 * ⚠️  DESTRUTIVO E IRREVERSÍVEL. Requer a flag --executar para agir.
 *
 * uso:
 *   node scripts/reset_producao.js                                    # modo leitura: só mostra contagens
 *   node scripts/reset_producao.js --executar --sim                   # limpa tudo (sem confirmar)
 *   node scripts/reset_producao.js --executar --sim \
 *        --admin-email adm@teste.com --admin-senha SenhaForte123 --admin-nome "Kayque"
 *
 * conexão (prod): passe via flags ou variáveis de ambiente
 *   --db-host gateway01...  --db-port 4000  --db-user ...  --db-password ...  --db-name ...
 *   (sem flags, usa o backend-node/.env padrão — STAGING. Confira antes de --executar!)
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const readline = require('readline');
const mysql = require('mysql2/promise');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    if (key === '--executar') { args.executar = true; continue; }
    if (key === '--sim') { args.sim = true; continue; }
    args[key.slice(2)] = argv[i + 1];
    i++;
  }
  return args;
}

// Tabelas de dados da aplicação (ordem segura de deleção). `planos` é catálogo
// global e é preservado. Tabelas inexistentes no banco são simplesmente puladas.
const TABELAS_DADOS = [
  'atendimentos_procedimentos_adicionais',
  'atendimentos',
  'procedimento_produtos',
  'procedimentos',
  'produtos_catalogo',
  'custos_fixos_itens',
  'homecare',
  'procedimentos_paralelos',
  'despesas',
  'gastos_pessoais',
  'clientes',
  'profissionais',
  'fechamentos',
  'pagamentos_assinatura',
  'assinaturas',
  'logins_gerados',
  'logs_acesso',
  'configuracoes',
  'perfis_acesso',
  'saloes',
  'usuarios_auth',
];

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const cfg = {
    host: args['db-host'] || process.env.DB_HOST,
    port: Number(args['db-port'] || process.env.DB_PORT || 4000),
    user: args['db-user'] || process.env.DB_USER,
    password: args['db-password'] || process.env.DB_PASSWORD,
    database: args['db-name'] || process.env.DB_NAME,
  };
  if (!cfg.host || !cfg.user || !cfg.database) {
    console.error('❌ Conexão incompleta. Informe --db-host, --db-user, --db-name (e --db-password se houver).');
    process.exit(1);
  }

  const isProdNome = !/^(app_db|test)$/i.test(cfg.database);
  console.log('═══════════════════════════════════════════════════');
  console.log('  RESET DE BANCO — REMOÇÃO DE TODAS AS CONTAS');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  host: ${cfg.host}:${cfg.port}`);
  console.log(`  banco: ${cfg.database}`);
  console.log(`  modo: ${args.executar ? '🚨 EXECUÇÃO REAL (--executar)' : '🔎 leitura (sem alterações)'}`);

  const pool = mysql.createPool({
    ...cfg,
    waitForConnections: true,
    connectionLimit: 4,
    connectTimeout: 15000,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  });

  try {
    // 1. Descobrir quais tabelas existem de fato
    const [tabelas] = await pool.query(
      `SELECT table_name AS nome FROM information_schema.tables WHERE table_schema = ?`,
      [cfg.database]
    );
    const existentes = new Set(tabelas.map(t => t.nome || t.TABLE_NAME));
    const alvo = TABELAS_DADOS.filter(t => existentes.has(t));
    const faltando = TABELAS_DADOS.filter(t => !existentes.has(t));

    // 2. Contagem prévia
    console.log('\n─── Contagem ANTES ───');
    let totalRegistros = 0;
    for (const t of alvo) {
      const [[c]] = await pool.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
      totalRegistros += c.n;
      if (c.n > 0) console.log(`  ${t.padEnd(38)} ${c.n}`);
    }
    console.log(`  TOTAL: ${totalRegistros} registros em ${alvo.length} tabelas`);
    if (faltando.length) console.log(`  (tabelas ausentes no banco, serão puladas: ${faltando.join(', ')})`);

    if (!args.executar) {
      console.log('\nℹ️  Modo leitura. Rode novamente com --executar para apagar.');
      await pool.end();
      process.exit(0);
    }

    if (totalRegistros === 0) {
      console.log('\nℹ️  Banco já está vazio — nada a apagar.');
    } else {
      if (!isProdNome) {
        console.error('\n❌ Nome de banco parece ser de desenvolvimento local. Abortando por segurança.');
        await pool.end();
        process.exit(1);
      }
      // Confirmação interativa (pulada se --sim)
      if (!args.sim) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const resp = await new Promise(r => rl.question(`\n⚠️  Isso apaga ${totalRegistros} registros em "${cfg.database}". Digite "APAGAR" para confirmar: `, r));
        rl.close();
        if (resp.trim() !== 'APAGAR') {
          console.log('Cancelado pelo usuário.');
          await pool.end();
          process.exit(1);
        }
      }

      // 3. Limpeza (FK checks off durante a transação)
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');
        for (const t of alvo) {
          const [r] = await conn.query(`DELETE FROM \`${t}\``);
          console.log(`  🗑️  ${t.padEnd(38)} -${r.affectedRows}`);
        }
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
        await conn.commit();
        console.log('\n✅ Todas as contas e dados foram apagados.');
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }

    // 4. Criar conta ADM (VENDEDOR) — mesmo modelo do admin.controller.js
    if (args['admin-email'] || args['admin-senha'] || args['admin-nome']) {
      const email = (args['admin-email'] || '').trim().toLowerCase();
      const senha = args['admin-senha'] || '';
      const nome = args['admin-nome'] || '';
      const username = (args['admin-username'] || email.split('@')[0]).trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('email de admin inválido');
      if (senha.length < 8) throw new Error('senha de admin deve ter pelo menos 8 caracteres');
      if (!nome) throw new Error('nome do admin é obrigatório');

      const [[dup]] = await pool.query('SELECT id FROM usuarios_auth WHERE email = ?', [email]);
      if (dup) throw new Error(`Já existe conta com o email ${email}`);

      const authUserId = randomUUID();
      const senhaHash = await bcrypt.hash(senha, 10);
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query('INSERT INTO usuarios_auth (id, email, senha_hash) VALUES (?, ?, ?)', [authUserId, email, senhaHash]);
        await conn.query(
          'INSERT INTO perfis_acesso (auth_user_id, salao_id, cargo, username) VALUES (?, NULL, ?, ?)',
          [authUserId, 'VENDEDOR', username]
        );
        await conn.commit();
        console.log('\n✅ Conta ADM (VENDEDOR) criada com sucesso!');
        console.log(`   user_id: ${authUserId}`);
        console.log(`   login:   ${email} (ou username: ${username})`);
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }
  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();

