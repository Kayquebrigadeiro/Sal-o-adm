#!/usr/bin/env bash
# ============================================================
# SUITE COMPLETA DE REGRESSÃO — Sal-o-adm (backend Node/TiDB)
# Roda tudo que existe para validar o sistema de ponta a ponta.
# Uso:   bash scripts/rodar_suite.sh
# Saída: resumo com X/Y por etapa. Exit 0 = tudo verde.
# ============================================================
set -uo pipefail
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BACKEND_DIR"

RESULTADOS=()
run() {
  local nome="$1"; shift
  echo ""
  echo "━━━ $nome ━━━"
  if "$@"; then
    RESULTADOS+=("✅ $nome")
  else
    RESULTADOS+=("❌ $nome")
  fi
}

# 1. Testes unitários da financial engine (não precisa de servidor)
run "1. Engine financeira (unitários)" node tests/test-financial-engine.js

# 2. Bateria funcional completa (sobe o próprio servidor na porta 3333)
run "2. Bateria funcional completa (57 testes)" bash tests/run-full-tests.sh

# 3. Testes que dependem do servidor de STAGING na porta 3334
if curl -s -o /dev/null http://localhost:3334/health; then
  run "3. Correções pós-validação (fechamento/adicionais/tipo/fallback)" node scripts/testar_correcoes.js
  run "4. Teste de carga em degraus 5→50 (staging)" node scripts/testar_carga_degraus.js
else
  RESULTADOS+=("⚠️ 3/4 pulados: servidor de staging (3334) não está no ar")
  echo ""
  echo "⚠️  Servidor de staging (3334) não está no ar — suba com:"
  echo "    cd backend-node && PORT=3334 node src/server.js"
  echo "   e re-execute para incluir os testes 3 e 4."
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "  RESUMO DA SUITE"
echo "═══════════════════════════════════════════════════"
for r in "${RESULTADOS[@]}"; do echo "  $r"; done
# falha se algo marcado ❌
if printf '%s\n' "${RESULTADOS[@]}" | grep -q '❌'; then exit 1; fi
exit 0
