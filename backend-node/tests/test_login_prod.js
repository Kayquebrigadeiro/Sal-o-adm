require('dotenv').config();
const app = require('../src/app');

async function test() {
  const server = app.listen(0, async () => {
    const port = server.address().port;
    try {
      const res = await fetch(`http://localhost:${port}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'kayque@gmail.com', senha: 'MudarDepois123!' })
      });
      const data = await res.json();
      console.log('Status:', res.status);
      console.log('Has token:', !!data.token);
      console.log('Cargo:', data.cargo);
      console.log('Salao_id:', data.salao_id);
      console.log('Email:', data.email);
      console.log('User_id:', data.user_id);
      if (res.status === 200 && data.token) {
        console.log('✅ LOGIN PROD OK');
        process.exit(0);
      } else {
        console.log('❌ LOGIN PROD FALHOU:', JSON.stringify(data));
        process.exit(1);
      }
    } catch (err) {
      console.error('Erro:', err.message);
      process.exit(1);
    } finally {
      server.close();
    }
  });
}
test();