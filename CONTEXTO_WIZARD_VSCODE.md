# Contexto para a IA do VS Code — Substituição do Wizard

## O que fazer

Substituir o arquivo `src/pages/WizardPrimeiroAcesso.jsx` pelo novo arquivo enviado.
O arquivo antigo deve ser **apagado e completamente substituído** pelo novo — não mesclar.

---

## O que mudou

O wizard antigo tinha etapas simples (nome do salão, nome da proprietária).
O novo wizard tem 4 etapas completas de configuração do salão:

| Etapa | Conteúdo |
|---|---|
| 1 | Nome da proprietária + equipe (funcionários com cargo e comissão %) |
| 2 | Horário de funcionamento por dia da semana (toggle aberto/fechado + horários) |
| 3 | Procedimentos por categoria (Cabelos com 3 preços por tamanho, Unhas/Estética/Outros com preço único) |
| 4 | Despesas fixas mensais (Aluguel, Água, Luz, Internet, Produtos + campos extras) |

---

## O que o novo arquivo salva no Supabase

### Tabela `saloes`
```sql
UPDATE saloes SET
  configurado = true,
  nome_proprietaria = 'Nome digitado',
  horario = { JSON com horários por dia }
WHERE id = salaoId;
```
**Atenção:** A tabela `saloes` precisa ter as colunas `nome_proprietaria` (text) e `horario` (jsonb).
Se não existirem, rodar no SQL Editor do Supabase:
```sql
ALTER TABLE saloes ADD COLUMN IF NOT EXISTS nome_proprietaria text;
ALTER TABLE saloes ADD COLUMN IF NOT EXISTS horario jsonb;
```

### Tabela `profissionais`
Insere os funcionários com: `salao_id`, `nome`, `cargo` (FUNCIONARIO ou SOCIO), `comissao_percentual`, `ativo = true`.

### Tabela `procedimentos`
Cabelos viram 3 linhas separadas: `"Corte (Curto)"`, `"Corte (Médio)"`, `"Corte (Longo)"` com seus respectivos valores.
Campos inseridos: `salao_id`, `nome`, `valor`, `categoria` (CABELO / UNHAS / ESTETICA / OUTROS).

**Atenção:** A tabela `procedimentos` precisa ter a coluna `categoria` (text).
Se não existir:
```sql
ALTER TABLE procedimentos ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'OUTROS';
```

### Tabela `despesas`
Insere as despesas fixas com: `salao_id`, `descricao`, `valor`, `valor_pago = 0`, `data` (hoje), `tipo = 'FIXA'`.

---

## Arquivo a substituir

- **Caminho:** `src/pages/WizardPrimeiroAcesso.jsx`
- **Ação:** Apagar o conteúdo antigo, colar o novo arquivo inteiro

---

## Arquivos que NÃO precisam mudar

- `App.jsx` — já importa e usa `WizardPrimeiroAcesso` com a prop `salaoId`. Continua funcionando.
- `supabaseClient.js` — sem alterações.
- Todos os outros arquivos da pasta `vendedor/` — sem alterações.

---

## SQL necessário no Supabase antes de testar

Rodar no **SQL Editor do Supabase**:

```sql
ALTER TABLE saloes ADD COLUMN IF NOT EXISTS nome_proprietaria text;
ALTER TABLE saloes ADD COLUMN IF NOT EXISTS horario jsonb;
ALTER TABLE procedimentos ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'OUTROS';
```
