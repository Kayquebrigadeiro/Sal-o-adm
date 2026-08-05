const pool = require('../src/config/db');

async function test() {
  try {
    const [usuarios] = await pool.query('SELECT * FROM usuarios_auth WHERE email = "SEU_EMAIL_DE_TESTE@exemplo.com"');
    if (usuarios.length === 0) {
      console.log('Usuario SEU_EMAIL_DE_TESTE@exemplo.com não encontrado');
      process.exit(1);
    }
    const user = usuarios[0];
    
    // Check if there is a perfil for this user
    const [perfis] = await pool.query('SELECT * FROM perfis_acesso WHERE auth_user_id = ?', [user.id]);
    if (perfis.length === 0) {
      console.log('Perfil não encontrado, inserindo um com username teste_kayque...');
      await pool.query('INSERT INTO perfis_acesso (auth_user_id, cargo, username) VALUES (?, "VENDEDOR", "teste_kayque")', [user.id]);
    } else {
      console.log('Perfil encontrado. Atualizando username para teste_kayque...');
      await pool.query('UPDATE perfis_acesso SET username = "teste_kayque" WHERE auth_user_id = ?', [user.id]);
    }

    console.log('Test setup done. Now starting server to test login...');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
