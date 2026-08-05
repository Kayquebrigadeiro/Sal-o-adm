async function test() {
  try {
    const loginRes = await fetch('http://127.0.0.1:3333/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'jaco@salaosecreto.com', senha: 'password123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // 1. Post fechamento para 2026-07
    await fetch('http://127.0.0.1:3333/api/fechamento/2026-07', { method: 'POST', headers });
    
    // 2. Try to create atendimento in 2026-07-15
    const atData = {
      cliente: 'Teste Bloqueio',
      profissional_id: 'algum-uuid', // need real uuid if foreign key is enforced
      data: '2026-07-15',
      horario: '10:00:00',
      procedimento_id: 'algum-uuid',
      valor_cobrado: 100
    };
    
    const atRes = await fetch('http://127.0.0.1:3333/api/atendimentos', {
      method: 'POST',
      headers,
      body: JSON.stringify(atData)
    });
    
    const atJson = await atRes.json();
    console.log('Criar atendimento em mês FECHADO (2026-07-15) - Status:', atRes.status, 'Resposta:', atJson);

    // 3. Try to create atendimento in 2026-08-15
    const atData2 = { ...atData, data: '2026-08-15' };
    const atRes2 = await fetch('http://127.0.0.1:3333/api/atendimentos', {
      method: 'POST',
      headers,
      body: JSON.stringify(atData2)
    });
    const atJson2 = await atRes2.json();
    console.log('Criar atendimento em mês ABERTO (2026-08-15) - Status:', atRes2.status, 'Resposta:', atJson2);

  } catch(e) {
    console.error(e);
  }
}
test();
