<!-- GENERATED: espelha .claude/rules/app.md para o Codex, que não tem regra por glob.
     Edite a regra, não este arquivo; ./skillrepo build regenera. -->

# Editando o app

- `app/` é um **subtree** de `lucassudbrack/cronometro-sessao`. Fluxo nas duas direções:
  - trazer do upstream: `git subtree pull --prefix app git@github.com:lucassudbrack/cronometro-sessao.git main --squash`
  - mandar para o upstream: `git subtree push --prefix app git@github.com:lucassudbrack/cronometro-sessao.git main`
- **O deploy (GitHub Pages) sai do upstream, não daqui:** mudança feita neste repo só chega ao
  tablet depois do `subtree push` + `./publicar.sh` no clone do cronometro-sessao — e o publicar
  exige o bump de `CACHE` em `sw.js`, em lockstep com `APP_VER`.
- Testes do app: `./app/testes/rodar.sh` (Chrome resolvido por `$CHROME` ou autodetectado); a CI
  roda a suíte no job `app`.
- O export do app é o **contrato de entrada** da `corrigir-sessao-prova`. Mexeu no que é emitido?
  `docs/app-export-contract.md` e as fixtures em `tests/fixtures/` entram no mesmo PR, senão o teste
  de contrato quebra — que é o comportamento desejado.
