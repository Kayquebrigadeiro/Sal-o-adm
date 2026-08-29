/**
 * cria uma conta admin (VENDEDOR) no banco — mesmo modelo do endpoint
 * POST /admin (src/controllers/admin.controller.js) e da edge function
 * supabase/functions/criar-admin:
 *   1. INSERT INTO usuarios_auth  (id, email, senha_hash)
 *   2. INSERT INTO perfis_acesso  (auth_user_id, salao_id, cargo, username)
 *
 * uso:
 *   npm run criar-admin                                  # modo interativo
 *   node scripts/criar_admin.js --email a@b.com --senha minhasenha8 --nome "Nome"
 *
 * opções:
 *   --email <email>       email de login (obrigatório)
 *   --senha <senha>       senha em texto puro (mín. 8 caracteres); se omitida no
 *                         modo interativo, será pedida (digitação oculta)
 *   --nome <nome>         nome exibido (obrigatório)
 *   --cargo <cargo>       VENDEDOR (padrão) | PROPRIETARIO | FUNCIONARIO
 *   --salao-id <id>       vincula o perfil a um salão (VENDEDOR não deve ter)
 *   --username <user>     username de login alternativo (padrão: prefixo do email)
 *   --dry-run             valida e mostra o que seria inserido, sem tocar no banco
 *   --help                mostra esta ajuda
 *
 * credenciais do banco vêm do backend-node/.env (nunca são impressas)
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const fs = require('fs');
const readline = require('readline');
const pool = require('../src/config/db');

const CARGOS_VALIDOS = ['VENDEDOR', 'PROPRIETARIO', 'FUNCIONARIO'];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    if (key === '--dry-run') { args.dryRun = true; continue; }
    if (key === '--help' || key === '--h') { args.help = true; continue; }
    args[key.slice(2)] = argv[i + 1];
    i++;
  }
  return args;
}

function prompt(pergunta) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(pergunta, ans => { rl.close(); resolve(ans.trim()); }));
}

// prompt com digitação oculta (muta o eco do output enquanto digita a senha)
function promptSenha(pergunta) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise(resolve => {
    rl.question(pergunta, ans => {
      rl.output.write('\n');
      rl.close();
      resolve(ans.trim());
    });
    rl._writeToOutput = function (str) {
      if (str.startsWith(pergunta)) {
        rl.output.write(str);                 // ecoa só a pergunta
      } else if (/[\r\n]/.test(str)) {
        rl.output.write('\n');
      } else {
        rl.output.write('*');                 // substitui cada caractere por '*'
      }
    };
  });
}

const isTTY = process.stdin.isTTY === true;


function gerarSenhaForte() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function validar({ email, senha, nome, cargo, salaoId }) {
  const erros = [];
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.push('email inválido');
  if (!senha || senha.length < 8) erros.push('senha deve ter pelo menos 8 caracteres');
  if (!nome) erros.push('nome é obrigatório');
  if (!CARGOS_VALIDOS.includes(cargo)) erros.push(`cargo deve ser um de: ${CARGOS_VALIDOS.join(', ')}`);
  if (salaoId != null && (!Number.isInteger(Number(salaoId)) || Number(salaoId) <= 0)) erros.push('salao-id deve ser um número inteiro positivo');
  if (cargo === 'VENDEDOR' && salaoId != null) erros.push('VENDEDOR é admin global e não deve ter salao-id');
  return erros;
}


async function criarAdmin({ email, senha, nome, cargo, salaoId, username, dryRun }) {
  const authUserId = randomUUID();
  const usernameFinal = username || email.split('@')[0];
  const salaoIdFinal = salaoId != null ? Number(salaoId) : null;

  console.log('\n=== Conta a ser criada ===');
  console.log(`  id:       ${authUserId}`);
  console.log(`  email:    ${email}`);
  console.log(`  nome:     ${nome}`);
  console.log(`  cargo:    ${cargo}`);
  console.log(`  salao_id: ${salaoIdFinal ?? 'NULL (admin global)'}`);
  console.log(`  username: ${usernameFinal}`);
  if (dryRun) {
    console.log('\n[dry-run] nada foi gravado no banco. ✅');
    return;
  }

  const senhaHash = await bcrypt.hash(senha, 10); // mesma convenção dos controllers (rounds 10)

  // checagem amigável de duplicidade (o UNIQUE do email também protege)
  const [dup] = await pool.query('SELECT id, email FROM usuarios_auth WHERE email = ?', [email]);
  if (dup.length > 0) {
    throw new Error(`Já existe uma conta com o email ${email} (id: ${dup[0].id})`);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [resultAuth] = await connection.query(
      'INSERT INTO usuarios_auth (id, email, senha_hash) VALUES (?, ?, ?)',
      [authUserId, email, senhaHash]
    );
    if (!resultAuth.affectedRows) throw new Error('Erro ao inserir usuário');

    await connection.query(
      'INSERT INTO perfis_acesso (auth_user_id, salao_id, cargo, username) VALUES (?, ?, ?, ?)',
      [authUserId, salaoIdFinal, cargo, usernameFinal]
    );

    await connection.commit();
    console.log('\n✅ Conta admin criada com sucesso!');
    console.log(`   user_id: ${authUserId}`);
    console.log(`   login:   ${email} (ou username: ${usernameFinal})`);
  } catch (err) {
    await connection.rollback(); // desfaz usuarios_auth se o perfil falhar
    throw err;
  } finally {
    connection.release();
  }
}

function mostrarAjuda() {
  const doc = fs.readFileSync(__filename, 'utf8');
  console.log(doc.substring(doc.indexOf('/*') + 2, doc.indexOf('*/')));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    mostrarAjuda();
    process.exit(0);
  }

  let { email, senha, nome, cargo, salaoId, username } = args;
  cargo = (cargo || 'VENDEDOR').toUpperCase();
  const dryRun = !!args.dryRun;

  // modo interativo: pergunta o que faltar (somente em terminal com TTY;
  // fora de TTY, valores ausentes caem na validação com mensagem clara)
  if (isTTY) {
    if (!email) email = await prompt('Email de login: ');
    if (!nome) nome = await prompt('Nome: ');
    if (!args.cargo) {
      const resp = (await prompt(`Cargo [${CARGOS_VALIDOS.join('/')}], enter = VENDEDOR: `)).toUpperCase();
      if (resp) cargo = resp;
    }
    if (cargo !== 'VENDEDOR' && salaoId == null && !dryRun) {
      const resp = await prompt('salao-id (enter = NULL): ');
      if (resp) salaoId = resp;
    }
    if (!senha) {
      senha = await promptSenha('Senha (mín. 8 caracteres, digitação oculta — enter = gerar forte): ');
      if (!senha) {
        senha = gerarSenhaForte();
        console.log(`\n🔑 Senha gerada (anote agora, não será exibida novamente): ${senha}`);
      }
    }
  } else if (!email || !nome || !senha) {
    console.error('\n❌ Modo não-interativo: informe --email, --senha e --nome (ou rode em um terminal interativo para o modo guiado).');
    console.error('   Ex.: node scripts/criar_admin.js --email a@b.com --senha minhasenha8 --nome "Nome"\n');
    process.exit(1);
  }

  const erros = validar({ email, senha, nome, cargo, salaoId });
  if (erros.length > 0) {
    console.error('\n❌ Dados inválidos:');
    erros.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  try {
    await criarAdmin({ email, senha, nome, cargo, salaoId, username, dryRun });
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Erro ao criar conta:', err.message);
    if (err.code === 'ER_DUP_ENTRY') console.error('   (email ou username já existe — constraint UNIQUE)');
    process.exit(1);
  } finally {
    await pool.end(); // encerra o pool para o processo terminar
  }
}

main();
