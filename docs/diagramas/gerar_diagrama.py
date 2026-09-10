#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera SALAO-ADM-diagrama-arquitetura-v8.1.2.drawio (12 abas) - fiel ao codigo-fonte."""
import html, os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "SALAO-ADM-diagrama-arquitetura-v8.1.2.drawio")

_cells, _cid, pages = [], [0], []

def esc(s):
    return html.escape(str(s))

def nid():
    _cid[0] += 1
    return "c%d" % _cid[0]

def N(value, x, y, w, h, style):
    i = nid()
    _cells.append('<mxCell id="%s" value="%s" style="%s" vertex="1" parent="1">'
                  '<mxGeometry x="%s" y="%s" width="%s" height="%s" as="geometry"/></mxCell>'
                  % (i, esc(value), style, x, y, w, h))
    return i

def E(src, tgt, label="", style=""):
    _cells.append('<mxCell id="%s" value="%s" style="edgeStyle=orthogonalEdgeStyle;rounded=1;'
                  'html=1;fontSize=10;labelBackgroundColor=#FFFFFF;%s" edge="1" parent="1" '
                  'source="%s" target="%s"><mxGeometry relative="1" as="geometry"/></mxCell>'
                  % (nid(), esc(label), style, src, tgt))

def table(x, y, colw, rows, rowh=24):
    sth = ('rounded=0;whiteSpace=wrap;html=1;fillColor=#E6E6E6;strokeColor=#666666;'
           'fontSize=10;fontStyle=1;align=left;spacingLeft=4;')
    stc = ('rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#999999;'
           'fontSize=10;align=left;spacingLeft=4;verticalAlign=middle;')
    cy = y
    for ri, row in enumerate(rows):
        cx = x
        for ci, val in enumerate(row):
            N(val, cx, cy, colw[ci], rowh, sth if ri == 0 else stc)
            cx += colw[ci]
        cy += rowh
    return cy - y

def page(name):
    pages.append((name, ''.join(_cells)))
    del _cells[:]

TX = 'text;html=1;align=left;verticalAlign=top;fontSize=11;whiteSpace=wrap;'
TH = 'text;html=1;fontSize=18;fontStyle=1;fontColor=#1A1A2E;'
SUB = 'text;html=1;fontSize=12;fontStyle=1;fontColor=#333333;'
F = 'rounded=1;whiteSpace=wrap;html=1;fontSize=11;'
FE = F + 'fillColor=#DAE8FC;strokeColor=#6C8EBF;'
BE = F + 'fillColor=#D5E8D4;strokeColor=#82B366;'
DB = F + 'fillColor=#FFE6CC;strokeColor=#D79B00;'
SG = F + 'fillColor=#F8CECC;strokeColor=#B85450;'
FI = F + 'fillColor=#E1D5E7;strokeColor=#9673A6;'
CA = F + 'fillColor=#FFF2CC;strokeColor=#D6B656;'
OB = F + 'fillColor=#B0E3E6;strokeColor=#0E8088;'
RC = F + 'fillColor=#F5F5F5;strokeColor=#666666;dashed=1;'
US = 'ellipse;whiteSpace=wrap;html=1;fontSize=11;fillColor=#F5F5F5;strokeColor=#666666;'
ER = 'strokeColor=#6C8EBF;'
ERT = 'strokeColor=#82B366;dashed=1;'
EX = 'strokeColor=#B85450;'
ETX = 'strokeColor=#D79B00;'
EVD = 'strokeColor=#9673A6;dashed=1;'

# ===================== ABA 01 — VISAO GERAL =====================
N('SALAO-ADM v8.1.2 - Visao geral da arquitetura (fonte principal: codigo-fonte)', 40, 20, 900, 30, TH)
N('Evidencia: frontend src/ (Vercel) · backend backend-node/src/ (Render) · banco TiDB Cloud MySQL (porta 4000, TLS, pool 20, mysql2)', 40, 55, 1000, 20, TX)

N('Usuarios e perfis (perfis_acesso.cargo)', 40, 100, 260, 20, SUB)
uv = N('VENDEDOR - Administrador SaaS\nRotas: /admin/saloes, /admin/admins,\n/admin/novo-salao, /admin/assinaturas\nProtegido por apenasVendedor.js', 55, 130, 230, 90, SG)
up = N('PROPRIETARIO - Dono do tenant\nRotas: /agenda, /dashboard, /precificacao,\n/homecar, /paralelos, /clientes,\n/configuracoes', 55, 230, 230, 100, FE)
uf = N('FUNCIONARIO - Acesso operacional\nRotas: /agenda, /clientes\nBLOQUEADO (App.jsx -> Navigate /agenda):\n/dashboard, /precificacao, /homecar,\n/paralelos, /configuracoes', 340, 130, 260, 100, FE)
N('Login: POST /auth/login (email ou username)\nbcrypt.compare · JWT 24h', 340, 240, 260, 60, TX)
nb = N('Navegador - React SPA (Vite)\nmain.jsx (boot, cache-busting app_version)\nErrorBoundary -> App.jsx\nSessao localStorage: authToken, userEmail,\nuserRole, salaoId, userId\nSentry browser: NAO identificado (Recomendado)', 650, 130, 320, 110, FE)
E(uv, nb, 'HTTPS', ER); E(up, nb, 'HTTPS', ER); E(uf, nb, 'HTTPS', ER)

N('Frontend - Vercel (vercel.json)', 40, 360, 400, 20, SUB)
N('src/services/api.js - fetchWithAuth (Bearer)\n401 -> limpa localStorage + window.location.replace(chr(47))\ngetComRetry: 3 tentativas exp. 429/502/503/504\ncriarPool(3): concorrencia limitada\nBannerOffline: navigator.onLine + offline/online\nvercel.json: / no-cache, no-store; /assets/* 1 ano immutable', 55, 385, 370, 140, FE)

N('Fluxo de protecao na borda (app.js - ordem real)', 460, 360, 500, 20, SUB)
N('HTTPS -> security headers (sem Helmet) -> CORS (origens explicitas + *.vercel.app, credentials:true) -> express.json -> rate limit 1000/15min por IP (OPTIONS skip) -> login limiter 100/15min -> JWT (middleware/auth.js) -> apenasVendedor (quando aplicavel)', 470, 385, 480, 130, SG)

N('Backend - Render (Node/Express, porta 3333)', 40, 540, 400, 20, SUB)
N('server.js -> instrument.js (Sentry.init expressIntegration) -> app.js\nRotas: /auth /salao /admin /usuarios /atendimentos /fechamento /cadastros /relatorios · /health\nControllers + services (financialEngine, fechamentoGuard, email stub)\nHandler generico: 500 Internal server error, sem stack leak', 55, 565, 370, 120, BE)

N('Cache - node-cache (fechamentoCache stdTTL 30s, checkperiod 5)', 460, 540, 500, 20, SUB)
N('Chave salao_id:mes (tenant+periodo) · invalidarFechamentoCache(salao_id, data) chamado por todos os controllers que alteram dados (atendimentos, crud)', 470, 565, 480, 60, CA)

N('Observabilidade - Sentry @sentry/node v10', 40, 700, 400, 20, SUB)
N('Sentry.init em instrument.js · setupExpressErrorHandler ANTES do handler generico · Logs: console.error (logs estruturados/request id: Recomendado)', 55, 725, 370, 60, OB)

N('Banco de dados - TiDB Cloud (MySQL-compatible, porta 4000, TLS v1.2 rejectUnauthorized, pool 20 conexoes)', 460, 650, 500, 20, SUB)
N('Compartilhadas: usuarios_auth, perfis_acesso, saloes, logins_gerados\nIsoladas por salao_id: configuracoes, profissionais, clientes, procedimentos, produtos_catalogo, custos_fixos_itens, procedimento_produtos, atendimentos, atendimento_procedimentos, fechamentos, despesas, homecare, gastos_pessoais, procedimentos_paralelos\nLegado Supabase: assinaturas, pagamentos_assinatura, logs_acesso', 470, 675, 480, 110, DB)

N('Pontos de erro e bloqueio (status reais do codigo)', 40, 800, 900, 20, SUB)
N('401 Token not provided / Invalid token · 403 Forbidden (cargo, mes fechado, cross-tenant) · 429 rate limit + lockout 5 falhas/15min · 500 Internal server error (sem stack)', 55, 825, 880, 40, SG)

N('Fluxo principal: Usuario -> Frontend (Vercel) -> HTTPS -> Backend (Render) -> Query parametrizada com salao_id (JWT) -> TiDB -> retorno Banco -> Backend -> Frontend', 40, 880, 940, 20, TX)

table(40, 910, [110, 180, 280, 280], [
    ['Status', 'Significado', 'Exemplo confirmado no codigo', 'Exemplo recomendado/nao confirmado'],
    ['Implementado', 'Existe no codigo', 'JWT 24h, bcrypt, rate limit, lockout, mesEstaFechado', '-'],
    ['Parcial', 'Existe mas com lacunas', 'Security headers sem HSTS/CSP; email.service e stub', '-'],
    ['Recomendado', 'Nao existe; sugerido', '-', 'HSTS, CSP, MFA, backup testado, logs estruturados'],
    ['Nao confirmado', 'Sem evidencia no codigo', '-', 'Sentry browser, testes de restore, idempotency keys'],
])

table(40, 1140, [110, 220, 220, 200], [
    ['Ameaca', 'Camada', 'Controle existente (status)', 'Controle recomendado'],
    ['Brute force', 'Login', 'Rate limit + lockout 5/15min (Implementado)', 'MFA, atraso progressivo, alertas'],
    ['IDOR/BOLA', 'API', 'JWT + WHERE salao_id (Implementado; testes cross-tenant: Nao confirmado)', 'Testes automatizados cross-tenant'],
    ['SQL Injection', 'API/Banco', 'Queries parametrizadas + sanitizacao chaves (Implementado)', 'SAST/DAST, testes de seguranca'],
    ['XSS', 'Frontend', 'React escaping; dangerouslySetInnerHTML ausente (Implementado)', 'CSP rigorosa'],
    ['Vazamento de JWT', 'Sessao', 'JWT em localStorage (Parcial - risco XSS)', 'Cookies HttpOnly/Secure/SameSite'],
    ['Vazamento entre tenants', 'Banco/Cache', 'salao_id derivado do JWT; chave cache salao_id:mes (Implementado)', 'Testes de isolamento automatizados'],
    ['Alteracao financeira indevida', 'Dominio', 'Transacoes + mes fechado + rollback (Implementado)', 'Auditoria, idempotency keys'],
    ['Exposicao de segredo', 'DevOps', 'Variaveis de ambiente; .env fora do git (Implementado)', 'Secret scanning, rotacao'],
    ['Perda de dados', 'Banco', 'Backup (Nao confirmado)', 'Backup + teste periodico de restauracao'],
    ['Falha operacional', 'Producao', 'Sentry (Implementado)', 'Monitoramento, alertas, runbooks'],
    ['Cache cruzado', 'Cache', 'Chave por tenant (Implementado)', 'Testes de isolamento do cache'],
    ['Mass assignment', 'API', 'Sanitizacao de chaves crud.controller (Parcial - sem allowlist explicita)', 'Allowlist explicita de campos'],
])

page('01 - Visao geral')

# ===================== ABA 02 — AUTENTICACAO E AUTORIZACAO =====================
N('Fluxo completo de autenticacao e autorizacao (auth.controller.js, middleware/auth.js, apenasVendedor.js, App.jsx, api.js)', 40, 20, 1150, 30, TH)

s1 = N('1. Usuario acessa tela de login (src/pages/Login.jsx)', 40, 70, 230, 40, US)
s2 = N('2. Frontend coleta email/username + senha', 40, 130, 230, 40, FE)
s3 = N('3. POST /auth/login (rota publica, sem auth)', 40, 190, 230, 40, BE)
s4 = N('4. Pipeline app.js: headers -> CORS -> express.json -> limiter 1000/15min -> login limiter 100/15min', 40, 250, 230, 70, SG)
s5 = N('5. Lockout in-memory: loginAttempts Map - 5 falhas -> 429 por 15min (isLockedOut/registerFailedAttempt/clearAttempts)', 40, 340, 230, 70, SG)
s6 = N('6. Busca usuario: email -> usuarios_auth WHERE email=? · username -> perfis_acesso WHERE username=? -> usuarios_auth', 40, 430, 230, 60, BE)
s7 = N('7. bcrypt.compare(senha, user.senha_hash) - bcrypt 10 rounds', 40, 510, 230, 50, SG)
s8 = N('8. Identifica: auth_user_id, salao_id (perfis_acesso), cargo', 40, 580, 230, 40, BE)
s9 = N('9. jwt.sign({ auth_user_id, salao_id, cargo }, JWT_SECRET, { expiresIn: 24h })', 40, 640, 230, 50, BE)
s10 = N('10. Resposta: { token, cargo, salao_id, email, user_id }', 40, 710, 230, 40, BE)
s11 = N('11. Sessao no localStorage: authToken, userEmail, userRole, salaoId, userId', 40, 770, 230, 50, FE)
s12 = N('12. App.jsx roteia por cargo: VENDEDOR -> VendedorApp · senao -> Sidebar', 40, 840, 230, 50, FE)
s13 = N('13. Requisicoes protegidas: Authorization: Bearer JWT (api.js fetchWithAuth)', 40, 910, 230, 50, FE)
s14 = N('14. middleware/auth.js: jwt.verify(token, JWT_SECRET) -> req.user · falha -> 401 Invalid token', 310, 70, 250, 60, SG)
s15 = N('15. req.user = { auth_user_id, salao_id, cargo } - salao_id vem SEMPRE do token, nunca do body', 310, 150, 250, 60, BE)
s16 = N('16. apenasVendedor.js: cargo !== VENDEDOR -> 403 requires VENDEDOR', 310, 230, 250, 50, SG)
s17 = N('17. Dupla checagem no controller: listarSaloes/listarLoginsGerados revalidam VENDEDOR · atualizarSalao: salao_id === id || VENDEDOR', 310, 300, 250, 70, BE)
s18 = N('18. Service executa regra de negocio (financialEngine, fechamentoGuard)', 310, 390, 250, 50, BE)
s19 = N('19. Query parametrizada: WHERE salao_id = ? (derivado do JWT)', 310, 460, 250, 50, DB)
s20 = N('20. Resposta ao frontend · 401 -> api.js limpa storage e window.location.replace(chr(47))', 310, 530, 250, 50, BE)
flow = [(s1,s2),(s2,s3),(s3,s4),(s4,s5),(s5,s6),(s6,s7),(s7,s8),(s8,s9),(s9,s10),(s10,s11),(s11,s12),(s12,s13),(s13,s14),(s14,s15),(s15,s16),(s16,s17),(s17,s18),(s18,s19),(s19,s20)]
for a,b in flow:
    E(a,b,'',ER)

N('Matriz de erros e bloqueios (status reais)', 310, 620, 250, 20, SUB)
table(310, 645, [120, 130], [
    ['Situacao', 'Resposta do codigo'],
    ['Token ausente', '401 Token not provided'],
    ['Token invalido/expirado', '401 Invalid token'],
    ['Cargo sem permissao', '403 requires VENDEDOR'],
    ['Acesso a outro salao', '403 Acesso negado'],
    ['Excesso de requisicoes', '429 (limiter) / 429 (lockout)'],
    ['Erro interno', '500 Internal server error'],
    ['Token expirado (frontend)', 'limpa storage -> login'],
], 20)

N('Matriz de autorizacao por cargo', 600, 70, 560, 20, SUB)
table(600, 95, [80, 240, 240], [
    ['Cargo', 'Permissoes confirmadas no codigo', 'Restricoes / bloqueios confirmados'],
    ['VENDEDOR', 'GET /salao, POST /salao/criar-proprietaria, DELETE /salao/:salao_id (21 deletes) - todos apenasVendedor · /admin/*: listarAdmins, logins-gerados, criar-admin, remover-admin · listarSaloes WHERE vendedor_id = auth_user_id AND deletado_em IS NULL · logins_gerados com senha_temporaria', 'Fora do escopo: so saloes com vendedor_id = JWT · apenasVendedor.js em /admin/* e POST/DELETE /salao/* · dupla checagem no controller (listarSaloes, listarLoginsGerados) · nao usar frontend para contornar permissoes'],
    ['PROPRIETARIO', 'Acesso ao proprio salao_id: /agenda, /dashboard, /precificacao, /homecar, /paralelos, /clientes, /configuracoes (App.jsx) · verifyDashboardPassword e rotas /cadastros /atendimentos /fechamento /relatorios com WHERE salao_id', 'Somente o proprio salao_id em todas as queries · atualizarSalao exige salao_id === id · PIN do dashboard validado so no backend'],
    ['FUNCIONARIO', '/agenda, /clientes (Sidebar roles + App.jsx Navigate)', '/dashboard, /precificacao, /homecar, /paralelos, /configuracoes -> Navigate to /agenda · backend nao bloqueia rotas por cargo FUNCIONARIO - aplica apenas escopo de tenant (risco anotado)'],
], 120)

N('Protecao de frontend melhora a experiencia, mas a decisao final deve ocorrer no backend (middleware + controller + query). Frontend apenas oculta telas - rotas /atendimentos /fechamento /cadastros /relatorios nao restringem FUNCIONARIO no backend, apenas o escopo de tenant.', 600, 620, 560, 50, RC)
N('Observacoes de seguranca da sessao: · JWT em localStorage - exposto a XSS (Recomendado: cookies HttpOnly/Secure/SameSite) · Sem revogacao de sessao nem invalidacao pos-troca de senha (Recomendado - Nao confirmado) · Mensagens de login genericas Invalid credentials (mitiga enumeracao - Parcial) · Senha de proprietaria gerada no frontend com Math.random (risco - aba 03) · Falhas de login: apenas console.error - sem log estruturado nem alerta (Recomendado)', 600, 680, 560, 120, TX)

page('02 - Autenticacao e autorizacao')

# ===================== ABA 03 — FRONTEND =====================
N('Arquitetura do frontend - src/ (Vite + React, deploy Vercel)', 40, 20, 1150, 30, TH)

N('Boot e ciclo de vida', 40, 70, 280, 20, SUB)
m0 = N('main.jsx - ponto de boot · CURRENT_APP_VERSION = v8.1.2', 40, 95, 280, 40, FE)
m1 = N('Compara app_version no localStorage · se mudou: localStorage.clear() + sessionStorage.clear() + grava nova versao (cache-busting)', 40, 145, 280, 70, CA)
m2 = N('ErrorBoundary envolvendo toda a arvore React', 40, 225, 280, 40, FE)
N('App.jsx - sessao lida do localStorage (authToken, userEmail, userRole, salaoId, userId) · roteamento por cargo', 40, 275, 280, 60, FE)
E(m0, m1, '', ER); E(m1, m2, '', ER)

N('Roteamento por cargo (App.jsx)', 360, 70, 360, 20, SUB)
N('VENDEDOR -> VendedorApp (rotas /admin/*)', 375, 95, 330, 40, SG)
N('PROPRIETARIO -> Sidebar + rotas completas: /agenda /dashboard /precificacao /homecar /paralelos /clientes /configuracoes', 375, 145, 330, 60, FE)
N('FUNCIONARIO -> Sidebar somente /agenda e /clientes · rotas /dashboard /precificacao /homecar /paralelos /configuracoes -> Navigate to /agenda', 375, 215, 330, 60, FE)
N('Protecao visual apenas - decisao final no backend', 375, 285, 330, 30, RC)

N('Protecao especifica do Dashboard (useDashboardProtection.js + DashboardLockOverlay.jsx)', 760, 70, 390, 20, SUB)
d1 = N('1. Proprietario acessa /dashboard', 775, 95, 360, 30, FE)
d2 = N('2. PIN solicitado · isLocked inicia true (so em memoria - nunca em localStorage/sessionStorage)', 775, 135, 360, 50, FE)
d3 = N('3. POST /auth/verify-dashboard-password (exige middleware/auth.js)', 775, 195, 360, 40, BE)
d4 = N('4. Backend compara PIN com dashboard_pin de configuracoes (WHERE salao_id = JWT) · retorna apenas { authorized } - PIN NUNCA exposto · frontend nunca salva PIN em storage', 775, 245, 360, 70, SG)
d5 = N('5. visibilitychange + window.blur bloqueiam a tela ao perder foco', 775, 325, 360, 40, FE)
N('DIVERGENCIA: reset de PIN no codigo atual e feito pelo FRONTEND - gerarPin() com Math.random e PUT /cadastros/configuracoes/:id apos validar senha via POST /auth/verify-login-password (DashboardLockOverlay.jsx e Configuracoes.jsx). O backend NAO gera o novo PIN. Classificacao: Implementado parcialmente + risco (senha de login validada no backend OK, mas novo PIN definido no frontend).', 775, 375, 360, 120, SG)
for a,b in [(d1,d2),(d2,d3),(d3,d4),(d4,d5)]:
    E(a,b,'',ER)

N('API, resiliencia e motor financeiro (src/services)', 40, 340, 340, 20, SUB)
a1 = N('api.js - fetchWithAuth injeta Bearer em todas as requisicoes · 401 (fora de /auth/login) limpa storage e redireciona (anti-zumbi)', 40, 365, 340, 60, FE)
a2 = N('getComRetry: 3 tentativas, backoff exponencial + jitter para 429/502/503/504 - mitiga cold start do Render free', 40, 435, 340, 50, FE)
a3 = N('criarPool(n): concorrencia limitada (Dashboard usa criarPool(3)) - evita estourar rate limit', 40, 495, 340, 50, FE)
a4 = N('FinancialEngine.js - replica frontend do motor backend: aritmetica em centavos inteiros (toCents/toReais) · calcularPrecoPMG · calcularAtendimento · calcularHomeCare · calcularParalelo · calcularResumoMensal · calcularValorBase (engenharia reversa)', 40, 555, 340, 90, FI)
a5 = N('BannerOffline.jsx - navigator.onLine + eventos offline/online', 40, 655, 340, 40, FE)
E(a1,a2,'',ER); E(a2,a3,'',ER)

N('Modulos do proprietario (src/pages)', 400, 340, 320, 20, SUB)
N('Agenda.jsx - CRUD de atendimentos + previa financeira em tempo real · GET /relatorios/custo-composto-salao', 415, 365, 290, 50, FE)
N('Dashboard.jsx - fechamento mensal, graficos, ranking, resultado · getComRetry para /fechamento/:mes (criarPool 3 meses), /relatorios/ranking-procedimentos, /relatorios/rendimento-professional, /cadastros/custos-fixos, /relatorios/homecare-anual', 415, 425, 290, 80, FI)
N('Precificacao.jsx - motor de precos, engenharia reversa, simulador · /relatorios/custo-composto-salao', 415, 515, 290, 50, FI)
N('HomeCar.jsx - vendas de produtos homecare (CRUD /cadastros/homecare)', 415, 575, 290, 40, FI)
N('Paralelos.jsx - procedimentos fora da agenda (ex.: noivas e formaturas) · /cadastros/procedimentos-paralelos', 415, 625, 290, 50, FI)
N('Clientes.jsx - cadastro + historico · /relatorios/clientes-resumo (total_gasto, ultima_visita)', 415, 685, 290, 50, FE)
N('Configuracoes.jsx - taxa maquininha, custos fixos, equipe/salarios, protecao do dashboard (aba equipe) · PUT /cadastros/configuracoes/:id', 415, 745, 290, 60, FE)

N('Modulos do vendedor (src/vendedor)', 760, 530, 390, 20, SUB)
N('MeusSaloes.jsx - lista saloes do vendedor (GET /salao) · deleta via DELETE /salao/:id com ConfirmModal', 775, 555, 360, 50, SG)
N('NovoSalao.jsx - wizard de 4 etapas; cria salao + proprietaria atomicamente (POST /salao/criar-proprietaria) · RISCO: gerarSenhaSegura() usa Math.random no FRONTEND (10 chars) e senha trafega no body; classificacao: Implementado parcialmente + risco (recomendado: geracao server-side com crypto)', 775, 615, 360, 90, SG)
N('GerenciarSalao.jsx - exibe logins gerados (GET /admin/logins-gerados?salao_id=...) · senha_temporaria em texto + copia para WhatsApp - RISCO de exposicao por canal externo', 775, 715, 360, 60, SG)
N('GerenciarAdmins.jsx - CRUD de administradores VENDEDOR (/admin/criar-admin, /admin/:user_id)', 775, 785, 360, 40, SG)
N('Assinaturas.jsx - modulo DESATIVADO temporariamente (moduloDesativado=true; codigo Supabase mantido comentado) - legado', 775, 835, 360, 50, RC)

N('vercel.json - politica de cache e SPA', 40, 900, 500, 20, SUB)
N('rewrites: /(.*) -> /index.html · headers: / e /index.html -> Cache-Control: no-cache, no-store, must-revalidate + Pragma + Expires 0 · /assets/* -> public, max-age=31536000, immutable (1 ano)', 55, 925, 480, 60, CA)

page('03 - Frontend')

# ===================== ABA 04 — BACKEND E API =====================
N('Arquitetura detalhada do backend e API - backend-node/src (Node/Express no Render)', 40, 20, 1150, 30, TH)

N('Bootstrap e pipeline (ordem real do app.js)', 40, 70, 350, 20, SUB)
b0 = N('server.js: require(./instrument.js) ANTES de app.js -> require(./app) -> app.listen(PORT 3333)', 40, 95, 350, 50, BE)
b1 = N('instrument.js: Sentry.init({ dsn: SENTRY_DSN, integrations: [expressIntegration()] }) - inicializacao antes do app', 40, 155, 350, 50, OB)
b3 = N('1. Security headers manuais (SEM Helmet): X-Content-Type-Options: nosniff · X-Frame-Options: DENY (anti-clickjacking) · X-XSS-Protection: 1; mode=block · Referrer-Policy: no-referrer · Cache-Control: no-store', 40, 215, 350, 80, SG)
b4 = N('2. CORS antes do rate limiter (429 tambem recebe headers CORS) · allowedOrigins = env ALLOWED_ORIGINS (default localhost:5173) + regex .vercel.app · credentials: true', 40, 305, 350, 60, SG)
b5 = N('3. express.json() - parse do body', 40, 375, 350, 30, SG)
b6 = N('4. generalLimiter: 1000 req/15min por IP (RATE_LIMIT_MAX) · standardHeaders · skip OPTIONS (preflight nao consome cota)', 40, 415, 350, 60, SG)
b7 = N('5. loginLimiter em /auth/login: 100 tentativas/15min por IP (LOGIN_RATE_LIMIT_MAX)', 40, 485, 350, 50, SG)
b8 = N('6. Sentry error handler: setupExpressErrorHandler(app) se SENTRY_DSN - ANTES do handler generico', 40, 545, 350, 50, OB)
b9 = N('7. Generic error handler: console.error(err) · status 500 -> mensagem Internal server error SEM stack trace · err.status propagado para 4xx', 40, 605, 350, 60, SG)
for a,b in [(b0,b1),(b1,b3),(b3,b4),(b4,b5),(b5,b6),(b6,b7),(b7,b8),(b8,b9)]:
    E(a,b,'',ER)

N('Banco (config/db.js) e protecoes estruturais', 420, 70, 350, 20, SUB)
N('mysql2/promise · createPool: connectionLimit 20 · waitForConnections · queueLimit 0 · connectTimeout 10000', 435, 95, 320, 60, DB)
N('TLS obrigatorio: ssl { minVersion: TLSv1.2, rejectUnauthorized: true }', 435, 165, 320, 40, DB)
N('Queries 100% parametrizadas (placeholders ?) - protecao estrutural contra SQL Injection · sanitizacao de chaves no crud.controller: /^[a-zA-Z0-9_]+$/', 435, 215, 320, 60, DB)
N('Lockout brute-force in-memory (auth.controller.js): loginAttempts Map - MAX_ATTEMPTS 5, LOCKOUT_MS 15min, independente do express-rate-limit (reinicio do servico limpa o Map - Recomendado: store compartilhado tipo Redis)', 435, 285, 320, 80, SG)
N('RISCO/Nao confirmado: limite de tamanho do body (express.json limit), statement timeout e protecao contra consultas pesadas nao configurados no pool', 435, 375, 320, 60, RC)

N('Rotas e middlewares (classificacao real)', 800, 70, 390, 20, SUB)
table(800, 95, [200, 190], [
    ['Rota', 'Middleware aplicado'],
    ['POST /auth/login', 'publica (limiter + lockout)'],
    ['POST /auth/verify-dashboard-password', 'auth.js'],
    ['POST /auth/verify-login-password', 'auth.js'],
    ['GET /salao · POST /salao/criar-proprietaria · DELETE /salao/:salao_id', 'auth.js + apenasVendedor.js'],
    ['PUT /salao/:id · PATCH /salao/:id/configurar · GET /salao/:id', 'auth.js (checagem de tenant no controller)'],
    ['/admin/* (GET /, /logins-gerados, POST /criar-admin, DELETE /:user_id)', 'auth.js + apenasVendedor.js (so VENDEDOR)'],
    ['POST /usuarios/convidar', 'auth.js'],
    ['/atendimentos/* (POST, PUT /:id, PUT /:id/procedimentos, GET /, GET /:id)', 'router.use(autenticar) - auth.js'],
    ['/fechamento/:mes (GET, POST)', 'router.use(autenticar) - auth.js'],
    ['/cadastros/* (11 tabelas CRUD)', 'router.use(autenticar) - auth.js'],
    ['/relatorios/* (9 endpoints)', 'router.use(autenticar) - auth.js'],
    ['GET /health', 'publica'],
], 26)
N('NOTA: /atendimentos nao possui rota DELETE - deletarAtendimento existe no controller mas NAO esta roteada (divergencia registrada na aba 08).', 800, 480, 390, 40, SG)

N('Controllers - rotas, validacoes, tabelas, transacoes, cache e erros', 420, 460, 770, 20, SUB)
table(420, 485, [140, 330, 300], [
    ['Controller', 'Rotas · validacoes · tabelas · transacoes', 'Cache invalidado · respostas de erro'],
    ['auth.controller.js', 'login (bcrypt, lockout, JWT 24h) · verifyDashboardPassword (compara dashboard_pin, nunca expoe) · verifyLoginPassword (bcrypt) - tabelas: usuarios_auth, perfis_acesso, configuracoes', 'Sem cache · 400 campos ausentes, 401 credenciais invalidas, 429 lockout, 500 Internal error'],
    ['salao.controller.js', 'criarProprietaria: transacao 5 INSERTs (saloes, configuracoes defaults 5.0/10.65, usuarios_auth bcrypt 10, perfis_acesso PROPRIETARIO, logins_gerados senha em texto) · deletarSalao: transacao 21 DELETEs em cascata com rollback · listarSaloes (VENDEDOR, WHERE vendedor_id, soft delete deletado_em IS NULL) · atualizarSalao/configurarSalao/obterSalao (checagem salao_id === id || VENDEDOR)', 'Sem cache · 400 Missing fields, 403 Acesso negado, 500 Transaction failed / Deletion failed'],
    ['atendimentos.controller.js', 'criarAtendimento: transacao - mesEstaFechado -> busca config/profissional/procedimento (todas com AND salao_id) -> custo variavel via procedimento_produtos ou fallback -> calcularValoresAtendimento -> INSERT atendimento + adicionais -> UPDATE totais -> invalidarFechamentoCache · atualizarAtendimento: recalcula quando profissional muda · substituirProcedimentosAtendimento: DELETE+INSERT atomico com recalculo · deletarAtendimento verifica mes fechado (sem rota)', 'invalidarFechamentoCache(salao_id, data) em criar/atualizar/substituir/deletar · 400 dados invalidos, 403 mes fechado, 404 nao encontrado, 500 erro generico'],
    ['crud.controller.js', 'Factory createCRUDController para 11 tabelas (clientes, profissionais, procedimentos, produtos_catalogo, custos_fixos_itens, configuracoes, despesas, homecare, procedimentos_paralelos, gastos_pessoais + procedimento_produtos) · WHERE salao_id = req.user.salao_id em todas · sanitizacao de chaves /^[a-zA-Z0-9_]+$/ · mesEstaFechado em CREATE/UPDATE/DELETE de tabelas financeiras (homecare, despesas, procedimentos_paralelos, gastos_pessoais via criado_em) · ENUM de despesas validado no backend (10 tipos) · dashboard_pin removido nas respostas listar/obterPorId · fallback preco_m = P x 1.2, preco_g = P x 1.3 · homecare: lucro e valor_pendente recalculados no backend', 'invalidarFechamentoCache em CREATE/UPDATE/DELETE · 400 dados invalidos, 403 mes fechado, 404 nao encontrado, 500 erro'],
    ['fechamento.controller.js', 'GET/POST /fechamento/:mes · validar mes regex d{4}-d{2} · calcularDadosFechamento: 12 queries agregadas SUM/COUNT com toNum() (mysql2 DECIMAL vem como string) · salvarFechamentoMensal: rejeita se ja existe (400 Mes ja fechado) e INSERT imutavel em fechamentos', 'fechamentoCache NodeCache stdTTL 30s, chave salao_id:mes · 400 formato invalido/mes fechado, 500 erro'],
    ['relatorios.controller.js', 'ranking-procedimentos (GROUP BY, SUM IF status EXECUTADO, ticket_medio) · rendimento-professional (LEFT JOIN atendimentos) · agenda-do-dia (JOIN profissionais + procedimentos) · clientes-resumo (LEFT JOIN, total_gasto, ultima_visita) · gastos-pessoais-resumo · custo-composto/:procedimento_id e custo-composto-salao (batch) · atendimentos-completo · homecare-anual (GROUP BY mes) - todas WHERE salao_id', 'Sem cache · validacao de mes/data por regex · 400 formato invalido, 404 nao encontrado, 500 erro'],
    ['admin.controller.js', 'criarAdmin (senha min 8, bcrypt, usuarios_auth + perfis_acesso cargo=VENDEDOR salao_id=null) · removerAdmin (bloqueia auto-remocao currentUser === user_id -> 400) · listarAdmins (cargo=VENDEDOR salao_id IS NULL) · listarLoginsGerados (dupla checagem VENDEDOR no controller; retorna senha_temporaria em texto)', 'Sem cache · 400 campos/senha curta/auto-remocao, 403 Acesso negado, 500 erro'],
    ['usuarios.controller.js', 'POST /usuarios/convidar: salao_id vem do TOKEN (nunca do body) · tempPass = randomBytes(6).hex (12 chars) · bcrypt hash · INSERT usuarios_auth + perfis_acesso · profissionais se role PROFISSIONAL/PROFISSIONAL_CLT · emailService.sendInvitation (stub)', 'Sem cache · 400 Missing fields, 500 Internal error'],
], 150)

page('04 - Backend e API')

# ===================== ABA 05 — FINANCEIRO =====================
N('Financeiro e regras de negocio - financialEngine.service.js (backend) + FinancialEngine.js (frontend)', 40, 20, 1150, 30, TH)
N('FONTE DE VERDADE: backend (backend-node/src/services/financialEngine.service.js). O frontend (src/services/FinancialEngine.js) e REPLICA para previa em tempo real - valores financeiros gravados vem SEMPRE do backend.', 40, 55, 1100, 40, SG)

N('Fórmulas confirmadas (backend)', 40, 100, 560, 20, SUB)
table(40, 125, [280, 280], [
    ['Fórmula (financialEngine.service.js)', 'Onde ocorre / condição'],
    ['maquininha = valor x taxa_maquininha_pct / 100', 'calcularValoresAtendimento - chamado no INSERT/UPDATE de atendimentos (backend) e previa (frontend)'],
    ['comissao = valor x porcentagem_comissao / 100', 'Somente quando cargoProfissional === FUNCIONARIO e porc > 0 (backend e frontend)'],
    ['lucro_liquido = valor - maquininha - custo_fixo - custo_variavel - comissao', 'calcularValoresAtendimento (backend, gravado no INSERT/UPDATE do atendimento)'],
    ['lucro_possivel = valor - custo_fixo - custo_variavel - comissao (NAO desconta maquininha)', 'calcularValoresAtendimento (backend, gravado)'],
    ['custo_variavel_insumos = SOMA(preco_compra / qtd_aplicacoes x qtd_por_uso)', 'calcularCustoVariavelInsumos - backend busca procedimento_produtos JOIN produtos_catalogo; fallback = custo_variavel do procedimento'],
    ['custo_fixo_rateado = soma_custos_fixos / qtd_atendimentos_mes', 'calcularCustoFixoRateado (backend + frontend) - configuracoes.custo_fixo_por_atendimento'],
    ['engenharia_reversa: base = custo_fixo + custo_material + ganho_desejado · precoP = base / (1 - taxa%) · precoM = precoP x 1.2 · precoG = precoP x 1.3', 'calcularEngenhariaReversa (backend) + calcularValorBase (frontend) - tela Precificacao.jsx'],
    ['calcularPrecoPorComprimento: fallback M = P x 1.2 e G = P x 1.3 quando nao informados', 'Backend crud.controller (CREATE/UPDATE procedimentos) e frontend FinancialEngine.calcularPrecoPMG'],
    ['saude_financeira = lucro_atendimentos + lucro_homecare - despesas - salarios', 'calcularSaudeFinanceira (backend) - usado no fechamento.controller.js; resultado_final tambem desconta gastos_pessoais'],
    ['valor_pendente = valor_cobrado - valor_pago', 'Backend (atendimentos INSERT + homecare CREATE/UPDATE com recalculo), nunca apenas no frontend'],
], 60)

N('roundToDecimal: Math.round((v + Number.EPSILON) x 100) / 100 - arredondamento controlado (backend). Frontend: aritmetica em CENTAVOS inteiros (toCents/toReais).', 40, 800, 560, 40, FI)

N('Fluxo de calculo no criarAtendimento (transacao)', 640, 100, 550, 20, SUB)
c1 = N('mesEstaFechado(salao_id, data) -> 403 se fechado', 655, 125, 520, 40, SG)
c2 = N('SELECT configuracoes (taxa_maquininha_pct, custo_fixo_por_atendimento) WHERE salao_id', 655, 175, 520, 40, DB)
c3 = N('SELECT profissionais (cargo, porcentagem_comissao) WHERE id AND salao_id', 655, 225, 520, 40, DB)
c4 = N('SELECT procedimentos (custo_variavel) WHERE id AND salao_id', 655, 275, 520, 40, DB)
c5 = N('SELECT procedimento_produtos JOIN produtos_catalogo (preco_compra, qtd_aplicacoes, qtd_por_uso) WHERE procedimento_id AND salao_id', 655, 325, 520, 50, DB)
c6 = N('calcularCustoVariavelInsumos(produtos) - se houver produtos; senao fallback custo_variavel do procedimento', 655, 385, 520, 40, FI)
c7 = N('calcularValoresAtendimento({ valorCobrado, taxaMaquininhaPct, custoFixoPorAtendimento, cargoProfissional, porcComissao, custoVariavel })', 655, 435, 520, 50, FI)
c8 = N('INSERT INTO atendimentos (todos os valores calculados gravados no INSERT - nunca apenas no SELECT)', 655, 495, 520, 50, DB)
c9 = N('Procedimentos adicionais: INSERT atendimento_procedimentos + recalculo e agregacao dos totais', 655, 555, 520, 50, DB)
c10 = N('UPDATE atendimentos SET totais agregados (valor_cobrado, valor_pago, valor_pendente, maquininha, profissional, custos, lucros)', 655, 615, 520, 50, DB)
c11 = N('commit() + invalidarFechamentoCache(salao_id, data) - erro em qualquer etapa -> rollback total', 655, 675, 520, 50, ETX and CA)
for a,b in [(c1,c2),(c2,c3),(c3,c4),(c4,c5),(c5,c6),(c6,c7),(c7,c8),(c8,c9),(c9,c10),(c10,c11)]:
    E(a,b,'',ETX)

N('Homecare: lucro = valor_venda - custo_produto · valor_pendente = valor_venda - valor_pago (recalculados no backend em CREATE/UPDATE do crud.controller, mesmo se cliente enviar valores manipulados). Procedimentos paralelos: valor, valor_pago, valor_profissional (defaults no backend). Gastos pessoais: descontados do resultado_final do fechamento (mes derivado de criado_em).', 640, 740, 550, 90, TX)
N('Risco: frontend NAO deve ser fonte de verdade dos valores financeiros - ATENDIDO para atendimentos/homecare (recalculo no backend). Excecao encontrada: dashboard_pin e definido via frontend no reset (aba 03); NovoSalao gera senha no frontend (aba 03).', 640, 840, 550, 70, SG)

page('05 - Financeiro e regras de negocio')

# ===================== ABA 06 — DASHBOARD =====================
N('Dashboard, graficos e relatorios - caminho dos dados', 40, 20, 1150, 30, TH)
q1 = N('Banco de dados TiDB - tabelas por tenant (atendimentos, homecare, despesas, profissionais, clientes, procedimentos, gastos_pessoais, procedimentos_paralelos, fechamentos)', 40, 70, 1050, 50, DB)
q2 = N('Queries agregadas: SUM, COUNT, GROUP BY, LEFT/JOIN - todas com WHERE salao_id = req.user.salao_id e filtros de periodo validados por regex (mes d{4}-d{2}, data d{4}-d{2}-d{2})', 40, 140, 1050, 50, BE)
q3 = N('fechamento.controller.js: calcularDadosFechamento - 12 queries (faturamentoBruto, receitaRecebida, totalPendente, receitaHomecare, receitaParalelos, lucroAtendimentos, lucroPossivel, totalAtendimentos, lucroHomecare, totalDespesas, totalSalarios, totalGastosPessoais) · toNum() em TODOS os valores porque mysql2 retorna DECIMAL como string', 40, 210, 1050, 70, BE)
q4 = N('relatorios.controller.js: ranking-procedimentos (GROUP BY procedimento, SUM IF status EXECUTADO, ticket_medio) · rendimento-professional (LEFT JOIN atendimentos) · agenda-do-dia (JOIN profissionais + procedimentos) · clientes-resumo (LEFT JOIN, total_gasto, ultima_visita, total_atendimentos) · gastos-pessoais-resumo (GROUP BY mes) · custo-composto/:id e custo-composto-salao (batch, evita N requisicoes) · atendimentos-completo · homecare-anual (GROUP BY mes para grafico anual)', 40, 300, 1050, 90, BE)
q5 = N('API REST - respostas JSON com Number() em todos os valores numericos (normalizacao) · cache do fechamento: NodeCache stdTTL 30s, chave salao_id:mes (tenant+periodo) · invalidarFechamentoCache apos qualquer alteracao de dados (atendimentos, crud)', 40, 410, 1050, 60, CA)
q6 = N('Frontend - Dashboard.jsx (proprietario, protegido por PIN) usa getComRetry + criarPool(3) para /fechamento/:mes de 3 meses, ranking, rendimento, custos-fixos, homecare-anual · Agenda.jsx usa /relatorios/custo-composto-salao · Clientes.jsx usa /relatorios/clientes-resumo · Precificacao.jsx usa custo-composto-salao', 40, 490, 1050, 70, FE)
q7 = N('Graficos e indicadores: faturamento bruto, lucro liquido, resultado final, ranking de procedimentos, rendimento por profissional, agenda do dia, resumo de clientes (total_gasto, ultima_visita), custo composto do salao, homecare anual (grafico por mes), consolidacao por mes, saude financeira, margem de lucro', 40, 580, 1050, 60, FE)
for a,b in [(q1,q2),(q2,q3),(q3,q4),(q4,q5),(q5,q6),(q6,q7)]:
    E(a,b,'',ERT)
N('Protecao contra vazamento de dados em relatorios: todas as queries de relatorio filtram por salao_id do JWT · PIN do dashboard validado EXCLUSIVAMENTE no backend (POST /auth/verify-dashboard-password) · PIN nunca retornado ao frontend (crud.controller remove dashboard_pin das respostas listar/obterPorId) · bloqueio por visibilitychange e blur · isLocked somente em memoria · filtros de periodo validados por regex (400 se invalido) · controle de exportacao: Nao confirmado (nao existe no codigo) · rate limit especifico para validacao do PIN: Nao confirmado (usa apenas limiter geral 1000/15min)', 40, 660, 1050, 100, SG)
N('DIVERGENCIA: rota registrada no frontend e /relatorios/rendimento-professional (com N), embora o prompt original cite rendimento-profissional/rendimento_por_profissional - o codigo-fonte (relatorios.routes.js) e a fonte principal.', 40, 770, 1050, 40, SG)

page('06 - Dashboard, graficos e relatorios')

# ===================== ABA 07 — BANCO E MULTI-TENANT =====================
N('Banco de dados e multi-tenant - TiDB Cloud (MySQL-compatible, porta 4000, TLS, pool 20) - diagrama ER simplificado', 40, 20, 1150, 30, TH)
N('EVIDENCIA: nomes de tabelas e colunas extraidos das queries reais dos controllers (usuarios_auth, perfis_acesso, saloes, logins_gerados, configuracoes, profissionais, clientes, procedimentos, produtos_catalogo, custos_fixos_itens, procedimento_produtos, atendimentos, atendimento_procedimentos, fechamentos, despesas, homecare, gastos_pessoais, procedimentos_paralelos, assinaturas, pagamentos_assinatura, logs_acesso).', 40, 55, 1100, 40, TX)

N('Tabelas de identidade (compartilhadas)', 40, 105, 560, 20, SUB)
table(40, 130, [150, 250, 160], [
    ['Tabela', 'Colunas principais (evidencia de queries)', 'PK / FK / regras'],
    ['usuarios_auth', 'id (UUID), email (UNIQUE), senha_hash (bcrypt 10 rounds), criado_em', 'PK id · nunca retornar senha_hash ao frontend · compartilhada entre tenants'],
    ['perfis_acesso', 'auth_user_id (FK usuarios_auth.id), salao_id (FK saloes.id, NULLABLE para VENDEDOR), cargo (VENDEDOR/PROPRIETARIO/FUNCIONARIO), username', 'Pivot entre identidade e tenant · username consultado no login'],
    ['saloes', 'id (UUID), nome, nome_proprietaria, telefone, vendedor_id (UUID do VENDEDOR), ativo, criado_em, deletado_em (soft delete), configurado', 'PK id · tenant mestre · soft delete via deletado_em IS NULL'],
    ['logins_gerados', 'id, vendedor_id, salao_id, username, senha_temporaria (TEXTO PLANO - risco), auth_user_id, ativo, gerado_em', 'Registro de suporte · senha_temporaria exposta em /admin/logins-gerados (risco)'],
], 70)

N('Tabelas isoladas por salao_id (todas as consultas: WHERE salao_id = ? derivado do JWT, nunca do body)', 40, 400, 560, 40, SUB)
table(40, 445, [150, 250, 160], [
    ['Tabela', 'Colunas principais (evidencia de queries)', 'Regras / calculos financeiros'],
    ['configuracoes', 'salao_id, taxa_maquininha_pct, custo_fixo_por_atendimento (também custo_fixo_por_atend), qtd_atendimentos_mes, dashboard_pin, dashboard_protection_enabled, atualizado_em', 'dashboard_pin NUNCA retornado (removido em listar/obterPorId) · padroes 5.0 e 10.65 no criarProprietaria'],
    ['profissionais', 'salao_id, nome, cargo, porcentagem_comissao, salario_fixo, ativo, auth_user_id', 'cargo FUNCIONARIO condiciona comissao · salario_fixo entra no fechamento (ativo=1, cargo=FUNCIONARIO)'],
    ['clientes', 'salao_id, nome, telefone, criado_em', 'JOIN com atendimentos por cliente = c.nome (relatorio clientes-resumo)'],
    ['procedimentos', 'salao_id, nome, categoria (ENUM), preco_p, preco_m, preco_g, custo_variavel, requer_comprimento', 'fallback preco_m = P x 1.2 e preco_g = P x 1.3 no crud.controller (CREATE/UPDATE)'],
    ['produtos_catalogo', 'salao_id, preco_compra, qtd_aplicacoes, ativo', 'Origem do custo variavel (JOIN com procedimento_produtos)'],
    ['custos_fixos_itens', 'salao_id, descricao, valor', 'Rateio via calcularCustoFixoRateado'],
    ['procedimento_produtos', 'salao_id, procedimento_id (FK), produto_id (FK), qtd_por_uso, criado_em', 'Tabela de juncao com isolamento proprio salao_id (desnormalizacao de seguranca)'],
    ['atendimentos', 'salao_id, data, horario, cliente, profissional_id (FK), procedimento_id (FK), comprimento (P/M/G), valor_cobrado, valor_pago, valor_pendente, valor_maquininha, valor_profissional, custo_fixo, custo_variavel, lucro_liquido, lucro_possivel, status (AGENDADO/EXECUTADO/CANCELADO), obs, criado_em, atualizado_em', 'Lucros calculados no INSERT/UPDATE (nunca apenas no SELECT) · bloqueio se mes fechado'],
    ['atendimento_procedimentos', 'atendimento_id (FK), procedimento_id, comprimento, valor_indicado, valor_cobrado, valor_pago, sequencia, criado_em · salao_id: NAO CONFIRMADO na tabela em si (DELETEs usam JOIN com atendimentos por a.salao_id)', 'Procedimentos adicionais · substituicao atomica via DELETE+INSERT na transacao do atendimento'],
    ['fechamentos', 'salao_id, mes (DATE), faturamento_bruto, lucro_liquido, lucro_possivel, total_atendimentos, total_pendente, total_despesas, total_gastos_pessoais, lucro_homecare, resultado_final', 'UNIQUE(salao_id, mes) - impedir duplicidade (posicionado no INSERT - validar no schema real) · registro imutavel · INSERT falha se ja existe (guarda no controller)'],
    ['despesas', 'salao_id, tipo (ENUM 10 valores validado no backend), descricao, valor, valor_pago, data', 'ENUM validado antes do banco (evita 500 Data truncated)'],
    ['homecare', 'salao_id, produto, cliente, valor_venda, custo_produto, valor_pago, valor_pendente, lucro, data', 'lucro e valor_pendente recalculados no backend em CREATE/UPDATE'],
    ['gastos_pessoais', 'salao_id, valor, criado_em', 'Mes derivado de criado_em (nao tem coluna data) · descontado do resultado_final'],
    ['procedimentos_paralelos', 'salao_id, cliente, valor, valor_pago, valor_profissional, data', 'Receita fora da agenda (ex.: noivas, formaturas)'],
], 52)

N('Tabelas legadas (Supabase - em fase de saida)', 640, 105, 550, 20, SUB)
table(640, 130, [160, 230, 160], [
    ['Tabela', 'Uso no codigo atual', 'Status'],
    ['assinaturas', 'DELETE em deletarSalao; modulo frontend Assinaturas.jsx DESATIVADO temporariamente (codigo Supabase comentado)', 'Legado - parcialmente usada (apenas exclusao em cascata)'],
    ['pagamentos_assinatura', 'DELETE em deletarSalao', 'Legado - parcialmente usada (apenas exclusao em cascata)'],
    ['logs_acesso', 'DELETE em deletarSalao (documentada em docs/MULTI_TENANT.md para Supabase Auth legacy)', 'Legado - nao usada ativamente (so exclusao em cascata)'],
], 60)

N('Regra de isolamento multi-tenant - camadas de protecao', 640, 340, 550, 20, SUB)
table(640, 365, [130, 420], [
    ['Camada', 'Protecao implementada (evidencia)'],
    ['1. Frontend', 'Oculta telas sem permissao (App.jsx Navigate, Sidebar roles) - experiencia, nao seguranca'],
    ['2. Roteamento/middleware', 'middleware/auth.js valida JWT e cargo; apenasVendedor.js bloqueia rotas administrativas'],
    ['3. Controller', 'Verifica pertencimento do recurso ao salao (atualizarSalao/obterSalao: salao_id === id || VENDEDOR; deletarAtendimento: WHERE id AND salao_id; listarSaloes: WHERE vendedor_id = auth_user_id)'],
    ['4. Service', 'financialEngine e fechamentoGuard recebem salao_id do contexto autenticado'],
    ['5. Banco', 'Filtro por salao_id em TODAS as consultas (WHERE salao_id = ?) - valor derivado do JWT, nunca do body'],
    ['6. Cache', 'Chave composta por tenant e periodo: fechamentoCache salao_id:mes (NodeCache TTL 30s)'],
    ['7. Auditoria/testes', 'Nao confirmado - nao ha testes automatizados de isolamento cross-tenant nem auditoria de acesso cruzado no codigo (Recomendado)'],
], 40)

N('Riscos representados', 640, 690, 550, 20, SUB)
N('· IDOR/BOLA - mitigado pelo filtro de tenant em toda query (testes automatizados: Recomendado)\n· troca de ID na URL - atualizarSalao/obterSalao checam salao_id === id || VENDEDOR (parcial: DELETE /salao/:salao_id exige apenasVendedor mas nao valida vendedor_id do salao antes de deletar - risco)\n· salao_id enviado no body - usuarios.convidar e crud.controller IGNORAM salao_id do body (usam do token) (Implementado)\n· query sem filtro de tenant - Nao identificado em queries de negocio (Implementado)\n· relacionamento entre tabelas de tenants diferentes - atendimentos JOIN profissionais/procedimentos com AND salao_id (Implementado); atendimento_procedimentos sem salao_id proprio (parcial)\n· vazamento em relatorios - todas WHERE salao_id (Implementado)\n· cache compartilhado entre saloes - chave salao_id:mes (Implementado)\n· arquivos sem escopo de tenant - Nao se aplica (nao ha upload de arquivos no codigo)\n· mass assignment - sanitizacao de chaves crud.controller (Parcial: sem allowlist explicita de campos por tabela)', 640, 715, 550, 220, TX)

page('07 - Banco de dados e multi-tenant')

# ===================== ABA 08 — TRANSACOES E INTEGRIDADE =====================
N('Transacoes e integridade dos dados', 40, 20, 1150, 30, TH)

N('Criacao de salao (salao.controller.js criarProprietaria - transacao atomica com pool.getConnection)', 40, 70, 560, 20, SUB)
t1 = N('connection.beginTransaction()', 40, 95, 560, 30, ETX and BE)
t2 = N('INSERT INTO saloes (id, nome, nome_proprietaria, telefone, vendedor_id)', 40, 135, 560, 30, DB)
t3 = N('INSERT INTO configuracoes (salao_id, taxa_maquininha_pct=5.0, custo_fixo_por_atendimento=10.65)', 40, 175, 560, 30, DB)
t4 = N('INSERT INTO usuarios_auth (id, email, senha_hash=bcrypt(senha,10))', 40, 215, 560, 30, DB)
t5 = N('INSERT INTO perfis_acesso (auth_user_id, salao_id, cargo=PROPRIETARIO, username=email)', 40, 255, 560, 30, DB)
t6 = N('INSERT INTO logins_gerados (vendedor_id, salao_id, username, senha_temporaria=senha em TEXTO, auth_user_id)', 40, 295, 560, 30, DB)
t7 = N('connection.commit() -> resposta { sucesso, salao_id, auth_user_id }', 40, 335, 560, 30, CA)
t8 = N('Se qualquer etapa falhar: console.error + connection.rollback() TOTAL + 500 Transaction failed + connection.release() no finally', 40, 375, 560, 50, SG)
for a,b in [(t1,t2),(t2,t3),(t3,t4),(t4,t5),(t5,t6),(t6,t7),(t7,t8)]:
    E(a,b,'',ETX)

N('Criacao de atendimento (atendimentos.controller.js - transacao atomica)', 640, 70, 560, 20, SUB)
u1 = N('1. mesEstaFechado() -> 403 se o mes estiver fechado (antes de beginTransaction)', 655, 95, 545, 40, SG)
u2 = N('2. beginTransaction() · busca configuracao, profissional e procedimento - TODAS com AND salao_id', 655, 145, 545, 40, DB)
u3 = N('3. Calcula custo variavel via procedimento_produtos JOIN produtos_catalogo (ou fallback custo_variavel)', 655, 195, 545, 40, FI)
u4 = N('4. calcularValoresAtendimento(): maquininha, comissao (so FUNCIONARIO), lucro_liquido, lucro_possivel', 655, 245, 545, 40, FI)
u5 = N('5. INSERT atendimento (valores calculados gravados) + INSERT procedimentos adicionais em atendimento_procedimentos', 655, 295, 545, 50, DB)
u6 = N('6. Recalculo e agregacao dos totais (principal + adicionais)', 655, 355, 545, 40, FI)
u7 = N('7. UPDATE final dos totais agregados no atendimento', 655, 405, 545, 40, DB)
u8 = N('8. commit() + invalidarFechamentoCache(salao_id, data) · falha em qualquer etapa -> rollback + 500', 655, 455, 545, 50, CA)
for a,b in [(u1,u2),(u2,u3),(u3,u4),(u4,u5),(u5,u6),(u6,u7),(u7,u8)]:
    E(a,b,'',ETX)

N('Exclusao de salao (deletarSalao - transacao atomica com 21 DELETEs em cascata)', 640, 520, 560, 20, SUB)
N('Ordem real do codigo: atendimento_procedimentos (JOIN atendimentos) -> atendimentos -> procedimento_produtos -> procedimentos -> produtos_catalogo -> custos_fixos_itens -> homecare -> procedimentos_paralelos -> despesas -> gastos_pessoais -> fechamentos -> pagamentos_assinatura -> assinaturas -> logins_gerados -> logs_acesso -> configuracoes -> profissionais -> clientes -> usuarios_auth (subquery perfis_acesso) -> perfis_acesso -> saloes · rollback total em falha', 655, 545, 545, 110, DB)

N('Mes fechado - protecao contra escrita (fechamentoGuard.service.js)', 40, 440, 560, 20, SUB)
N('mesEstaFechado(connection, salao_id, data): SELECT id FROM fechamentos WHERE salao_id = ? AND DATE_FORMAT(mes, d{4}-d{2}) = DATE_FORMAT(?, d{4}-d{2}) LIMIT 1 · resultado true = mes fechado = BLOQUEIA qualquer escrita com 403. Chamado em: criarAtendimento, atualizarAtendimento (mes NOVO e atual), deletarAtendimento, e CREATE/UPDATE/DELETE financeiros do crud.controller (homecare, despesas, procedimentos_paralelos, gastos_pessoais - ambas datas: anterior e nova).', 55, 465, 545, 110, SG)

N('Fechamento mensal imutavel (fechamento.controller.js)', 40, 590, 560, 20, SUB)
N('salvarFechamentoMensal: valida mes por regex · verifica se ja existe (SELECT id WHERE salao_id AND mes) -> 400 Mes ja fechado. Operacao nao permitida · calcula dados (12 queries + toNum) · resultado_final desconta gastos_pessoais · INSERT em fechamentos (snapshot permanente) · UNIQUE(salao_id, mes) recomendada no schema (evidencia de SELECT de duplicidade; confirmar no DDL real) · mes fechado bloqueia CREATE/UPDATE/DELETE financeiros em todos os controllers.', 55, 615, 545, 110, FI)

N('Outras garantias de integridade', 40, 740, 1120, 20, SUB)
N('· substituicao atomica de procedimentos (substituirProcedimentosAtendimento): DELETE + INSERT dentro da mesma transacao com recalculo de todos os procedimentos e totais agregados · validacao de ENUM no backend (despesas.tipo - 10 valores) antes de chegar ao banco · sanitizacao de nomes de colunas e chaves por /^[a-zA-Z0-9_]+$/ no crud.controller (protecao estrutural contra SQL Injection) · constraints/foreign keys: euidencia parcial via JOINs; DDL completo nao esta no repositorio (schema_usuarios_auth.sql so cria usuarios_auth) - recomendado DDL versionado · transacoes usam rollback em qualquer falha · DECIMAL do mysql2 passa por toNum()/parseFloat antes de aritmetica (evita concatenacao string e NaN) · valores financeiros calculados no INSERT/UPDATE, nao confiados ao SELECT do frontend · todos os controllers que alteram dados invalidam o cache de fechamento · DIVERGENCIA: deletarAtendimento existe no controller mas NAO ha rota DELETE /atendimentos/:id (escrita inacessivel - registrar para correcao)', 55, 765, 1105, 130, TX)

page('08 - Transacoes e integridade')

# ===================== ABA 09 — SEGURANCA, AMEACAS E CONTROLES =====================
N('Seguranca, ameacas e controles (status verificado no codigo: Implementado / Parcial / Recomendado / Nao confirmado / Risco)', 40, 20, 1150, 30, TH)

N('14.1 Identidade e credenciais', 40, 70, 560, 20, SUB)
N('· senhas somente com hash seguro: bcrypt 10 rounds (Implementado)\n· nunca armazenar senha em texto puro (Implementado em usuarios_auth)\n· RISCO: logins_gerados.senha_temporaria em TEXTO PLANO e retornada por /admin/logins-gerados (Parcial - risco de suporte)\n· RISCO: senha da proprietaria gerada no frontend com Math.random (NovoSalao.jsx) (Parcial - recomendado: geracao server-side com crypto)\n· RISCO: email.service.js e STUB - sendInvitation faz console.log com senha temporaria (Risco de log + canal de entrega inexistente)\n· nunca retornar senha, PIN ou token desnecessariamente: dashboard_pin removido das respostas (Implementado); senha_hash nunca retornada (Implementado)\n· nao registrar senhas em logs: parcial - sendInvitation loga senha temporaria (Risco); login nao loga senha (OK)\n· protecao contra enumeracao: mensagens genericas Invalid credentials (Implementado parcial - usernames testaveis)\n· politica de senha forte: so criarAdmin (min 8 chars) (Parcial - login de proprietaria nao tem regra)\n· lockout: 5 falhas / 15min por IP (Implementado); atraso progressivo (Recomendado)\n· revogacao de sessao / invalidacao pos-troca de senha ou permissao (Recomendado - Nao confirmado)\n· usuarios inativos/desativados: saloes.ativo e profissionais.ativo existem; bloqueio de login por usuario desativado Nao confirmado', 55, 95, 545, 260, TX)

N('14.2 JWT e autorizacao', 640, 70, 560, 20, SUB)
N('· assinatura validada: jwt.verify(token, JWT_SECRET) (Implementado)\n· expiracao: expiresIn 24h (Implementado)\n· emissor/audiencia: NAO usados (Nao confirmado - Recomendado adicionar issuer/audience)\n· algoritmo permitido: NAO fixado no jwt.sign/verify (Nao confirmado - risco teorico de algorithm confusion; Recomendado fixar HS256)\n· payload minimo: { auth_user_id, salao_id, cargo } (Implementado)\n· nao confiar no frontend / nao aceitar tenant do body: salao_id sempre do token (Implementado)\n· impedir troca manual de userId/salaoId/cargo: backend deriva tudo do JWT (Implementado)\n· revalidar usuario em operacoes sensiveis: dupla checagem de cargo em controller (Implementado parcial)\n· impedir elevacao de privilegio: criarAdmin so via apenasVendedor; removerAdmin bloqueia auto-remocao (Implementado parcial - sem log de auditoria da mudanca)\n· JWT em localStorage: risco XSS (Recomendado: cookies HttpOnly/Secure/SameSite ou alternativa)', 655, 95, 545, 260, TX)

N('14.3 Seguranca da API', 40, 370, 560, 20, SUB)
N('· CORS com origens explicitas + credentials true; sem wildcard generico (aceita qualquer *.vercel.app - avaliar) (Implementado)\n· rate limit geral 1000/15min e login 100/15min; OPTIONS skip (Implementado)\n· brute force: lockout 5/15min por IP (Implementado)\n· limite de tamanho do body: express.json sem limit explicito (Nao confirmado - default 100kb do Express)\n· validacao de parametros/queries: validacoes pontuais (mes, data, campos obrigatorios) (Implementado parcial - sem schema completo tipo Joi/Zod: Recomendado)\n· validacao de payload por schema: Recomendado (Nao implementado)\n· sanitizacao: chaves de crud por regex; categoria/enums no frontend constants (Implementado parcial)\n· queries parametrizadas: 100% nos controllers (Implementado)\n· XSS: React escaping; dangerouslySetInnerHTML nao encontrado (Implementado)\n· command injection/path traversal/SSRF/prototype pollution: Nao se aplica/Nao identificado (sem exec/shell/upload/url fetch no codigo)\n· HTTP parameter pollution: Nao confirmado\n· metodos HTTP permitidos: restritos por rota (Implementado)\n· idempotencia para operacoes financeiras: Nao confirmado (fechamento tem guarda de duplicidade; atendimentos nao)\n· nao aceitar campos financeiros calculados pelo cliente: atendimentos recalcula maquininha/comissao/lucros no backend (Implementado); homecare recalcula lucro/pendente (Implementado); homecare aceita valor_venda/custo do cliente por necessidade de negocio (Parcial)', 55, 395, 545, 320, TX)

N('14.4 Headers de seguranca', 640, 370, 560, 20, SUB)
table(640, 395, [220, 100, 240], [
    ['Header', 'Status', 'Evidencia'],
    ['X-Content-Type-Options: nosniff', 'Implementado', 'app.js security headers'],
    ['X-Frame-Options: DENY', 'Implementado', 'app.js security headers'],
    ['X-XSS-Protection: 1; mode=block', 'Implementado (deprecado nos navegadores)', 'app.js security headers'],
    ['Referrer-Policy: no-referrer', 'Implementado', 'app.js security headers'],
    ['Cache-Control: no-store', 'Implementado', 'app.js security headers (dados sensiveis)'],
    ['Strict-Transport-Security (HSTS)', 'Recomendado', 'Nao presente no codigo (TLS na borda da plataforma)'],
    ['Content-Security-Policy', 'Recomendado', 'Nao presente (mitigacao XSS: React escaping)'],
    ['Permissions-Policy', 'Recomendado', 'Nao presente'],
    ['Remocao de headers que revelam tecnologia (X-Powered-By)', 'Recomendado', 'app.disable(x-powered-by) nao encontrado no codigo'],
], 24)

N('14.5 XSS, CSRF e navegador', 640, 660, 560, 20, SUB)
N('· escaping de dados: React faz por padrao; dangerouslySetInnerHTML ausente no src (Implementado)\n· CSP: Recomendado (nao presente)\n· cookies HttpOnly/Secure/SameSite: Nao usados (sessao e JWT no localStorage) - CSRF: risco reduzido pois autenticacao nao usa cookies (Bearer token), mas armazenamento local e vulneravel a XSS (avaliacao registrada)\n· URLs e redirecionamentos validados: window.location.replace(chr(47)) fixo (Implementado parcial - sem open redirect)\n· conteudo externo confiavel: sem iframes/scripts externos encontrados (Implementado/Nao se aplica)\n· limpeza segura de localStorage/sessionStorage: main.jsx (mudanca de versao) e api.js (401) (Implementado)\n· nao guardar dados sensiveis desnecessarios no navegador: guarda authToken/userEmail/userRole/salaoId/userId (necessario para sessao); PIN nunca em storage (Implementado para PIN; token em localStorage e risco residual)', 655, 685, 545, 200, TX)

page('09 - Seguranca, ameacas e controles (parte 1)')

# ===================== ABA 09 — SEGURANCA (parte 2) =====================
N('Seguranca, ameacas e controles (parte 2)', 40, 20, 1150, 30, TH)

N('14.6 Seguranca do banco', 40, 70, 560, 20, SUB)
N('· TLS obrigatorio: ssl minVersion TLSv1.2, rejectUnauthorized true (Implementado em config/db.js)\n· usuario de banco com menor privilegio: Nao confirmado (credenciais em env; DDL/GRANTs fora do repositorio - Recomendado)\n· ambientes separados: .env.staging e banco SalaosecretoStaging (evidencia em backend-node/.env.example) (Implementado parcial - confirmar producao)\n· prepared statements: mysql2 com placeholders ? em 100% das queries (Implementado)\n· pool e timeout: connectionLimit 20, connectTimeout 10000 (Implementado); statement timeout para queries pesadas (Recomendado)\n· protecao contra consultas pesadas: Nao confirmado (Recomendado: LIMIT, paginacao, indices)\n· constraints e foreign keys: evidencia parcial (JOINs consistentes; schema_usuarios_auth.sql tem UNIQUE email; DDL completo fora do repositorio - Recomendado versionar)\n· indices de salao_id: Nao confirmado (Recomendado: indices em salao_id em todas as tabelas de tenant)\n· transacoes: com rollback em criarProprietaria, deletarSalao, atendimentos (Implementado)\n· backups: Nao confirmado (TiDB Cloud gerenciado - validar plano e retencao) (Recomendado: backup + teste de restauracao documentado)\n· nao expor mensagens internas do banco: handlers retornam mensagens genericas (Implementado parcial - erros 500 genericos, mas alguns erros de negocio propagam texto interno)\n· nao expor credenciais: .env fora do git (gitignore) (Implementado)\n· protecao de registros imutaveis: fechamentos (guarda no controller + UNIQUE salao_id,mes) (Implementado parcial - confirmar DDL)', 55, 95, 545, 320, TX)

N('14.7 Seguranca financeira', 640, 70, 560, 20, SUB)
N('· calculo financeiro no backend: maquininha, comissao, lucros, homecare lucro/pendente (Implementado)\n· frontend nao e fonte de verdade: valores gravados vem do backend (Implementado) - excecao: PIN definido no frontend no reset (divergencia)\n· valores em centavos ou decimal controlado: frontend FinancialEngine usa centavos inteiros; backend usa roundToDecimal (v + EPSILON) (Implementado)\n· recalculation no servidor: calcularValoresAtendimento chamado no INSERT/UPDATE (Implementado)\n· validacao de status e transicoes: ENUM status AGENDADO/EXECUTADO/CANCELADO; validacao de tipo de despesa (Implementado parcial - sem state machine explicita)\n· mes fechado bloqueia escrita: mesEstaFechado em todos os CRUD financeiros (Implementado)\n· fechamento imutavel: INSERT falha se ja existe (guarda no controller) (Implementado)\n· prevencao de duplicidade: UNIQUE(salao_id, mes) recomendada no DDL (Parcial - confirmar)\n· auditoria de alteracoes: Nao confirmado (Recomendado: log de alteracoes financeiras)\n· separacao cobrado/pago/pendente/lucro: colunas distintas e recalculadas (Implementado)\n· transacoes atomicas: criarProprietaria, deletarSalao, atendimentos (Implementado)', 655, 95, 545, 320, TX)

N('14.8 Dashboard e relatorios', 40, 430, 560, 20, SUB)
N('· PIN validado EXCLUSIVAMENTE no backend: POST /auth/verify-dashboard-password compara com dashboard_pin de configuracoes WHERE salao_id = JWT (Implementado)\n· PIN nunca retornado: crud.controller remove dashboard_pin de listar/obterPorId; verifyDashboardPassword retorna apenas { authorized } (Implementado)\n· RISCO/divergencia: definicao do NOVO PIN no reset e feita no frontend (Math.random) e salva via PUT /cadastros/configuracoes/:id (Parcial + risco - recomendado: geracao server-side)\n· bloqueio por visibilitychange e blur: useDashboardProtection.js (Implementado)\n· isLocked somente em memoria: hook usa useState (Implementado)\n· PIN nao salvo em localStorage/sessionStorage: confirmado no codigo do hook e overlay (Implementado)\n· reset exige validacao da senha de login: POST /auth/verify-login-password com bcrypt (Implementado)\n· rate limit de validacao do dashboard: apenas limiter geral (Nao confirmado - Recomendado: limiter especifico)\n· cache com tenant e periodo: fechamentoCache salao_id:mes (Implementado)\n· invalidacao apos alteracoes: invalidarFechamentoCache (Implementado)\n· filtros de periodo validados: regex mes/data (Implementado)\n· relatorios limitados ao tenant autenticado: WHERE salao_id (Implementado)\n· controle de exportacao: Nao identificado no codigo (Nao confirmado/Recomendado)', 55, 455, 545, 300, TX)

N('14.9 Logs e observabilidade', 640, 430, 560, 20, SUB)
N('· Sentry: instrument.js init + expressIntegration + setupExpressErrorHandler (Implementado no backend); Sentry browser no frontend (Nao confirmado)\n· logs estruturados: Nao implementado - apenas console.error/console.log (Recomendado)\n· request ID: Nao presente (Recomendado)\n· eventos a registrar (status atual): login bem-sucedido (nao logado), login falho (console.error), lockout (nao logado), mudanca de permissao (nao logado), criacao/exclusao de salao (nao logado), alteracao financeira (nao logado), fechamento mensal (nao logado), falhas de autorizacao (nao logado), tentativa de acesso entre tenants (403 generico, nao alertado) - REGISTRO DE EVENTOS DE SEGURANCA: Recomendado\n· alertas de comportamento anomalo (Recomendado)\n· retencao de logs e acesso restrito aos logs (Recomendado - console no provedor)\n· PROIBIDO registrar (invariantes): senha, PIN, JWT completo, senha temporaria, dados financeiros desnecessarios - status: PIN/JWT/senha NAO aparecem em logs (Implementado); senha_temporaria aparece em console.log do email stub (RISCO confirmado - corrigir)', 655, 455, 545, 300, TX)

N('14.10 Segredos e configuracao', 40, 770, 560, 20, SUB)
N('· JWT_SECRET em variavel de ambiente (Implementado)\n· credenciais do banco fora do codigo: DB_HOST/USER/PASSWORD/NAME em env (Implementado)\n· chaves do Sentry protegidas: SENTRY_DSN em env (Implementado)\n· segredos separados por ambiente: .env, .env.staging, .env.example (Implementado parcial)\n· ausencia de .env no repositorio: .env e backend-node/.env fora do git (git ls-files confirma apenas .env.example) (Implementado)\n· rotacao de segredos (Recomendado)\n· secret scanning na pipeline (Recomendado)\n· configuracao segura na Vercel (VITE_*), Render (env vars) e TiDB Cloud (Recomendado/operacional)', 55, 795, 545, 160, TX)

N('14.11 Dependencias e supply chain', 640, 770, 560, 20, SUB)
N('· lockfile versionado: package-lock.json no frontend e backend (Implementado)\n· npm audit / analise de vulnerabilidades: .pytest_cache e roadm.md nao comprovam execucao (Nao confirmado - Recomendado: npm audit periodicamente)\n· atualizacao de dependencias / dependabot: Nao confirmado (Recomendado)\n· overrides de seguranca no backend package.json: tar ^7.5.21 e semver ^7.6.0 (Implementado - evidencia de correcao pontual)\n· revisao de pacotes novos (Recomendado)\n· dependencias de producao separadas das de desenvolvimento: backend tem devDependencies nodemon (Implementado); frontend package.json (Implementado)\n· build reprodutivo: Vite build com esbuild e manualChunks (Implementado parcial)\n· protecao da pipeline CI/CD: pipeline de CI/CD Nao confirmada no repositorio (deploy manual via Vercel/Render presumido) (Nao confirmado)', 655, 795, 545, 160, TX)

page('09 - Seguranca, ameacas e controles (parte 2)')

# ===================== ABA 10 — DEPLOY, OBSERVABILIDADE E OPERACAO =====================
N('Deploy, observabilidade e operacao', 40, 20, 1150, 30, TH)

N('Infraestrutura', 40, 70, 350, 20, SUB)
N('· Frontend: Vercel (SPA React/Vite) · HTTPS obrigatorio na borda (Implementado)\n· Backend: Render (Node/Express, PORT 3333) · HTTPS na borda (Implementado)\n· Banco: TiDB Cloud (MySQL-compatible, porta 4000, TLS v1.2) (Implementado)\n· Ambiente staging: DB_NAME SalaosecretoStaging (evidencia .env.example) (Implementado parcial - homologacao separada: parcial)\n· Banco nao exposto diretamente a internet: acesso via gateway TiDB com TLS e credenciais (Implementado parcial - IP allowlist nao confirmado)\n· MFA para contas administrativas da plataforma (Recomendado - nao evidenciado)\n· Restricao de origens administrativas: CORS *.vercel.app (avaliar) (Parcial)', 55, 95, 335, 260, TX)

N('Pipeline e variaveis de ambiente', 420, 70, 350, 20, SUB)
N('· Variaveis: VITE_API_URL, VITE_WHATSAPP_SUPORTE, VITE_PIX_* (Vercel) · SENTRY_DSN, JWT_SECRET, DB_*, RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_MAX, ALLOWED_ORIGINS, PORT (Render) · (Implementado)\n· Segredos: JWT_SECRET, DB_PASSWORD, SENTRY_DSN em env - nunca no repositorio (Implementado)\n· Pipeline CI/CD: Nao confirmada no repositorio (deploy presumido via integracao Vercel/Render + git) (Nao confirmado)\n· Revisao antes de deploy / rollback do deploy: rollback via redeploy da plataforma (Recomendado - runbook Nao confirmado)\n· Health check: GET /health retorna { ok: true } (Implementado)\n· Limites do plano gratuito: Render free (cold start mitigado no frontend com getComRetry/criarPool) (Implementado parcial); rate limit 1000/15min dimensionado por causa disso (Implementado)', 435, 95, 335, 260, TX)

N('Observabilidade e operacao', 820, 70, 370, 20, SUB)
N('· Sentry: backend init + express error handler (Implementado); frontend (Nao confirmado)\n· Logs: console.error (Recomendado: estruturados + request id)\n· Metricas/monitoramento de uptime: nao evidenciado (Recomendado: UptimeRobot/equivalente)\n· Alertas: nao configurados no codigo (Recomendado)\n· Backup e restore: gerenciados pelo TiDB Cloud (validar); teste de restauracao documentado (Recomendado - Nao confirmado)\n· Rollback de dados: transacoes com rollback em erro de negocio (Implementado); PITR do banco (validar com TiDB)\n· Timeouts: connectTimeout 10000 (Implementado); circuit breaker (Recomendado/Nao confirmado)\n· Disponibilidade: cold start do Render free mitigado no cliente (Implementado parcial)\n· Pontos de falha e recuperacao: reinicio do servico limpa lockout Map e fechamentoCache (TTL 30s limita impacto) (observado)', 835, 95, 355, 260, TX)

N('Fluxo de operacao diaria (resumo)', 40, 380, 1150, 20, SUB)
p1 = N('Usuario -> Frontend Vercel (HTTPS, SPA)', 40, 405, 260, 50, FE)
p2 = N('Backend Render (health /health, env vars)', 330, 405, 260, 50, BE)
p3 = N('TiDB Cloud :4000 TLS (pool 20, staging/prod)', 620, 405, 260, 50, DB)
p4 = N('Sentry (erros HTTP capturados) + console logs', 930, 405, 260, 50, OB)
for a,b in [(p1,p2),(p2,p3)]:
    E(a,b,'',ER)
E(p2,p4,'',ERT)
N('Operadores e responsabilidade: MFA nas contas Vercel/Render/TiDB (Recomendado), segredos rotacionados (Recomendado), teste de restore periodico (Recomendado), monitoramento externo de uptime (Recomendado).', 40, 480, 1150, 40, RC)

page('10 - Deploy, observabilidade e operacao')

# ===================== ABA 11 — FLUXO CONSOLIDADO =====================
N('Fluxo consolidado - onde ocorre cada bloqueio', 40, 20, 1150, 30, TH)
f1 = N('Usuario (cargo VENDEDOR/PROPRIETARIO/FUNCIONARIO)', 40, 70, 200, 60, US)
f2 = N('Frontend (App.jsx: roteamento por cargo, Navigate bloqueios visuais) · api.js fetchWithAuth (Bearer)', 260, 70, 200, 60, FE)
f3 = N('HTTPS', 480, 70, 120, 60, FE)
f4 = N('CORS (origens explicitas, credentials)', 620, 70, 200, 60, SG)
f5 = N('Rate limit (1000/15min; login 100/15min) · OPTIONS skip', 840, 70, 200, 60, SG)
f6 = N('Autenticacao JWT (jwt.verify -> req.user) · 401 se ausente/invalido/expirado', 1060, 70, 130, 60, SG)
f7 = N('Middleware autorizacao (apenasVendedor: 403 se cargo != VENDEDOR)', 40, 170, 300, 60, SG)
f8 = N('Validacao de cargo no controller (dupla checagem) · 403 Acesso negado', 360, 170, 300, 60, BE)
f9 = N('Validacao de tenant (salao_id do JWT; nunca do body)', 680, 170, 300, 60, BE)
f10 = N('Controller (validacoes de entrada: campos, regex mes/data, ENUM despesas)', 40, 270, 300, 60, BE)
f11 = N('Service (financialEngine.service, fechamentoGuard.service: 403 mes fechado)', 360, 270, 300, 60, BE)
f12 = N('Query parametrizada (placeholders ?) + sanitizacao de chaves crud', 680, 270, 300, 60, DB)
f13 = N('Banco isolado por salao_id (WHERE salao_id = ? em toda query) · transacao/rollback · cache (NodeCache salao_id:mes + invalidacao) · fechamentos UNIQUE salao_id,mes', 40, 370, 940, 60, DB)
f14 = N('Relatorios/dashboard/graficos (agregacoes SUM/COUNT/GROUP BY com toNum())', 40, 470, 440, 60, FI)
f15 = N('Logs/Sentry/monitoramento (expressIntegration + error handler) · 500 Internal server error sem stack', 520, 470, 460, 60, OB)
for a,b in [(f1,f2),(f2,f3),(f3,f4),(f4,f5),(f5,f6),(f2,f7),(f7,f8),(f8,f9),(f9,f10),(f10,f11),(f11,f12),(f12,f13),(f13,f14),(f13,f15)]:
    E(a,b,'',ER)

N('Bloqueios por camada (qual camada impede cada ataque/erro)', 40, 560, 1150, 20, SUB)
table(40, 585, [220, 320, 300, 310], [
    ['Ataque/erro', 'Camada que impede', 'Bloqueio (status)', 'Resposta ao cliente'],
    ['Brute force login', 'App (limiter) + controller (Map lockout)', 'Rate limit + lockout (Implementado)', '429'],
    ['Token ausente/invalido/expirado', 'middleware/auth.js', 'jwt.verify (Implementado)', '401 + frontend limpa sessao'],
    ['Cargo sem permissao', 'apenasVendedor.js + controller', 'checagem de cargo (Implementado)', '403'],
    ['Acesso entre tenants (IDOR/BOLA)', 'controller + query', 'WHERE salao_id = JWT (Implementado; testes: Recomendado)', '403/404'],
    ['Escrita em mes fechado', 'service fechamentoGuard', 'mesEstaFechado (Implementado)', '403 Este mes ja foi fechado'],
    ['SQL Injection', 'controller + mysql2', 'parametrizadas + regex chaves (Implementado)', '400/sem efeito'],
    ['Mass assignment', 'crud.controller', 'sanitizacao de chaves (Parcial; allowlist: Recomendado)', '400 campos invalidos'],
    ['XSS', 'React + headers', 'escaping + nosniff + X-XSS (Implementado; CSP: Recomendado)', 'sem execucao'],
    ['Clickjacking', 'headers', 'X-Frame-Options DENY (Implementado)', 'sem render em iframe'],
    ['Duplicidade de fechamento', 'controller + UNIQUE', 'guarda + UNIQUE salao_id,mes (Implementado/confirmar DDL)', '400 Mes ja fechado'],
    ['Erro interno', 'generic handler', '500 sem stack (Implementado)', '500 Internal server error'],
    ['Cold start / 5xx', 'frontend', 'getComRetry 429/502/503/504 + criarPool (Implementado)', 'retry com backoff'],
    ['Cache cruzado', 'fechamento.controller', 'chave salao_id:mes (Implementado)', 'sem vazamento'],
    ['Vazamento de PIN', 'crud.controller + verifyDashboardPassword', 'remocao do campo + resposta booleana (Implementado)', '{ authorized }'],
], 40)

page('11 - Fluxo consolidado')

# ===================== ABA 12 — AUDITORIA DE COBERTURA =====================
N('Auditoria de cobertura - inventario completo (Item / Localizacao no codigo / Aba do diagrama / Status / Evidencia)', 40, 20, 1150, 30, TH)

N('Rotas, middlewares e controllers', 40, 60, 1150, 20, SUB)
table(40, 85, [230, 240, 180, 180, 320], [
    ['Item', 'Localizacao no codigo', 'Aba do diagrama', 'Status', 'Evidencia ou observacao'],
    ['POST /auth/login', 'auth.controller.js login', '02, 04', 'Implementado', 'bcrypt.compare, lockout Map, JWT 24h'],
    ['POST /auth/verify-dashboard-password', 'auth.controller.js verifyDashboardPassword', '02, 03, 04, 09', 'Implementado', 'exige auth.js; compara dashboard_pin; nunca expoe PIN'],
    ['POST /auth/verify-login-password', 'auth.controller.js verifyLoginPassword', '02, 04, 09', 'Implementado', 'exige auth.js; bcrypt'],
    ['middleware/auth.js', 'middlewares/auth.js', '02, 04, 11', 'Implementado', 'jwt.verify -> req.user { auth_user_id, salao_id, cargo }'],
    ['middleware/apenasVendedor.js', 'middlewares/apenasVendedor.js', '02, 04, 11', 'Implementado', '403 requires VENDEDOR'],
    ['/admin/* (4 rotas)', 'admin.controller.js', '02, 04', 'Implementado', 'auth + apenasVendedor; removerAdmin bloqueia auto-remocao'],
    ['/salao/* (6 rotas)', 'salao.controller.js', '02, 04, 08', 'Implementado', 'GET/POST/DELETE com apenasVendedor; PUT/PATCH/GET:id com checagem de tenant no controller'],
    ['POST /salao/criar-proprietaria (transacao)', 'salao.controller.js criarProprietaria', '08', 'Implementado', '5 INSERTs atomicos + rollback total'],
    ['deletarSalao (21 deletes)', 'salao.controller.js deletarSalao', '08', 'Implementado', 'transacao atomica, rollback; RISCO: nao valida vendedor_id do salao antes de deletar'],
    ['/atendimentos/* (5 rotas)', 'atendimentos.controller.js + routes', '04, 05, 08', 'Implementado', 'transacao; mesEstaFechado; invalidacao de cache; DIVERGENCIA: deletarAtendimento sem rota DELETE'],
    ['/fechamento/:mes (GET, POST)', 'fechamento.controller.js', '06, 08', 'Implementado', 'NodeCache 30s; 12 queries; toNum; INSERT imutavel'],
    ['/cadastros/* (11 tabelas)', 'crud.controller.js + cadastros.routes.js', '04, 07, 08', 'Implementado', 'CRUD generico com tenant, sanitizacao, mes fechado, PIN oculto, fallback P/M/G'],
    ['/relatorios/* (9 endpoints)', 'relatorios.controller.js', '06', 'Implementado', 'todas WHERE salao_id; validacao regex mes/data; rota rendimento-professional (com N)'],
    ['POST /usuarios/convidar', 'usuarios.controller.js', '04, 09', 'Implementado', 'salao_id do token; senha temporaria randomBytes; email stub'],
    ['/admin/logins-gerados (senha em texto)', 'admin.controller.js listarLoginsGerados', '04, 09', 'Implementado (RISCO)', 'retorna senha_temporaria em texto - risco de exposicao (suporte)'],
    ['rota DELETE /atendimentos/:id', 'atendimentos.routes.js', '08', 'Nao identificado (divergencia)', 'controller deletarAtendimento existe mas rota nao registrada'],
], 34)

N('Componentes, hooks e servicos', 40, 720, 1150, 20, SUB)
table(40, 745, [230, 240, 180, 180, 320], [
    ['Item', 'Localizacao no codigo', 'Aba do diagrama', 'Status', 'Evidencia ou observacao'],
    ['main.jsx (cache-busting app_version)', 'src/main.jsx', '03', 'Implementado', 'localStorage.clear + sessionStorage.clear ao mudar versao v8.1.2'],
    ['ErrorBoundary', 'src/components/ErrorBoundary.jsx', '03', 'Implementado', 'envolve a arvore React'],
    ['App.jsx (roteamento por cargo)', 'src/App.jsx', '03', 'Implementado', 'VENDEDOR -> VendedorApp; FUNCIONARIO -> Navigate /agenda nas rotas restritas'],
    ['Sidebar (roles)', 'src/components/Sidebar.jsx', '03', 'Implementado', 'roles PROPRIETARIO/FUNCIONARIO por item'],
    ['api.js fetchWithAuth/getComRetry/criarPool', 'src/services/api.js', '03', 'Implementado', 'Bearer; 401 anti-zumbi; retry 429/502/503/504; pool concorrencia'],
    ['FinancialEngine.js (frontend)', 'src/services/FinancialEngine.js', '03, 05', 'Implementado', 'centavos inteiros; replica das formulas; PREVIA apenas (fonte de verdade: backend)'],
    ['useDashboardProtection.js', 'src/hooks/useDashboardProtection.js', '03, 09', 'Implementado', 'PIN no backend; isLocked em memoria; visibilitychange/blur; PIN nunca em storage'],
    ['DashboardLockOverlay.jsx (reset PIN)', 'src/components/DashboardLockOverlay.jsx', '03, 09', 'Implementado parcialmente (RISCO)', 'reset: novo PIN gerado com Math.random no FRONTEND e salvo via PUT configuracoes (divergencia do fluxo recomendado)'],
    ['BannerOffline.jsx', 'src/components/BannerOffline.jsx', '03', 'Implementado', 'navigator.onLine + offline/online'],
    ['NovoSalao.jsx (senha no frontend)', 'src/vendedor/NovoSalao.jsx', '03, 09', 'Implementado parcialmente (RISCO)', 'gerarSenhaSegura Math.random 10 chars no cliente; senha trafega no body; recomendado server-side'],
    ['Assinaturas.jsx', 'src/vendedor/Assinaturas.jsx', '03, 07', 'Legado - desativado', 'moduloDesativado=true; codigo Supabase comentado'],
    ['financialEngine.service.js', 'backend-node/src/services/financialEngine.service.js', '05', 'Implementado', 'roundToDecimal EPSILON; comissao so FUNCIONARIO; lucroPossivel sem maquininha; engenharia reversa; custoFixoRateado; custoVariavelInsumos; saudeFinanceira'],
    ['fechamentoGuard.service.js', 'backend-node/src/services/fechamentoGuard.service.js', '08', 'Implementado', 'SELECT fechamentos WHERE salao_id AND mes; true bloqueia escrita 403'],
    ['email.service.js', 'backend-node/src/services/email.service.js', '09', 'Implementado parcialmente (STUB + RISCO)', 'console.log com senha temporaria; preparado para SendGrid/Mailgun (nao integrado)'],
], 34)

N('Tabelas, seguranca e operacao', 40, 1030, 1150, 20, SUB)
table(40, 1055, [230, 240, 180, 180, 320], [
    ['Item', 'Localizacao no codigo', 'Aba do diagrama', 'Status', 'Evidencia ou observacao'],
    ['usuarios_auth / perfis_acesso / saloes / logins_gerados', 'queries em auth/salao/admin.controllers', '07', 'Implementado', 'identidade compartilhada; vendedor com salao_id null; soft delete saloes.deletado_em'],
    ['14 tabelas isoladas por salao_id', 'queries WHERE salao_id em todos os controllers', '07', 'Implementado', 'configuracoes..procedimentos_paralelos (lista na aba 07)'],
    ['assinaturas / pagamentos_assinatura / logs_acesso', 'deletarSalao + Assinaturas.jsx (supabase)', '07', 'Legado', 'em fase de saida (Supabase -> TiDB)'],
    ['fechamentos UNIQUE(salao_id, mes)', 'SELECT duplicidade em salvarFechamentoMensal', '08', 'Implementado parcialmente', 'guarda no controller; DDL completo fora do repositorio - versionar schema'],
    ['atendimento_procedimentos.salao_id', 'atendimentos.controller.js (JOINs)', '07, 08', 'Nao confirmado', 'DELETEs usam JOIN com atendimentos; obterAtendimento consulta sem salao_id proprio (depende do pai)'],
    ['instrument.js Sentry.init', 'backend-node/src/instrument.js', '04, 10', 'Implementado', 'expressIntegration; require antes de app.js em server.js'],
    ['Security headers sem Helmet', 'backend-node/src/app.js', '04, 09', 'Implementado', 'nosniff, DENY, X-XSS, no-referrer, no-store; HSTS/CSP/Permissions-Policy: Recomendado'],
    ['CORS + rate limits', 'backend-node/src/app.js', '04, 09', 'Implementado', 'origens explicitas + *.vercel.app; 1000/15min; login 100/15min; OPTIONS skip'],
    ['Generic error handler sem stack', 'backend-node/src/app.js', '04, 09, 11', 'Implementado', '500 Internal server error; stack apenas em console'],
    ['config/db.js TLS + pool 20', 'backend-node/src/config/db.js', '04, 07', 'Implementado', 'TLSv1.2 rejectUnauthorized; connectionLimit 20; connectTimeout 10000'],
    ['invalidarFechamentoCache (todos os escritores)', 'fechamento.controller.js + chamadas', '06, 08', 'Implementado', 'chamado em criar/atualizar/substituir/deletar atendimento e CREATE/UPDATE/DELETE crud financeiro'],
    ['toNum() para DECIMAL string', 'fechamento.controller.js', '05, 06', 'Implementado', 'mysql2 DECIMAL -> string; normalizacao antes de aritmetica'],
    ['vercel.json (cache + SPA)', 'vercel.json', '03, 10', 'Implementado', 'no-cache no-store para / e /index.html; assets 1 ano immutable'],
    ['.env fora do repositorio', '.gitignore + git ls-files', '09, 10', 'Implementado', 'apenas .env.example versionado'],
    ['Backups / teste de restauracao', 'operacao TiDB Cloud', '10', 'Nao confirmado (Recomendado)', 'nao ha script/roadmap evidenciado no repositorio'],
    ['LGPD / privacidade', 'sistema trata telefone/email/financeiro de clientes', '09, 12', 'Recomendado (avaliar juridicamente)', 'dados de clientes (nome, telefone) e financeiros; minimizacao/mascaramento/auditoria de acesso: Recomendado; NAO declarar conformidade legal por controles tecnicos'],
], 34)

N('Criterio de completude: todos os rotas/componentes/controllers/services/tabelas/formulas/middlewares/protecoes/ameacas do inventario do prompt (secao 20) estao representados nas abas 01-11 com localizacao, status e evidencia. Itens ausentes na implementacao foram marcados como Nao identificado/Risco/Recomendado/Nao confirmado com motivo (rotas DELETE ausentes, email stub, reset de PIN no frontend, senha no frontend, backups, LGPD, CSP/HSTS, logs estruturados, testes cross-tenant, controle de exportacao, idempotencia).', 40, 1390, 1150, 60, RC)

page('12 - Auditoria de cobertura')

# ===================== GERACAO DO XML =====================
diag = []
for name, body in pages:
    diag.append('<diagram name="%s" id="p%d">'
                '<mxGraphModel dx="1400" dy="800" grid="1" gridSize="10" guides="1" '
                'tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" '
                'pageWidth="1600" pageHeight="1200" math="0" shadow="0">'
                '<root><mxCell id="0"/><mxCell id="1" parent="0"/>%s</root>'
                '</mxGraphModel></diagram>' % (esc(name), len(diag) + 1, body))

xml = ('<mxfile host="app.diagrams.net" agent="SALAO-ADM-doc" version="24.0.0">'
       '%s</mxfile>' % ''.join(diag))

with open(OUT, 'w', encoding='utf-8') as fh:
    fh.write(xml)

print('Gerado: %s (%d abas, %d bytes)' % (OUT, len(pages), len(xml)))
