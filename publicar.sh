#!/bin/bash
# Cria o repositório (se ainda não existir), empurra o main e liga o GitHub Pages.
# Idempotente: pode rodar de novo a cada publicação.
#
#   gh auth login          # uma vez, na conta lucassudbrack
#   ./publicar.sh
set -euo pipefail

DONO="lucassudbrack"
REPO="cronometro-sessao"
VIS="public"        # Pages em conta gratuita exige repo público

cd "$(dirname "$0")"

command -v gh >/dev/null || { echo "erro: gh não instalado"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "erro: rode 'gh auth login' primeiro"; exit 1; }

CONTA=$(gh api user --jq .login)
[ "$CONTA" = "$DONO" ] || {
  echo "erro: autenticado como '$CONTA', esperado '$DONO'."
  echo "      use 'gh auth switch' ou 'gh auth login' na conta certa."
  exit 1; }

# O sw.js serve tudo do cache: sem bump em CACHE o aparelho não vê a versão nova.
CACHE=$(grep -oE 'const CACHE = "[^"]+"' sw.js | cut -d'"' -f2)
echo "cache atual do service worker: $CACHE"

# APP_VER é o que sai em gerado_por, dentro de todo CSV exportado. Se ele
# divergir do CACHE, os arquivos passam a mentir sobre que versão os produziu —
# e essa ambiguidade já custou uma auditoria inteira do lado que consome.
# Aqui é erro, não aviso: publicar com os dois em desacordo é publicar um
# rótulo errado, e o rótulo viaja dentro do dado.
APP_VER=$(grep -oE 'APP_VER="[^"]+"' index.html | cut -d'"' -f2)
if [ "$APP_VER" != "${CACHE#sessao-}" ]; then
  echo "erro: APP_VER=$APP_VER em index.html e CACHE=$CACHE em sw.js divergem."
  echo "      os dois têm que andar juntos — acerte APP_VER para ${CACHE#sessao-}."
  exit 1
fi
if git rev-parse HEAD~1 >/dev/null 2>&1 &&
   git diff --quiet HEAD~1 HEAD -- sw.js &&
   ! git diff --quiet HEAD~1 HEAD -- index.html; then
  echo "AVISO: index.html mudou no último commit mas CACHE continua $CACHE."
  echo "       O aparelho vai continuar servindo a versão velha do cache."
  read -rp "       Publicar assim mesmo? [s/N] " r; [ "$r" = "s" ] || exit 1
fi

if gh repo view "$DONO/$REPO" >/dev/null 2>&1; then
  echo "repo já existe: $DONO/$REPO"
else
  echo "criando $DONO/$REPO ($VIS)…"
  gh repo create "$DONO/$REPO" --"$VIS" \
    --description "Cronômetro por questão e folha de respostas para sets de prova" \
    --disable-wiki
fi

git remote get-url origin >/dev/null 2>&1 \
  && git remote set-url origin "git@github.com:$DONO/$REPO.git" \
  || git remote add origin "git@github.com:$DONO/$REPO.git"

# APP_COMMIT nomeia o commit do CONTEÚDO que está sendo publicado. O commit do
# próprio stamp não pode estar dentro do arquivo que ele altera, e é a única
# coisa que ele altera — então quem for resolver a string usa `git show <sha>`
# e vê a árvore publicada. O gate de APP_VER acima já rodou, e a checagem de
# CACHE também, de propósito: nenhum dos dois deve reagir a este commit.
SHA=$(git rev-parse --short HEAD)
if [ "$(grep -oE 'APP_COMMIT="[^"]+"' index.html | cut -d'"' -f2)" != "$SHA" ]; then
  perl -pi -e "s/APP_COMMIT=\"[^\"]+\"/APP_COMMIT=\"$SHA\"/" index.html
  git add index.html
  git commit -q -m "gerado_por estampa $SHA" -m \
    "Só a constante APP_COMMIT. Feito por publicar.sh para que todo CSV exportado nomeie o commit do código que o produziu."
  echo "gerado_por estampado: app sessao $APP_VER $SHA"
fi

git push -u origin main

echo "ligando o GitHub Pages…"
if gh api "repos/$DONO/$REPO/pages" >/dev/null 2>&1; then
  gh api -X PUT "repos/$DONO/$REPO/pages" -f "source[branch]=main" -f "source[path]=/" >/dev/null
  echo "Pages já estava ligado, fonte reconfirmada."
elif gh api -X POST "repos/$DONO/$REPO/pages" \
       -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1; then
  echo "Pages ligado."
else
  cat <<'FIM'

Pages recusou. Em conta gratuita o GitHub Pages só publica de repositório
público — de repositório privado exige Pro ou Team.

Duas saídas:
  1) tornar público (não há dado seu no código, tudo fica no aparelho):
       gh repo edit lucassudbrack/cronometro-sessao --visibility public --accept-visibility-change-consequences
       ./publicar.sh
  2) manter privado e servir de outro lugar, ou instalar direto do arquivo.
FIM
  exit 1
fi

echo
echo "publicado: https://$DONO.github.io/$REPO/"
echo "o primeiro build leva ~1 min. Abra no tablet e instale como app."
