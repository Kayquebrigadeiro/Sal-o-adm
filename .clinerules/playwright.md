# Regras Playwright E2E

Regras obrigatórias para testes end-to-end neste projeto (`@playwright/test`).

## Locators

- Prefira locators semânticos e voltados ao usuário:
  - `getByRole('button', { name: 'Entrar' })`
  - `getByLabel('E-mail')`
  - `getByTestId('botao-salvar')` (requer `data-testid` no componente)
- Também são aceitos: `getByPlaceholder`, `getByText`, `getByTitle`.
- **Evite** seletores por CSS (`page.locator('.classe')`, `#id`) e XPath (`page.locator('xpath=...')`).
- Nunca use `page.$()`, `page.$$()`, `page.evaluate` para localizar elementos de UI.

## Assertions (web-first)

- Use sempre as assertions automáticas do Playwright:
  - `toBeVisible`, `toBeHidden`
  - `toHaveText`, `toContainText`
  - `toBeEnabled`, `toBeDisabled`
  - `toHaveValue`, `toHaveURL`, `toHaveTitle`
- **Nunca** espere manualmente com `page.waitForTimeout()`.
  - O retry automático das assertions já lida com tempos de resposta.
  - Para aguardar rede: `await expect(response).toBeOK()` ou `page.waitForResponse()`.

## Estrutura

- Specs ficam em `tests/` com sufixo `.spec.ts`.
  - Ex.: `tests/login.spec.ts`
- Fixtures/helpers de apoio ficam em `tests/fixtures/` ou `tests/support/`.

## Organização dos testes

- Use `test.describe` para agrupar cenários relacionados:
  - `test.describe('Login', () => { ... })`
- Cada `test()` deve ter nome descritivo em português, declarando comportamento esperado:
  - ✅ `test('exibe mensagem de erro com credenciais inválidas', ...)`
  - ❌ `test('teste 1', ...)`

## Execução

- `npx playwright test` — roda todos os testes
- `npx playwright test tests/login.spec.ts` — roda um arquivo
- `npx playwright test --headed` — roda com navegador visível
- `npx playwright test --ui` — modo UI de depuração

## Boas práticas

- Um teste, um comportamento. Nada de fluxos gigantes em um único `test()`.
- Configure estado via `localStorage`/fixtures quando possível, evitando repetir o login em todo teste.
- Não dependa de dados de produção; use dados de teste claramente marcados.
