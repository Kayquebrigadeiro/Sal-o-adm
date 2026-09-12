import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('renderiza a tela de login com formulário completo', async ({ page }) => {
    await page.goto('/');

    // Título da página definido em index.html
    await expect(page).toHaveTitle('Agenda do Sistema');

    // Cabeçalho da tela de login
    await expect(page.getByRole('heading', { name: /Salão Secreto/i })).toBeVisible();

    // Campos do formulário
    await expect(page.getByPlaceholder('USUARIO_ADMIN')).toBeVisible();
    await expect(page.getByPlaceholder('********')).toBeVisible();

    // Botão de submit visível e habilitado
    const botaoEntrar = page.getByRole('button', { name: /ENTRAR NO SISTEMA/i });
    await expect(botaoEntrar).toBeVisible();
    await expect(botaoEntrar).toBeEnabled();
  });

  test('valida campos obrigatórios antes de enviar o formulário', async ({ page }) => {
    await page.goto('/');

    // HTML5 required impede o submit com campos vazios
    await page.getByRole('button', { name: /ENTRAR NO SISTEMA/i }).click();

    await expect(page.getByPlaceholder('USUARIO_ADMIN')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('alternar visibilidade da senha atualiza o campo', async ({ page }) => {
    await page.goto('/');

    const campoSenha = page.getByPlaceholder('********');
    await expect(campoSenha).toBeVisible();
    await expect(campoSenha).toBeEnabled();

    // Botão de mostrar/ocultar senha identificado por nome acessível
    const botaoMostrar = page.getByRole('button', { name: 'Mostrar senha' });
    await botaoMostrar.click();

    // Após o clique, o estado alterna e o campo continua utilizável
    await expect(page.getByRole('button', { name: 'Ocultar senha' })).toBeVisible();
    await expect(campoSenha).toBeEnabled();
  });
});
