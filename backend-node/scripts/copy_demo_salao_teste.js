/**
 * Copia o Salão Beleza Real → Salão de Teste (demo com 3 meses de dados).
 * - Idempotente (ids destino derivados da origem via UUIDv5; pode rodar quantas
 *   vezes quiser que não duplica) e SEM transação explícita (TiDB).
 * - Com --limpar: apaga os dados operacionais do Salão de Teste antes de copiar
 *   (backup automático em docs/ é feito antes).
 * Uso: node scripts/copy_demo_salao_teste.js [--limpar]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../src/config/db');

// IDs determinísticos (UUIDv5): mesma origem → mesmo id destino em qualquer execução,
// então reexecutar NÃO duplica dados (INSERT IGNORE resolve conflitos por PK).
const NS_BYTES = Buffer.from('1b671a6440d5491e99b0da01ff1f3341', 'hex');
const idDe = (seed) => {
  const h = crypto.createHash('sha1').update(NS_BYTES).update(String(seed)).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const hex = h.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

const ORIGEM = 'df8ee394-b4c2-4a14-8692-6eda6d3ffe3d'; // Salão Beleza Real
const DESTINO = '5e66c4ba-b5fa-4612-b867-515d6244782c'; // Salão de Teste

const q2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

async function inserirLinha(conn, tabela, linha) {
  const cols = Object.keys(linha);
  const vals = cols.map((c) => linha[c]);
  const sql = `INSERT IGNORE INTO \`${tabela}\` (${cols.map((c) => `\`${c}\``).join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
  const [res] = await conn.query(sql, vals);
  return res.affectedRows;
}

(async () => {
  const conn = await pool.getConnection();
  try {
    // ── 0. Backup do estado atual do Salão de Teste ──────────────────────
    const backup = { gerado_em: new Date().toISOString(), destino: DESTINO, tabelas: {} };
    for (const t of ['clientes','profissionais','procedimentos','produtos_catalogo','custos_fixos_itens','atendimentos','atendimento_procedimentos','procedimento_produtos','despesas','homecare','gastos_pessoais','procedimentos_paralelos','configuracoes']) {
      const [rows] = t === 'atendimento_procedimentos'
        ? await conn.query(
            'SELECT ap.* FROM atendimento_procedimentos ap JOIN atendimentos a ON a.id = ap.atendimento_id WHERE a.salao_id = ?',
            [DESTINO]
          )
        : await conn.query(`SELECT * FROM \`${t}\` WHERE salao_id = ?`, [DESTINO]);
      backup.tabelas[t] = rows;
    }
    const backupPath = path.join(__dirname, '..', 'docs', `backup-salao-teste-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 1));
    console.log('Backup salvo em:', backupPath);

    // ── 0.5 Limpeza do destino (apenas com --limpar) ─────────────────────
    if (process.argv.includes('--limpar')) {
      console.log('Limpando dados operacionais do Salão de Teste...');
      await conn.query(
        'DELETE ap FROM atendimento_procedimentos ap JOIN atendimentos a ON a.id = ap.atendimento_id WHERE a.salao_id = ?',
        [DESTINO]
      );
      for (const t of ['atendimentos','procedimento_produtos','procedimentos_paralelos','homecare','despesas','gastos_pessoais','custos_fixos_itens','clientes','produtos_catalogo','procedimentos','profissionais']) {
        const [r] = await conn.query(`DELETE FROM \`${t}\` WHERE salao_id = ?`, [DESTINO]);
        console.log(`  ${t}: ${r.affectedRows} removidos`);
      }
    }

    // ── 1. Copiar tabelas de cadastro (mapa idVelho → idNovo) ────────────
    const mapas = { procedimentos: new Map(), produtos_catalogo: new Map(), profissionais: new Map() };
    for (const t of ['clientes','profissionais','procedimentos','produtos_catalogo','custos_fixos_itens','despesas','homecare','gastos_pessoais','procedimentos_paralelos']) {
      const [linhas] = await conn.query('SELECT * FROM ?? WHERE salao_id = ?', [t, ORIGEM]);
      let inseridos = 0;
      for (const r of linhas) {
        const idNovo = idDe(r.id);
        if (mapas[t]) mapas[t].set(r.id, idNovo);
        const linha = { ...r, id: idNovo, salao_id: DESTINO };
        inseridos += await inserirLinha(conn, t, linha);
      }
      console.log(`${t}: ${inseridos} inseridos (de ${linhas.length} na origem)`);
    }

    // ── 2. Atendimentos (mapa idVelho → idNovo; remap FKs) ───────────────
    const [atends] = await conn.query('SELECT * FROM atendimentos WHERE salao_id = ?', [ORIGEM]);
    const mapaAtend = new Map();
    let atendsInseridos = 0;
    for (const a of atends) {
      const idNovo = idDe(a.id);
      mapaAtend.set(a.id, idNovo);
      const linha = {
        ...a,
        id: idNovo,
        salao_id: DESTINO,
        profissional_id: mapas.profissionais.get(a.profissional_id) || null,
        procedimento_id: mapas.procedimentos.get(a.procedimento_id) || null,
      };
      atendsInseridos += await inserirLinha(conn, 'atendimentos', linha);
    }
    console.log(`atendimentos: ${atendsInseridos} inseridos (de ${atends.length} na origem)`);


    // ── 3. procedimento_produtos (remap procedimento + produto) ──────────
    const [pp] = await conn.query('SELECT * FROM procedimento_produtos WHERE salao_id = ?', [ORIGEM]);
    let ppInseridos = 0;
    for (const r of pp) {
      const procNovo = mapas.procedimentos.get(r.procedimento_id);
      const prodNovo = mapas.produtos_catalogo.get(r.produto_id);
      if (!procNovo || !prodNovo) continue;
      ppInseridos += await inserirLinha(conn, 'procedimento_produtos', {
        ...r, id: idDe('pp:' + r.id), salao_id: DESTINO, procedimento_id: procNovo, produto_id: prodNovo,
      });
    }
    console.log(`procedimento_produtos: ${ppInseridos} inseridos (de ${pp.length} na origem)`);

    // ── 4. atendimento_procedimentos (remap atendimento + procedimento) ──
    const [ap] = await conn.query(
      'SELECT ap.* FROM atendimento_procedimentos ap JOIN atendimentos a ON a.id = ap.atendimento_id WHERE a.salao_id = ?',
      [ORIGEM]
    );
    let apInseridos = 0;
    for (const r of ap) {
      const atNovo = mapaAtend.get(r.atendimento_id);
      const procNovo = mapas.procedimentos.get(r.procedimento_id);
      if (!atNovo || !procNovo) continue;
      apInseridos += await inserirLinha(conn, 'atendimento_procedimentos', {
        id: idDe('ap:' + r.id),
        atendimento_id: atNovo,
        procedimento_id: procNovo,
        comprimento: r.comprimento,
        valor_indicado: q2(r.valor_indicado),
        valor_cobrado: q2(r.valor_cobrado),
        valor_pago: q2(r.valor_pago),
        valor_pendente: q2(r.valor_pendente),
        sequencia: r.sequencia,
        criado_em: r.criado_em instanceof Date ? r.criado_em : new Date(),
        atualizado_em: new Date(),
      });
    }
    console.log(`atendimento_procedimentos: ${apInseridos} inseridos (de ${ap.length} na origem)`);

    // ── 5. Configurações do Salão de Teste = Configurações do Beleza Real ──
    const [cfgO] = await conn.query('SELECT * FROM configuracoes WHERE salao_id = ?', [ORIGEM]);
    if (cfgO[0]) {
      const cfg = { ...cfgO[0] };
      delete cfg.id;
      delete cfg.criado_em;
      delete cfg.salao_id; // NUNCA mover: sem isso o UPDATE transferia a linha para a origem!
      const cols = Object.keys(cfg);
      await conn.query(
        `UPDATE configuracoes SET ${cols.map((c) => `\`${c}\` = ?`).join(', ')} WHERE salao_id = ?`,
        [...cols.map((c) => cfg[c]), DESTINO]
      );
      console.log('configuracoes: atualizadas a partir do Beleza Real');
    }

    // ── 6. Verificação final ─────────────────────────────────────────────
    console.log('\n=== VERIFICAÇÃO FINAL (Salão de Teste) ===');
    for (const t of ['clientes','profissionais','procedimentos','produtos_catalogo','custos_fixos_itens','atendimentos','procedimento_produtos','despesas','homecare','gastos_pessoais','procedimentos_paralelos']) {
      const [r] = await conn.query('SELECT COUNT(*) c FROM ?? WHERE salao_id = ?', [t, DESTINO]);
      console.log(`  ${t}: ${r[0].c}`);
    }
    const [meses] = await conn.query("SELECT DATE_FORMAT(data,'%Y-%m') m, COUNT(*) c FROM atendimentos WHERE salao_id = ? GROUP BY m ORDER BY m", [DESTINO]);
    console.log('  atendimentos por mês:', JSON.stringify(meses));
    const [orf] = await conn.query(
      'SELECT COUNT(*) c FROM atendimentos a LEFT JOIN procedimentos p ON p.id = a.procedimento_id WHERE a.salao_id = ? AND a.procedimento_id IS NOT NULL AND p.id IS NULL',
      [DESTINO]
    );
    console.log('  atendimentos com procedimento órfão:', orf[0].c);
  } finally {
    conn.release();
    await pool.end();
  }
})().catch((e) => {
  console.error('ERRO FATAL:', e.message);
  process.exit(1);
});
