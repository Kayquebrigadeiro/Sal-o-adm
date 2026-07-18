require('dotenv').config();
const pool = require('./src/config/db');
const app = require('./src/app');

async function test() {
  try {
    const [usuarios] = await pool.query('SELECT * FROM usuarios_auth WHERE email = "kayque@gmail.com"');
    if (usuarios.length === 0) {
      console.log('Usuario kayque@gmail.com não encontrado');
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

    console.log('Test setup done in DB.');

    const server = app.listen(0, async () => {
      const port = server.address().port;
      console.log(`Server started on port ${port}`);

      // Test 1: Login with Email
      const res1 = await fetch(`http://localhost:${port}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'kayque@gmail.com', senha: 'MudarDepois123!' })
      });
      const data1 = await res1.json();
      console.log('Login Email Response:', data1);

      // Test 2: Login with Username
      const res2 = await fetch(`http://localhost:${port}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'teste_kayque', senha: 'MudarDepois123!' })
      });
      const data2 = await res2.json();
      console.log('Login Username Response:', data2);

      server.close();
      if (data1.token && data2.token) {
        console.log('✅ Ambos os logins funcionaram!');
        process.exit(0);
      } else {
        console.log('❌ Falha no login.');
        process.exit(1);
      }
    });

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
