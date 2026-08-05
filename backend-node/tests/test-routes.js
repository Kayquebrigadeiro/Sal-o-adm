async function test() {
  try {
    // 1. Login
    const loginRes = await fetch('http://127.0.0.1:3333/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'jaco@salaosecreto.com', senha: 'password123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login OK, Token obtido.');

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Test Homecare
    const hcRes = await fetch('http://127.0.0.1:3333/api/relatorios/homecare-anual?ano=2026', { headers });
    const hcData = await hcRes.json();
    console.log('Homecare Anual:', hcData);

    // 3. Test Fechamento GET
    const fGet = await fetch('http://127.0.0.1:3333/api/fechamento/2026-07', { headers });
    const fGetData = await fGet.json();
    console.log('Fechamento GET (isFechado):', fGetData.isFechado);

    // 4. Test Fechamento POST
    const fPost = await fetch('http://127.0.0.1:3333/api/fechamento/2026-07', { method: 'POST', headers });
    const fPostData = await fPost.json();
    console.log('Fechamento POST 1:', fPostData);

    // 5. Test Fechamento POST again
    const fPost2 = await fetch('http://127.0.0.1:3333/api/fechamento/2026-07', { method: 'POST', headers });
    const fPost2Data = await fPost2.json();
    console.log('Fechamento POST 2 (ESPERA ERRO 400):', fPost2Data);

    console.log('Tudo OK!');

  } catch (err) {
    console.error('Test script errored:', err);
  }
}

test();
