require('dotenv').config();
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: true }
  });
  
  // get a vendor
  const [perfis] = await pool.query("SELECT * FROM perfis_acesso WHERE cargo = 'VENDEDOR' LIMIT 1");
  if (!perfis.length) throw new Error("No vendor found");
  const vendedor = perfis[0];
  
  const token = jwt.sign({ 
    auth_user_id: vendedor.auth_user_id, 
    cargo: vendedor.cargo, 
    salao_id: vendedor.salao_id 
  }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
  
  // crie um salao de teste via post
  const emailProp = `teste_${Date.now()}@teste.com`;
  console.log("Criando salão com email:", emailProp);
  try {
    const res = await fetch('http://localhost:3333/salao/criar-proprietaria', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        email: emailProp,
        senha: 'senha',
        nome: 'Proprietaria Teste',
        nome_salao: 'Salao Novo A',
        telefone: '11999999999',
        vendedor_id: vendedor.auth_user_id
      })
    });
    console.log("Criou salão:", await res.json());
  } catch (err) {
    console.error("Erro criar salao:", err);
  }
  
  // busque saloes
  try {
    const res = await fetch('http://localhost:3333/salao', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log("GET /salao result is array?", Array.isArray(data));
    if (Array.isArray(data)) {
        const salaoNovo = data.find(s => s.nome === 'Salao Novo A' && s.nome_proprietaria === 'Proprietaria Teste');
        console.log("Salão novo encontrado na listagem?", !!salaoNovo);
        if(salaoNovo) console.log("Salão encontrado:", salaoNovo);
    } else {
        console.log("Data recebida:", data);
    }
  } catch(err) {
    console.error("Erro GET salao:", err);
  }

  await pool.end();
}
main().catch(console.error);
