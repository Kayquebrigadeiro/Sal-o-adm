# ROW LEVEL SECURITY (RLS) — V2

O PostgreSQL fornece políticas de segurança avançadas em nível de linha, conhecidas como **Row Level Security (RLS)**. No "Salão Secreto", esta tecnologia garante que nenhum código de Frontend, mesmo se mal escrito ou manipulado no cliente, consiga extrair informações confidenciais do Tenant vizinho.

## 1. REGRAS BÁSICAS

Para qualquer tabela habilitada com `ENABLE ROW LEVEL SECURITY`, toda tentativa de consulta (SELECT) ou mutação (INSERT, UPDATE, DELETE) passará por um filtro prévio (cláusula implícita no motor SQL).

Exemplo de abstração da regra central:
```sql
CREATE POLICY "Isolar tabelaX" ON tabelaX
FOR ALL TO authenticated
USING (
  salao_id IN (
    SELECT salao_id 
    FROM perfis_acesso 
    WHERE auth_user_id = auth.uid()
  )
)
```
*Se a condição for FALSE, é como se a linha não existisse.*

## 2. POLÍTICAS CRÍTICAS APLICADAS NO SCHEMA V8

### A. Tabelas Operacionais Isoladas
Todas as entidades transacionais (`configuracoes`, `profissionais`, `procedimentos`, `atendimentos`, `homecare`, `despesas`, `fechamentos`, `clientes`) estão protegidas com RLS universal:
O usuário tem que pertencer àquele `salao_id` especificado na sua tabela de `perfis_acesso`.

### B. O Caso da Tabela `saloes`
A tabela pai possui RLS fragmentada devido a sua função atípica (Tenants precisam ser lidos por vendedores e também por si próprios).
1. `Salao: acesso por perfil`: Os membros que fazem parte do salão podem acessar os dados dele.
2. `Salao: vendedor ve seus clientes`: O dono da afiliação (Vendedor) pode ler o registro da franquia.
3. `Salao: membro atualiza`: Apenas os membros com cargo de `PROPRIETARIO` podem promover updates de seus metadados. Funcionários são restritos a *Read-Only* do nó raiz do Tenant.

### C. Segurança Transacional (`WITH CHECK`)
Políticas não contam apenas com `USING` (para leitura). O projeto aplica obrigações `WITH CHECK` nos Updates/Inserts, prevenindo que um usuário tente "Mover" um objeto do Salão A para o Salão B alterando sua FK (Foreign Key) manualmente na requisição de API.

## 3. IMPLICAÇÕES PARA O DESENVOLVIMENTO

Graças a esta camada impenetrável de proteção:
- O frontend pode e deve continuar executando as rotinas de busca simples como `.from('atendimentos').select('*')`, sabendo que o Backend enviará **somente e puramente** os dados logados do salão autorizado. O `.eq('salao_id', meuSalao)` utilizado nas actions React é feito principalmente por performance da biblioteca do Supabase, mas a barreira de chumbo está no RLS.
