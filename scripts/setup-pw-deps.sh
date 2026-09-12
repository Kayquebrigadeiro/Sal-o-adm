#!/usr/bin/env bash
# Instala as dependências de sistema do Playwright (WebKit) sem sudo.
# Uso: bash scripts/setup-pw-deps.sh
set -e

DEBS_DIR="$HOME/.pw-deps/debs"
ROOT_DIR="$HOME/.pw-deps/root"
LIB_DIR="$ROOT_DIR/usr/lib/x86_64-linux-gnu"

# Libs esperadas pelo WebKit do Playwright (checar `npx playwright install-deps`)
DEBS=(
  "http://archive.ubuntu.com/ubuntu/pool/main/i/icu/libicu74_74.2-1ubuntu3_amd64.deb"
  "http://archive.ubuntu.com/ubuntu/pool/main/libx/libxml2/libxml2_2.9.14+dfsg-1.3ubuntu3_amd64.deb"
  "http://archive.ubuntu.com/ubuntu/pool/main/libj/libjpeg-turbo/libjpeg-turbo8_2.1.5-2ubuntu2_amd64.deb"
)

mkdir -p "$DEBS_DIR" "$ROOT_DIR"
for url in "${DEBS[@]}"; do
  name="$(basename "$url")"
  if [ ! -f "$DEBS_DIR/$name" ]; then
    echo "Baixando $name..."
    wget -q --show-progress -O "$DEBS_DIR/$name" "$url"
  fi
  dpkg -x "$DEBS_DIR/$name" "$ROOT_DIR"
done

# O wrapper do WebKit (pw_run.sh -> minibrowser-wpe/MiniBrowser) sobrescreve o
# LD_LIBRARY_PATH herdado com MYDIR/lib:MYDIR/sys/lib — por isso copiamos as
# libs para sys/lib de cada versão instalada do WebKit.
for wk_dir in "$HOME"/.cache/ms-playwright/webkit-*; do
  [ -d "$wk_dir/minibrowser-wpe" ] || continue
  mkdir -p "$wk_dir/minibrowser-wpe/sys/lib"
  cp -n "$LIB_DIR"/*.so* "$wk_dir/minibrowser-wpe/sys/lib/"
  echo "Libs copiadas para $wk_dir/minibrowser-wpe/sys/lib"
done

echo "OK. LD_LIBRARY_PATH deve apontar para $LIB_DIR (o playwright.config.ts já faz isso)."
