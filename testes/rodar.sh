#!/bin/bash
# Roda o cenário no Chrome headless. O app tem um requestAnimationFrame perpétuo,
# então o Chrome nunca encerra sozinho: despeja o DOM, espera, mata, lê o <pre>.
set -u
SP="$(cd "$(dirname "$0")" && pwd)"
APP="${1:-$SP/../index.html}"
SCEN="${2:-$SP/cenario.js}"
# O Chrome se resolve por: $CHROME (CI e ambientes não-mac) → caminho do macOS →
# binários comuns de Linux. Sem nenhum, falha dizendo o quê exportar.
if [ -z "${CHROME:-}" ]; then
  for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
           google-chrome google-chrome-stable chromium chromium-browser; do
    if [ -x "$c" ] || command -v "$c" >/dev/null 2>&1; then CHROME="$c"; break; fi
  done
fi
if [ -z "${CHROME:-}" ]; then
  echo "rodar.sh: Chrome não encontrado — exporte CHROME=/caminho/do/chrome" >&2
  exit 1
fi

node "$SP/arnes.js" "$APP" "$SCEN" "$SP/harness.html" >/dev/null
rm -rf "$SP/cp" "$SP/dom.html"

# --disable-dev-shm-usage: em runner de CI o /dev/shm é pequeno e o Chrome
# morre no arranque sem dizer nada. O stderr vai para arquivo: sem ele, uma
# falha de arranque vira "nenhuma saida" e ninguém sabe o porquê.
"$CHROME" --headless=new --disable-gpu --no-sandbox --no-first-run --disable-extensions \
  --disable-dev-shm-usage --host-resolver-rules="MAP * ~NOTFOUND" --dump-dom \
  --user-data-dir="$SP/cp" "file://$SP/harness.html" >"$SP/dom.html" 2>"$SP/chrome.err" &
PID=$!
for _ in $(seq 1 90); do
  sleep 0.5
  grep -q 'id="OUT"' "$SP/dom.html" 2>/dev/null && break
  kill -0 $PID 2>/dev/null || break   # Chrome morreu: parar de esperar
done
kill -9 $PID 2>/dev/null; wait $PID 2>/dev/null

node -e '
const fs=require("fs"), f=process.argv[1]+"/dom.html";
const s=fs.existsSync(f)?fs.readFileSync(f,"utf8"):"";
const m=s.match(/<pre id="OUT"[^>]*>([\s\S]*?)<\/pre>/);
if(!m){
  console.log("(o app nao chegou a rodar — nenhuma saida)");
  const err=process.argv[1]+"/chrome.err";
  if(fs.existsSync(err)) console.log("stderr do Chrome:\n"+fs.readFileSync(err,"utf8").split("\n").slice(-25).join("\n"));
  process.exit(1);
}
const txt=m[1].replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,"\"").replace(/&#39;/g,"'"'"'").replace(/&amp;/g,"&");
console.log(txt);
process.exit(/FALHA|ERRO|EXCECAO/.test(txt) ? 1 : 0);
' "$SP"
