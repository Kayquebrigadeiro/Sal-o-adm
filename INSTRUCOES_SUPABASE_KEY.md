# 🔑 Como Corrigir as Credenciais do Supabase

## ❌ Problema Atual

O arquivo `src/supabaseClient.js` está usando uma chave inválida:
```javascript
const supabaseKey = 'sb_publishable_Xl__VDfbLbOBP6hRDGMyMg_YmDr67hk';
```

Essa chave está **incorreta** e por isso está dando timeout.

## ✅ Solução

### 1. Pegar a chave correta:

1. Acesse: https://app.supabase.com/project/fnvhwfdrmozihekmhbke/settings/api
2. Na seção **"Project API keys"**, copie a chave **"anon public"**
3. Ela é uma string LONGA que começa com `eyJ...` (tipo JWT)

### 2. Atualizar o arquivo `src/supabaseClient.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fnvhwfdrmozihekmhbke.supabase.co';
const supabaseKey = 'COLE_AQUI_A_CHAVE_ANON_PUBLIC'; // Deve começar com eyJ...

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### 3. Salvar e recarregar:

1. Salve o arquivo
2. O Vite vai recarregar automaticamente
3. Faça login novamente
4. Agora deve funcionar!

## 🔍 Como Identificar a Chave Correta

A chave **anon public** tem estas características:
- ✅ Começa com `eyJ`
- ✅ É muito longa (centenas de caracteres)
- ✅ Parece um JWT (tem pontos separando 3 partes)
- ✅ Exemplo: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZudmh3ZmRybW96aWhla21oYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODc...`

A chave que você está usando:
- ❌ Começa com `sb_publishable_`
- ❌ É curta
- ❌ Não é uma chave válida do Supabase

## 📝 Depois de Corrigir

Quando você fizer login, o console deve mostrar:
```
[App] Iniciando autenticação...
[App] Sessão obtida: Autenticado
[App] 🔄 Tentativa 1/8 de carregar perfil...
[App] ✅ Perfil carregado: { cargo: 'VENDEDOR', salao_id: null }
```

E você será redirecionado para o painel do vendedor! 🎉
