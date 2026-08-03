# Continuação — app de cronômetro + folha de respostas

Cole isto no começo da sessão nova. É o estado completo do projeto: o que o app
é, as regras que não podem quebrar, como trabalhar nele, e as decisões já
tomadas com o porquê de cada uma — para você não relitigar nem desfazer sem
saber.

---

## 1. O que é e onde está

App web de **arquivo único** para registrar sets de prova cronometrados. Uso
real: estudo para o Exame ANPEC e para o concurso do BACEN, com o PDF da prova
aberto no tablet (Xiaomi Pad 7) e o app numa **janela flutuante** no canto — daí
a interface ter que funcionar em ~360 px de largura e sobreviver a perder o foco.

- **Pasta:** `/Users/lucassudbrackbraga/Library/CloudStorage/GoogleDrive-lucassudbrackb@gmail.com/Meu Drive/Concursos/05_apps/timer`
- **Repo:** https://github.com/lucassudbrack/cronometro-sessao — público, branch `main`
- **App:** https://lucassudbrack.github.io/cronometro-sessao/
- **Conta GitHub:** `lucassudbrack` (sem "b" no fim; `lucassudbrackb` é o e-mail e não existe no GitHub)
- **Estado atual:** 30 commits, `CACHE = sessao-v18`, working tree limpo, 433 asserções passando

### Arquivos

| arquivo | o que é |
|---|---|
| `index.html` | **o app inteiro** — 2308 linhas, 119 KB. Uma tag `<script>` (1844 linhas), um `<style>` (254), markup (210). Zero `src` externo, zero CDN, zero bundler. |
| `sw.js` | service worker (contexto próprio, não pode morar no HTML) |
| `manifest.webmanifest` | PWA |
| `fontes/*.woff2` | 4 binários, 112 KB. As `@font-face` estão embutidas no `<style>` |
| `icon-192/512/maskable-512.png` | ícones, gerados de um SVG via Chrome headless |
| `testes/arnes.js`, `testes/cenario.js`, `testes/rodar.sh` | a suíte |
| `publicar.sh` | cria repo se não existir, empurra, liga o Pages |
| `README.md` | doc do modelo de dados, regras e índices |
| `analise/` | **gitignored** — CSVs de sessão real e análises. Resultado de estudo, não código |

### Seções do `<script>` (linhas aproximadas)

```
  16  várias sessões        564  persistencia        1225  export
 124  cronometro            665  gabarito            1231  estatísticas
 184  panes                 850  conferencia         1494  log de eventos em CSV
 199  grade                 956  folha de fechamento 1582  lista de sessões
 255  pagina do caderno    1052  dicionário          1632  eventos de UI
 352  painel de resposta                             1819  PWA
 524  trilha
```

Cada bloco tem um comentário `/* ---------- nome ---------- */`.

---

## 2. Requisitos eliminatórios

- **Offline total.** Zero chamada de rede durante a sessão. Fontes servidas do
  próprio pacote (foi por isso que saíram do Google Fonts).
- **Persiste a cada evento**, não no fim e não só em memória. `ev()` grava na
  hora; mais heartbeat de 5 s enquanto o cronômetro corre; mais
  `visibilitychange` e `pagehide`.
- **Recupera de crash** sem perder a passada aberta.
- **Sem backend.** GitHub Pages basta.
- **Não pausa ao perder o foco** — o normal é o usuário estar no leitor de PDF.
- **Um bug custa uma sessão inteira de estudo.** Prefira incremento
  conservador a reescrita elegante. **Pergunte antes de refactor grande.**

---

## 3. Regras de domínio que não podem quebrar

1. **Tempo nunca é inventado.** Dado ausente sai **vazio**, nunca estimado nem
   dividido igualmente. Zero é uma afirmação ("levou zero segundo"); vazio é
   ausência. Passada interrompida por crash volta marcada `trunc` e vale como
   **piso**, não medida.
2. **Só existem dois brancos legítimos:** `N` (branco com flag B — enfrentei e
   não tenho nem direção) e `T` (não alcancei por tempo). Item sem resposta e
   sem flag **não é estado da prova** — é lacuna de preenchimento, conta em
   `itens_nao_preenchidos`, e a conferência cobra como falta.
3. **O botão `×` é borracha, não estado.** Limpa resposta, confiança e flags.
   Antes era `—` e declarava branco; mudou porque "tracinho preenchido" era
   ambíguo entre N e T.
4. **`T` bloqueia a marcação** do item e o torna branco. T não é jeito de
   responder — é a declaração de que você não chegou lá. Sem o bloqueio, T e
   resposta coexistiriam e os estados deixariam de ser mutuamente exclusivos.
5. **Item marcado B rende 0 e tira 0, mas continua no denominador.** Ele estava
   em jogo e você não o levou. É isso que normaliza o índice contra a prova.
6. **Revisita é dado de primeira classe.** Tempo fragmentado ≠ contínuo.
7. **Corrigir depois não é nova passada.** A conferência chama `openQ()` direto,
   sem passar por `select()`, então o cronômetro não liga e `passes` não muda. A
   correção sai carimbada `rev:true`.
8. **O tipo da questão se descobre ao ler**, não no setup. Vale também para o
   formato quando o eixo ficou "na hora": sem declaração a folha não abre.
   **Exceção:** prova de um tipo só atribui automático (`auto:true` no log) —
   não há o que descobrir. Mas **nunca depois do tempo travar**.
9. **Anulada tira o item da prova.** Sai do numerador **e** do denominador.
10. **Item sem gabarito fica fora de tudo.** A conferência cobra como falta
    assim que o gabarito é aberto — porque uma vez isso levou 4 de 5 itens `T`
    embora e o índice de pacing mentiu.
11. **"Olhar depois" se marca antes do gabarito.** `gabAberto` grava o instante;
    o que vier depois sai carimbado `pos_gabarito`.
12. **O app registra a declaração, não a causa.** Não existe índice batizando
    causa de branco. A causa se lê no caderno, na página que `pag` aponta.
13. **O app não arbitra regra de pontuação** — aplica os pesos declarados no
    setup.

---

## 4. Modelo de dados

```js
ans[q] = { tipo:"A"|"ME"|"B", itens:[{r,c,B,T}], alt:5, dig:3, num:"042" }
pags[q]     = "7-8"                    // só o que foi DIGITADO
apelidos[q] = "ANPEC14 Q5"             // só o explícito
gab[q]      = { itens:["V","F","X"], num:"042" }   // X = anulada
olhar[q]    = true
```

| campo | significado |
|---|---|
| `r` | `V`/`F` (A) · `A`–`J` (ME) · dígitos (B) · `null` = sem resposta |
| `c` | `c` certeza ~90% · `?` dúvida ~60-75% · `x` chute ~50/50 |
| `B` | com resposta: "eu omitiria na prova real". Sem resposta: **é o estado N** |
| `T` | não alcancei por tempo. Força `r=null` e trava o item |

**Defaults em cascata:** `apelido → pag → ordem`. A página é **cumulativa** — se
a Q3 ocupa `1-2`, a Q4 nasce na `3`. Digitar uma página **re-ancora** as
seguintes. `pags` guarda só o digitado; o default nunca é materializado.

**Três eixos de formato**, cada um fixo no setup ou "na hora" (valor `0`):
`cfgA` (itens de C/E, 1–10), `cfgME` (alternativas, 2–10), `cfgB` (dígitos, 2–3).

**`usa = {A,ME,B}`** — quais tipos a prova tem. O desligado some do setup e do
seletor. Não dá para desligar o último.

**`pesos[tipo] = {acerto, erro}`** em múltiplos de X. Modelos: ANPEC (C/E 5 itens
+1/−1, conta 2 dígitos +5/0, sem ME) e BACEN (só C/E, +1/−0,5, **1 item por
questão — padrão Cebraspe, o usuário ia conferir no edital e nunca mandou**).

**Snapshot `fmt: 5`.** `retomar()` migra formatos antigos, inclusive `r === "-"`
(que até o fmt 5 era branco declarado) para `N`. **Não quebre essa migração** —
sem ela a nota de sessão guardada muda sozinha.

---

## 5. Os estados e a identidade

Todo item válido cai em **exatamente um**:

| estado | significado |
|---|---|
| `C_m` | marquei e acertei (sem B) |
| `E_m` | marquei e errei (sem B) |
| `C_B` | declarei que deixaria em branco, palpite acertou |
| `E_B` | declarei que deixaria em branco, palpite errou |
| `N` | branco com B |
| `T` | não alcancei por tempo |
| `nao_preenchido` | sem resposta e sem flag — lacuna, não estado da prova |

    C_m + E_m + C_B + E_B + N + T + itens_nao_preenchidos = I

`I` = itens com gabarito e não anulados. `itens_no_set = I + anulados +
sem_gabarito`. `identidade_fecha` é a auditoria: se der 0, há item sem destino.

**Índices** (todos derivados, nenhum guardado): `real` (master, = pontos ÷
pontos_em_jogo, versão ponderada de `(C_m−E_m)/I` que reduz exatamente a ela com
pesos +1/−1), `acerto_do_enfrentado`, `branco_por_disciplina`, `valor_do_branco`
e `valor_do_branco_pontos`, `acerto_certeza/duvida/chute/B_palpite` **cada um com
seu `n_` ao lado** (0 com n=1 não é 0 com n=50), `bruto_ponderado`,
`real_ignorando_B`, `min_por_questao`, `pct_passadas_truncadas`.

---

## 6. Export — quatro CSVs

| arquivo | grão |
|---|---|
| `<nome>.csv` | bloco `#` com 90 chaves + uma linha por questão (14 colunas) |
| `<nome>_estatisticas.csv` | formato longo: tipo × confiança × flags × resultado × estado (8 colunas) |
| `<nome>_eventos.csv` | um evento por linha (19 colunas fixas + `extra` como `chave=valor`) |
| `<nome>_dicionario.csv` | descreve campo por campo os outros três (154 linhas) |

**Nome canônico:** `aaaammdd_concurso_materia_subtopico_tiposessao_fonte`,
minúsculo, sem acento, underline. Serve de nome de arquivo **e** de apelido na
lista de sessões.

### O invariante mais importante do código

`DIC` (linha ~1052) é a **fonte única** do conjunto e da ordem das chaves do
bloco `#`. `buildCSV()` calcula valores num mapa `V`, expõe `_metaCalc`, e emite
guiado pelo `DIC`. `buildDic()` lê o mesmo `DIC`. **Três asserções fecham a
bijeção nos dois sentidos.** Se você acrescentar um campo ao export e esquecer a
descrição — ou o contrário — a suíte reprova. Verificado quebrando de propósito.

Corolário: as seis chaves de `peso_*` saem **sempre**, vazias quando a prova não
tem o tipo. O conjunto de colunas não pode variar de sessão para sessão.

Documentação por campo mora **só** no dicionário. Os outros três guardam
`gerado_por`, `sessao`, `exportado_em`, `grao`, e apontam via `# dicionario_em`.

---

## 7. Como trabalhar

### Testes

```bash
./testes/rodar.sh          # 433 asserções, ~25 s
```

Roda o **app inteiro** em Chrome headless com `performance.now()` sob controle,
para passar horas de sessão em milissegundos. `arnes.js` monta um harness =
`index.html` + o cenário anexado, e dirige a interface pelos mesmos handlers que
o dedo aciona. Precisa de Chrome e Node; não instala nada.

16 cenários: revisita/crash, string de itens, conferência, eixos, gabarito,
aprendizado, apelidos, várias sessões, calibragem, modelos/pesos, os estados e a
identidade, gabarito faltando, tempo de prova, re-toque no tipo, os cinco
ajustes do export, e a bijeção do dicionário.

**Limitações do arnês** (não tente contornar, são reais):
- `Date.now()` é real, só `performance.now()` é falso. Então
  `tempo_em_pausa_seg` não é testável — só `n_pausas`.
- `setTimeout` não dispara antes do dump, então `doExport()` só empilha o
  **primeiro** arquivo em `window.__files`.
- `window.__files` **acumula** entre cenários. Use o último, não o primeiro.
- `window.__confirmYes` controla o `confirm()`. O headless descartaria diálogos
  e responderia "não" a tudo.
- Cenários que mexem em `localStorage` precisam **drenar microtasks**
  (`for(i<30) await Promise.resolve()`) antes de limpar, senão gravações
  pendentes dos cenários anteriores ressuscitam o índice.
- O Chrome **não sai sozinho** (há um `requestAnimationFrame` perpétuo). O
  `rodar.sh` despeja o DOM, espera, mata e lê o `<pre id="OUT">`.

### Deploy

```bash
# 1. SEMPRE incremente CACHE em sw.js — senão o tablet serve a versão velha
./publicar.sh
```

O `publicar.sh` avisa se o `index.html` mudou sem bump. Depois, confirme:

```bash
curl -s https://lucassudbrack.github.io/cronometro-sessao/sw.js | grep -o 'sessao-v[0-9]*'
```

O Pages leva 2–4 tentativas de ~15 s para propagar.

### Verificação visual

Screenshot a **360 px** de largura, dentro de um iframe (o Chrome ignora
`--window-size` abaixo de ~500):

```bash
# monta harness com um cenário que leva o app ao estado desejado,
# embute num iframe de 360px, e tira --screenshot
```
Já achei problemas reais assim: a lista de "não visitadas" afogando as faltas, e
a lista de sessões ficando abaixo da dobra.

### Padrão de trabalho que o usuário espera

- **Auditar antes de afirmar.** Quando ele manda um CSV, recompute todos os
  índices a partir das linhas por questão e compare. Melhor ainda: **replique o
  log de eventos** e verifique se reproduz o estado final — isso já pegou coisa
  que nenhuma outra checagem pegaria.
- **Um commit por item**, mensagem explicando o **porquê**, não o o quê.
- Quando um teste falha, **cheque se a expectativa está errada** antes de mexer
  no app. Já aconteceu várias vezes.
- Diga o que ficou de fora e por quê. Não maquie.

---

## 8. Armadilhas já pagas — não repita

1. **`el.innerHTML += ...` mata todo `onclick` atribuído por JS.** Reconstrói a
   subárvore inteira. Use `appendChild`. Isso deixou os botões do gabarito
   desenhados e mortos, e só quando havia questão sem tipo.
2. **Escapar `\n` em patch por `node -e` com template literal.** O `\n` colapsa
   em quebra de linha real dentro de string e o arquivo fica com erro de
   sintaxe. Sintoma: relatório de teste **vazio**, sem pista. Use
   `String.fromCharCode(10)` ou heredoc `<<'EOF'`.
3. **Confirmação que só dispara quando o valor difere.** Tocar o tipo já
   selecionado caía direto no `blankAns` e apagava a questão. Guarde o caso
   "igual ao atual" antes.
4. **`sid` pode trocar durante um `await`.** `saveNow()` captura `const id=sid`
   no início. E "Nova" desanexa (`sid=null`) **de forma síncrona**, senão
   digitar a identificação da sessão nova renomeia a anterior.
5. **`addAll` do service worker é atômico.** Um 404 abortava a instalação
   inteira, silenciosamente, por causa de ícones inexistentes. Hoje é asset por
   asset, e falha acende "sem offline" no rodapé.
6. **`[].every()` é `true`.** Tipo A sem itens escolhidos apareceria como
   respondida.
7. **Pendência precisa declarar o destino.** As de gabarito abrem a folha do
   gabarito (rolada até a questão, acesa por um instante), não o painel da
   questão.
8. **Memo de `pagsEfetivas`** é derrubado no início de `paint()` e de cada
   builder — vive dentro de um desenho e nunca sobrevive a uma mudança.

---

## 9. Backlog aberto

**Confirmar com o usuário:**
- **Nº de itens por questão do BACEN.** Está em 1 (padrão Cebraspe), com aviso
  na tela do modelo. Ele ia mandar o edital e não mandou.

**Pendente do brief original (prioridade média):**
- Nota curta por questão.
- Importar um `_eventos.csv` para retomar sessão em outro aparelho.
- Confirmar o formato real do tipo B da ANPEC (hoje 2 ou 3 dígitos).

**Questionamentos que o usuário levantou e ainda não resolveu:**
- `branco_por_disciplina` e `acerto_do_enfrentado` — as quantidades são limpas,
  mas os nomes carregam julgamento ("disciplina", "onde meu modelo falha"). Ele
  pode querer renomear.
- `min_por_questao` mistura questão de 5 itens com questão de 1. Um
  `min_por_item` seria comparável entre tipos.
- Quatro downloads por export. O Chrome no Android pede permissão uma vez por
  site. Se incomodar, dá para fundir arquivos ao custo de misturar grãos.

**Ele está discutindo o esquema de banco em outra sessão.** O ponto que importa
para essa conversa: o grão real do dado é o **item**, e ele não existe como
linha em nenhum dos quatro arquivos — as colunas `itens` e `gabarito` são
strings empacotadas (`"V? Fc Fc Vc -T"` são cinco itens). Quase todo o bloco `#`
é aritmética sobre item + pesos.

---

## 10. Uma coisa sobre tom

Ele reclama, com razão, quando o app afirma o que não observa. Duas vezes já
mandei tirar coisa que eu tinha posto: um índice chamado `branco_por_conceito`
(batizava de desconhecimento um resíduo) e o campo `itens_da_prova` (não
alimentava cálculo nenhum). Se estiver na dúvida entre registrar um primitivo e
derivar um veredito, **registre o primitivo**.
