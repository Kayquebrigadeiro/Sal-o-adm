# backend-node

Projeto Node/Express que replica 6 Edge Functions do Supabase para uso com MySQL/TiDB.

Instalação

1. Copie `.env.example` para `.env` e ajuste as variáveis.
2. npm install
3. npm run dev

Endpoints principais
- POST /auth/login
- POST /auth/verify-dashboard-password (protegido)
- POST /salao/criar-proprietaria (protegido, VENDEDOR)
- DELETE /salao/:salao_id (protegido, VENDEDOR)
- POST /admin/criar-admin (protegido, VENDEDOR)
- DELETE /admin/:user_id (protegido, VENDEDOR)
- POST /usuarios/convidar (protegido)

Notas
- Email service é um stub (console.log). Substituir por provedor real mais tarde.
- A validação de assinatura está desativada intencionalmente.
