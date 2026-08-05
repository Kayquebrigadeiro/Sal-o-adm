const fs = require('fs');
let content = fs.readFileSync('src/pages/Agenda.jsx', 'utf8');

// replace supabase.from('profissionais').insert
content = content.replace(
  /const \{ error \} = await supabase\.from\('profissionais'\)\.insert\(\[\{\s*salao_id: salaoId,\s*nome: novoProf\.nome\.trim\(\)\.toUpperCase\(\),\s*cargo: novoProf\.cargo,\s*salario_fixo: 0,\s*ativo: true\s*\}\]\);/,
  `const resInsert = await api.post('/cadastros/profissionais', {
        nome: novoProf.nome.trim().toUpperCase(),
        cargo: novoProf.cargo,
        salario_fixo: 0,
        ativo: true
      });
      const error = !resInsert.ok ? new Error('Erro API') : null;`
);

content = content.replace(
  /const \{ data: profData \} = await supabase\.from\('profissionais'\)\.select\('id, nome, cargo'\)\.eq\('salao_id', salaoId\)\.eq\('ativo', true\)\.order\('nome'\);/g,
  `const profData = await api.get('/cadastros/profissionais').then(r => r.json());`
);

// Adicionar-me 👑 (1)
content = content.replace(
  /const \{ error \} = await supabase\.from\('profissionais'\)\.upsert\(\{[\s\S]*?\}, \{ onConflict: 'salao_id,nome' \}\);/,
  `const resUp = await api.post('/cadastros/profissionais', {
                  nome,
                  cargo: 'PROPRIETARIO',
                  salario_fixo: 0,
                  ativo: true
                });
                const error = !resUp.ok ? new Error('Erro API') : null;`
);

// Adicionar-me 👑 (2)
content = content.replace(
  /const \{ error \} = await supabase\.from\('profissionais'\)\.insert\(\{ salao_id: salaoId, nome, cargo: 'PROPRIETARIO', salario_fixo: 0, ativo: true \}\);/,
  `const resIn2 = await api.post('/cadastros/profissionais', { nome, cargo: 'PROPRIETARIO', salario_fixo: 0, ativo: true });
                    const error = !resIn2.ok ? new Error('Erro API') : null;`
);

fs.writeFileSync('src/pages/Agenda.jsx', content);
console.log('Patch 2 concluído.');
