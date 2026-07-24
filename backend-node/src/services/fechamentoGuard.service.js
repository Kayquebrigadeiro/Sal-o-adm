const pool = require('../config/db');

/**
 * Verifica se um mês já está fechado para um dado salão.
 * @param {import('mysql2/promise').Connection|import('mysql2/promise').Pool} connection
 * @param {number|string} salao_id
 * @param {string|Date} data Data do registro (ex: YYYY-MM-DD)
 * @returns {Promise<boolean>} true se o mês estiver fechado
 */
async function mesEstaFechado(connection, salao_id, data) {
  if (!data) return false;
  
  const [rows] = await connection.query(
    "SELECT id FROM fechamentos WHERE salao_id = ? AND DATE_FORMAT(mes, '%Y-%m') = DATE_FORMAT(?, '%Y-%m') LIMIT 1",
    [salao_id, data]
  ).catch((err) => {
    throw new Error(`Erro ao verificar se o mês está fechado: ${err.message}`);
  });
  return rows.length > 0;
}

module.exports = { mesEstaFechado };
