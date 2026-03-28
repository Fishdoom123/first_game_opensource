#!/bin/bash
# Дважды щёлкните в Finder, чтобы запустить игру в браузере (нужен Node.js).
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display alert "Нужен Node.js" message "Установите LTS с https://nodejs.org/ затем снова запустите этот файл." buttons {"OK"}' 2>/dev/null
  echo "Установите Node.js: https://nodejs.org/"
  read -r _
  exit 1
fi

echo ""
echo "  Neon Shooter — откроется браузер: http://127.0.0.1:8080"
echo "  Остановка: закройте это окно или Ctrl+C"
echo ""

(sleep 1.2 && open "http://127.0.0.1:8080") &
exec node server.js
