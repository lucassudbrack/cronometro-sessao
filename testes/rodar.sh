#!/bin/bash
# Roda o cenário no Chrome headless. O app tem um requestAnimationFrame perpétuo,
# então o Chrome nunca encerra sozinho: despeja o DOM, espera, mata, lê o <pre>.
set -u
SP="$(cd "$(dirname "$0")" && pwd)"
APP="${1:-$SP/../index.html}"
SCEN="${2:-$SP/cenario.js}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

node "$SP/arnes.js" "$APP" "$SCEN" "$SP/harness.html" >/dev/null
rm -rf "$SP/cp" "$SP/dom.html"

"$CHROME" --headless=new --disable-gpu --no-sandbox --no-first-run --disable-extensions \
  --host-resolver-rules="MAP * ~NOTFOUND" --dump-dom \
  --user-data-dir="$SP/cp" "file://$SP/harness.html" >"$SP/dom.html" 2>/dev/null &
PID=$!
for _ in $(seq 1 40); do
  sleep 0.5
  grep -q 'id="OUT"' "$SP/dom.html" 2>/dev/null && break
done
kill -9 $PID 2>/dev/null; wait $PID 2>/dev/null

node -e '
const fs=require("fs"), f=process.argv[1]+"/dom.html";
const s=fs.existsSync(f)?fs.readFileSync(f,"utf8"):"";
const m=s.match(/<pre id="OUT"[^>]*>([\s\S]*?)<\/pre>/);
if(!m){ console.log("(o app nao chegou a rodar — nenhuma saida)"); process.exit(1); }
const txt=m[1].replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,"\"").replace(/&#39;/g,"'"'"'").replace(/&amp;/g,"&");
console.log(txt);
process.exit(/FALHA|ERRO|EXCECAO/.test(txt) ? 1 : 0);
' "$SP"
