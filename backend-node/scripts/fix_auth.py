import re

path = "src/controllers/auth.controller.js"

with open(path, "r", encoding="utf-8") as f:
    conteudo = f.read()

# Correção 1: remover o .catch() + validação 404 que causa o vazamento de
# informação no login (usuário não encontrado deve cair no 401 genérico
# mais abaixo, não retornar 404 direto aqui).
antigo_1 = (
    "const [rows] = await pool.query('SELECT id, email, senha_hash FROM "
    "usuarios_auth WHERE email = ?', [identificador]).catch((err) => { "
    "throw new Error(`Erro ao buscar usuário: ${err.message}`); }); "
    "if (!rows || rows.length === 0) { return res.status(404).json({ "
    "error: 'Usuário não encontrado' }); }"
)
novo_1 = (
    "const [rows] = await pool.query('SELECT id, email, senha_hash FROM "
    "usuarios_auth WHERE email = ?', [identificador]);"
)

if antigo_1 in conteudo:
    conteudo = conteudo.replace(antigo_1, novo_1)
    print("Correção 1 aplicada (login).")
else:
    print("AVISO: trecho da Correção 1 não encontrado exatamente como esperado.")

# Correção 2: reverter a comparação do PIN do dashboard para texto puro
# (era bcrypt.compareSync, que quebra porque o PIN nunca foi hasheado).
antigo_2 = "const match = bcrypt.compareSync(password, config.dashboard_pin);"
novo_2 = "const match = password === config.dashboard_pin;"

if antigo_2 in conteudo:
    conteudo = conteudo.replace(antigo_2, novo_2)
    print("Correção 2 aplicada (PIN dashboard).")
else:
    print("AVISO: trecho da Correção 2 não encontrado exatamente como esperado.")

with open(path, "w", encoding="utf-8") as f:
    f.write(conteudo)

print("Arquivo salvo.")
