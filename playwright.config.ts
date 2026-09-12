import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';

/**
 * Ambiente Linux sem sudo: as deps de sistema do WebKit (libicu74, libxml2,
 * libjpeg-turbo8) são extraídas de pacotes .deb para ~/.pw-deps pelo script
 * `scripts/setup-pw-deps.sh`, que também as copia para a pasta `sys/lib` do
 * navegador (`~/.cache/ms-playwright` → diretório do webkit →
 * `minibrowser-wpe/sys/lib`). O wrapper do WebKit sobrescreve o
 * LD_LIBRARY_PATH herdado, por isso a cópia é necessária.
 * O validador do Playwright só reconhece pacotes via apt, então pulamos a checagem.
 */
const pwDepsLib = `${process.env.HOME}/.pw-deps/root/usr/lib/x86_64-linux-gnu`;
if (fs.existsSync(pwDepsLib)) {
  process.env.LD_LIBRARY_PATH = process.env.LD_LIBRARY_PATH
    ? `${pwDepsLib}:${process.env.LD_LIBRARY_PATH}`
    : pwDepsLib;
  process.env.PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = '1';
}

/**
 * Configuração E2E do Playwright.
 * Regras do time: .clinerules/playwright.md
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Specs ficam em tests/ como *.spec.ts (ver .clinerules/playwright.md)
  testDir: './tests',
  testMatch: '**/*.spec.ts',

  /* Roda testes em paralelo */
  fullyParallel: true,

  /* Falha no CI se deixar test.only esquecido */
  forbidOnly: !!process.env.CI,

  /* Retry apenas no CI */
  retries: process.env.CI ? 2 : 0,

  /* Sem paralelismo no CI */
  workers: process.env.CI ? 1 : undefined,

  reporter: 'html',

  use: {
    /* Base URL usada em ações como `await page.goto('/')` */
    baseURL: 'http://localhost:5173',

    /* Coleta trace ao repetir teste que falhou */
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  /* Sobe o dev server do Vite antes dos testes */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
