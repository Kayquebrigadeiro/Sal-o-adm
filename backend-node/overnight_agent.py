#!/usr/bin/env python3
"""
Agente autônomo noturno — Salão Secreto
==========================================
Usa a API da Groq para investigar e corrigir problemas no backend,
rodando testes reais a cada mudança e só mantendo o que realmente passa.

SEGURANÇA (não desative isso):
- Só opera contra o ambiente de STAGING (porta 3334, banco SalaosecretoStaging)
- Todas as mudanças vão para uma branch git separada (nunca a main)
- Cada mudança só é mantida se os testes passarem de verdade
- Tudo é logado em um relatório .md para você revisar de manhã

Como rodar:
    cd backend-node
    pip install requests --break-system-packages
    python3 overnight_agent.py

O script cuida de subir o próprio servidor de staging, então não
precisa deixar o `npm run dev` rodando à parte.

CREDENCIAIS:
    As credenciais são lidas do arquivo .env (copie .env.example para .env
    e preencha com seus valores). NUNCA coloque credenciais diretamente aqui.
"""

import os
import sys
import re
import json
import time
import signal
import difflib
import datetime
import subprocess
import urllib.request
import urllib.error

# ==================== CARREGAR .ENV ====================

def _carregar_env(caminho_env=None):
    """Carrega variáveis de ambiente de um arquivo .env no mesmo diretório do script."""
    if caminho_env is None:
        caminho_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(caminho_env):
        print(f"ERRO: Arquivo .env não encontrado em: {caminho_env}")
        print("Copie .env.example para .env e preencha com as credenciais.")
        sys.exit(1)
    with open(caminho_env, "r", encoding="utf-8") as f:
        for linha in f:
            linha = linha.strip()
            if not linha or linha.startswith("#") or "=" not in linha:
                continue
            chave, _, valor = linha.partition("=")
            chave = chave.strip()
            valor = valor.strip().strip("\"'")
            os.environ.setdefault(chave, valor)

_carregar_env()

# ==================== CONFIGURAÇÃO (lida do .env) ====================

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

if not GROQ_API_KEY:
    print("ERRO: GROQ_API_KEY não definida no .env")
    sys.exit(1)

# Limites reais do plano gratuito da Groq (confirmados em jul/2026) — deixe
# uma margem de segurança, não use o limite exato.
MAX_REQUESTS_PER_MINUTE = 20        # limite real: 30
MAX_REQUESTS_PER_DAY = 800          # limite real: 1000
REQUEST_TIMEOUT_SECONDS = 45        # nunca espera mais que isso por resposta
MAX_RETRIES_PER_CALL = 3

# Duração máxima da sessão noturna (evita rodar pra sempre)
MAX_RUNTIME_HOURS = 7
MAX_ITERATIONS = 60                 # trava dura, independente do tempo

# --- Ambiente de STAGING (nunca mude isso pra produção) ---
STAGING_PORT = os.environ.get("STAGING_PORT", "3334")
STAGING_ENV = {
    "DB_HOST": os.environ.get("DB_HOST", ""),
    "DB_PORT": os.environ.get("DB_PORT", "4000"),
    "DB_USER": os.environ.get("DB_USER", ""),
    "DB_PASSWORD": os.environ.get("DB_PASSWORD", ""),
    "DB_NAME": os.environ.get("DB_NAME", "SalaosecretoStaging"),
    "JWT_SECRET": os.environ.get("JWT_SECRET", ""),
    "PORT": STAGING_PORT,
    "ALLOWED_ORIGINS": "http://localhost:5173",
}
BASE_URL = f"http://localhost:{STAGING_PORT}"

# Login de teste usado para os smoke tests (crie esse usuário no staging
# antes de rodar, mesmo processo que já fizemos manualmente).
TEST_VENDEDOR_EMAIL = os.environ.get("TEST_VENDEDOR_EMAIL", "vendedor-staging@teste.com")
TEST_VENDEDOR_SENHA = os.environ.get("TEST_VENDEDOR_SENHA", "Staging123!")

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__)))
BRANCH_NAME = f"overnight-groq-{datetime.date.today().isoformat()}"
LOG_PATH = os.path.join(PROJECT_ROOT, f"overnight_report_{datetime.date.today().isoformat()}.md")

# Arquivos que o agente tem permissão de ler/editar (escopo controlado —
# não deixe ele vasculhar o projeto inteiro sem critério).
WATCHLIST = [
    "src/controllers/atendimentos.controller.js",
    "src/controllers/crud.controller.js",
    "src/controllers/relatorios.controller.js",
    "src/controllers/fechamento.controller.js",
    "src/controllers/salao.controller.js",
    "src/controllers/admin.controller.js",
    "src/controllers/auth.controller.js",
    "src/services/financialEngine.service.js",
    "src/services/fechamentoGuard.service.js",
]

# ==================== ESTADO / RATE LIMIT ====================

_request_timestamps = []
_requests_today = 0


def _throttle():
    """Garante que não passamos dos limites de RPM/RPD da Groq."""
    global _request_timestamps, _requests_today
    now = time.time()
    _request_timestamps = [t for t in _request_timestamps if now - t < 60]

    if _requests_today >= MAX_REQUESTS_PER_DAY:
        raise RuntimeError("Limite diário da Groq atingido. Encerrando com segurança.")

    if len(_request_timestamps) >= MAX_REQUESTS_PER_MINUTE:
        sleep_time = 60 - (now - _request_timestamps[0]) + 1
        log(f"  (aguardando {sleep_time:.0f}s para respeitar limite de requisições/minuto)")
        time.sleep(max(sleep_time, 0))


def call_groq(system_prompt, user_prompt):
    """Chama a API da Groq com timeout, retry e rate limiting."""
    global _request_timestamps, _requests_today

    body = json.dumps({
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
    }).encode("utf-8")

    for attempt in range(1, MAX_RETRIES_PER_CALL + 1):
        _throttle()
        req = urllib.request.Request(
            GROQ_URL,
            data=body,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                _request_timestamps.append(time.time())
                _requests_today += 1
                return data["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 20 * attempt
                log(f"  (429 da Groq, esperando {wait}s antes de tentar de novo — tentativa {attempt})")
                time.sleep(wait)
                continue
            else:
                log(f"  Erro HTTP {e.code} da Groq: {e.read().decode('utf-8', errors='ignore')[:300]}")
                return None
        except (urllib.error.URLError, TimeoutError) as e:
            log(f"  Timeout/erro de rede na chamada à Groq: {e} (tentativa {attempt})")
            time.sleep(5 * attempt)
            continue

    log("  Falhou após todas as tentativas — pulando esta tarefa.")
    return None


# ==================== LOG ====================

def log(msg):
    timestamp = datetime.datetime.now().strftime("%H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def log_report(title, content):
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"\n## {title}\n\n{content}\n")


# ==================== SEGURANÇA: confirmar que é staging ====================

def confirmar_ambiente_seguro():
    if "staging" not in STAGING_ENV["DB_NAME"].lower():
        print("ABORTANDO: DB_NAME não contém 'staging'. Não vou rodar contra produção.")
        sys.exit(1)
    if STAGING_ENV["PORT"] == "3333":
        print("ABORTANDO: porta 3333 é a de produção. Configuração incorreta.")
        sys.exit(1)
    log("Confirmado: ambiente de staging isolado (porta %s, banco %s)" %
        (STAGING_ENV["PORT"], STAGING_ENV["DB_NAME"]))


# ==================== GIT ====================

def git(*args):
    return subprocess.run(["git", *args], cwd=PROJECT_ROOT, capture_output=True, text=True)


def preparar_branch():
    status = git("status", "--porcelain")
    if status.stdout.strip():
        log("AVISO: há mudanças não commitadas no repositório. Faça commit ou stash antes de rodar o agente.")
        sys.exit(1)
    git("checkout", "-b", BRANCH_NAME)
    log(f"Branch criada: {BRANCH_NAME}")


def commit_mudanca(arquivo, descricao):
    git("add", arquivo)
    result = git("commit", "-m", f"[overnight-agent] {descricao}")
    return result.returncode == 0


def reverter_mudanca(arquivo):
    git("checkout", "--", arquivo)


# ==================== SERVIDOR DE STAGING ====================

_server_process = None


def subir_servidor_staging():
    global _server_process
    env = os.environ.copy()
    env.update(STAGING_ENV)
    _server_process = subprocess.Popen(
        ["node", "src/server.js"],
        cwd=PROJECT_ROOT,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    for _ in range(20):
        try:
            urllib.request.urlopen(f"{BASE_URL}/health", timeout=2)
            log("Servidor de staging no ar.")
            return True
        except Exception:
            time.sleep(1)
    log("ERRO: servidor de staging não respondeu a tempo.")
    return False


def derrubar_servidor_staging():
    global _server_process
    if _server_process:
        _server_process.terminate()
        try:
            _server_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            _server_process.kill()


# ==================== SMOKE TESTS (rodados em Python, sem depender do run-full-tests.js) ====================

def http_json(method, path, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(f"{BASE_URL}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8"))
        except Exception:
            return e.code, None
    except Exception as e:
        return None, str(e)


def rodar_smoke_tests():
    """Testes mínimos e essenciais. Retorna (ok: bool, detalhe: str)."""
    status, body = http_json("GET", "/health")
    if status != 200:
        return False, "GET /health falhou"

    status, body = http_json("POST", "/auth/login", {
        "email": TEST_VENDEDOR_EMAIL, "senha": TEST_VENDEDOR_SENHA
    })
    if status != 200 or "token" not in body:
        return False, f"Login falhou: {body}"
    token = body["token"]

    # Confirma que rotas protegidas exigem token
    status, _ = http_json("GET", "/salao", token="token-invalido")
    if status != 401:
        return False, "Rota protegida aceitou token inválido"

    # Confirma que /salao funciona com token válido
    status, body = http_json("GET", "/salao", token=token)
    if status != 200:
        return False, f"GET /salao falhou: {body}"

    return True, "Smoke tests passaram"


# ==================== AGENTE: escolher e aplicar mudanças ====================

SYSTEM_PROMPT = """Você é um engenheiro backend sênior revisando um arquivo de um projeto Node.js/Express/MySQL chamado Salão Secreto (SaaS de gestão de salões de beleza).

Regras estritas:
- Você recebe UM arquivo por vez. Proponha no máximo UMA melhoria pontual (correção de bug, tratamento de erro faltando, validação faltando, ou pequena melhoria de robustez).
- NUNCA reescreva o arquivo inteiro. Responda SOMENTE em formato JSON com esta estrutura exata:
{"encontrou_problema": true/false, "descricao": "descrição curta do problema encontrado", "trecho_antigo": "o trecho EXATO de código a ser substituído (copiado literalmente do arquivo)", "trecho_novo": "o trecho de código que substitui o antigo"}
- Se não encontrar nada relevante para melhorar com segurança, responda {"encontrou_problema": false}.
- NUNCA invente uma mudança arriscada (nunca mude lógica de cálculo financeiro sem ter certeza absoluta, nunca remova validações de segurança existentes).
- "trecho_antigo" deve ser curto (no máximo 15 linhas) e aparecer exatamente uma vez no arquivo, para permitir substituição segura.
"""


def escolher_arquivo_da_vez(iteracao):
    return WATCHLIST[iteracao % len(WATCHLIST)]


def processar_arquivo(caminho_relativo):
    caminho_absoluto = os.path.join(PROJECT_ROOT, caminho_relativo)
    if not os.path.exists(caminho_absoluto):
        log(f"  Arquivo não encontrado: {caminho_relativo}, pulando.")
        return

    with open(caminho_absoluto, "r", encoding="utf-8") as f:
        conteudo_original = f.read()

    user_prompt = f"Arquivo: {caminho_relativo}\n\n```javascript\n{conteudo_original}\n```"
    resposta = call_groq(SYSTEM_PROMPT, user_prompt)
    if not resposta:
        return

    try:
        match = re.search(r"\{.*\}", resposta, re.DOTALL)
        proposta = json.loads(match.group(0)) if match else json.loads(resposta)
    except Exception:
        log(f"  Resposta da Groq não veio em JSON válido, pulando: {resposta[:200]}")
        return

    if not proposta.get("encontrou_problema"):
        log(f"  Nenhum problema encontrado em {caminho_relativo}.")
        return

    trecho_antigo = proposta.get("trecho_antigo", "")
    trecho_novo = proposta.get("trecho_novo", "")
    descricao = proposta.get("descricao", "melhoria sem descrição")

    if not trecho_antigo or conteudo_original.count(trecho_antigo) != 1:
        log(f"  Trecho proposto não é único/encontrável em {caminho_relativo}, pulando com segurança.")
        return

    conteudo_novo = conteudo_original.replace(trecho_antigo, trecho_novo, 1)

    with open(caminho_absoluto, "w", encoding="utf-8") as f:
        f.write(conteudo_novo)

    log(f"  Aplicado: {descricao}")
    diff = "\n".join(difflib.unified_diff(
        conteudo_original.splitlines(), conteudo_novo.splitlines(),
        fromfile="antes", tofile="depois", lineterm=""
    ))

    derrubar_servidor_staging()
    time.sleep(1)
    if not subir_servidor_staging():
        log("  Servidor não subiu após a mudança — revertendo.")
        reverter_mudanca(caminho_relativo)
        return

    ok, detalhe = rodar_smoke_tests()
    if ok:
        commit_mudanca(caminho_relativo, descricao)
        log(f"  Testes passaram, mudança commitada na branch {BRANCH_NAME}.")
        log_report(f"[OK] {caminho_relativo}", f"**{descricao}**\n\n```diff\n{diff}\n```")
    else:
        with open(caminho_absoluto, "w", encoding="utf-8") as f:
            f.write(conteudo_original)
        derrubar_servidor_staging()
        subir_servidor_staging()
        log(f"  Testes falharam ({detalhe}) — mudança revertida.")
        log_report(f"[REVERTIDO] {caminho_relativo}", f"Tentativa: {descricao}\n\nMotivo da reversão: {detalhe}")


# ==================== LOOP PRINCIPAL ====================

def main():
    confirmar_ambiente_seguro()

    with open(LOG_PATH, "w", encoding="utf-8") as f:
        f.write(f"# Relatório do Agente Noturno — {datetime.date.today().isoformat()}\n\n")
        f.write(f"Branch: `{BRANCH_NAME}`\n\n")

    preparar_branch()

    if not subir_servidor_staging():
        log("Não foi possível iniciar o ambiente de staging. Abortando.")
        sys.exit(1)

    ok, detalhe = rodar_smoke_tests()
    if not ok:
        log(f"Smoke tests falharam ANTES de qualquer mudança ({detalhe}). "
            f"Corrija isso manualmente antes de rodar o agente. Abortando.")
        derrubar_servidor_staging()
        sys.exit(1)

    log("Smoke tests iniciais OK. Começando a sessão noturna.")

    inicio = time.time()
    iteracao = 0

    def parar(sig, frame):
        log("Interrompido manualmente (Ctrl+C). Encerrando com segurança.")
        derrubar_servidor_staging()
        sys.exit(0)

    signal.signal(signal.SIGINT, parar)

    while True:
        horas_passadas = (time.time() - inicio) / 3600
        if horas_passadas >= MAX_RUNTIME_HOURS:
            log(f"Tempo máximo de {MAX_RUNTIME_HOURS}h atingido. Encerrando.")
            break
        if iteracao >= MAX_ITERATIONS:
            log(f"Limite de {MAX_ITERATIONS} iterações atingido. Encerrando.")
            break

        arquivo = escolher_arquivo_da_vez(iteracao)
        log(f"--- Iteração {iteracao + 1}/{MAX_ITERATIONS} — analisando {arquivo} ---")
        try:
            processar_arquivo(arquivo)
        except Exception as e:
            log(f"  Erro inesperado processando {arquivo}: {e}")

        iteracao += 1
        time.sleep(3)  # respiro entre iterações

    derrubar_servidor_staging()
    log(f"Sessão encerrada. Relatório completo em: {LOG_PATH}")
    log(f"Para revisar as mudanças: git log {BRANCH_NAME} --oneline")
    log(f"Para aplicar na main depois de revisar: git checkout main && git merge {BRANCH_NAME}")


if __name__ == "__main__":
    main()