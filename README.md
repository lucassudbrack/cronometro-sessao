# Sessão cronometrada

[https://lucassudbrack.github.io/cronometro-sessao/](https://lucassudbrack.github.io/cronometro-sessao/)

App de arquivo único para registrar sets de prova cronometrados: cronômetro por
questão com detecção de revisitas, folha de respostas com resposta e confiança
num toque só, e export de CSV + log de eventos.

Uso real: estudo para o Exame ANPEC e para o concurso do BACEN, com o PDF da
prova aberto no tablet e o app numa janela flutuante ao lado.

Sem backend, sem dependências, sem telemetria. Todo o dado fica no aparelho.

## Sessões

Cada sessão fica guardada no aparelho, na sua própria chave, e só some quando
você manda excluir. A lista aparece no topo da tela inicial. O nome é montado
sozinho a partir da identificação e serve de nome de arquivo e de apelido:

    aaaammdd_concurso_materia_subtopico_tiposessao_fonte

**Tipo de sessão** decide se corre o relógio: *prova* e *teste* correm,
*aprendizado* não. Sem relógio, as passadas e as marcações continuam sendo
registradas e o tempo sai **vazio** no export — zero afirmaria que a questão
levou zero segundo.

## Modelo de prova e pesos

No setup você diz **quais tipos a prova tem** — o que estiver desligado some do
setup e do seletor de tipo da questão. Com um tipo só, a questão já nasce com
ele: não há o que descobrir lendo.

E define o **peso de cada item**, acerto e erro, em múltiplos de X. Branco vale
0, anulado fica fora da conta. O app não arbitra regra de pontuação — aplica a
que você declarar.

O dropdown de modelo preenche tudo de uma vez:

| modelo | tipos | formato | pesos |
|---|---|---|---|
| ANPEC | C/E, conta | 5 itens · 2 dígitos | C/E +X / −X · conta +5X / 0 |
| BACEN | só C/E | 1 item ⚠ | +X / −0,5X |

⚠ O nº de itens do BACEN está em 1 por questão, padrão Cebraspe — confira no
edital antes de valer.

## Usar

Abra a página, instale como app (o navegador oferece "instalar" ou "adicionar à
tela inicial") e abra dali em diante. Depois da primeira visita não há mais
nenhuma chamada de rede.

Se o rodapé acender **sem disco** ou **sem offline**, não comece um simulado —
o primeiro diz que o aparelho recusou gravar, o segundo que o cache offline não
instalou.

## Modelo de dados

```js
ans[q] = {
  tipo: "A" | "ME" | "B",
  itens: [ { r, c, B, T } ],   // A: n itens · ME e B: 1 item
  alt: 5,                       // só ME — quantas alternativas
  dig: 3,                       // só B  — quantos dígitos
  num: "042"                    // só B
}
pags[q] = "7-8"                 // página do caderno, número ou intervalo
gab[q]  = { itens: ["V","F","X"], num: "042" }   // gabarito · X = anulada
apelidos[q] = "ANPEC14 Q5"       // nome da questão; sem apelido, vale a página
```

A **página** default é cumulativa: uma por questão, na ordem, e um intervalo
desloca as seguintes. Só o que você digita é guardado, então o export distingue
página conferida de página deduzida.

O formato tem três eixos — itens de C/E, alternativas de múltipla, dígitos de
conta. Cada um é fixado no setup ou fica **na hora**, e aí a questão declara o
seu ao ser aberta. O tipo nunca é decidido no setup.

| campo | significado |
|---|---|
| `r` | resposta: `V`/`F` (tipo A) · `A`–`E` (múltipla) · dígitos (conta) · `-` branco |
| `c` | confiança: `c` certeza ~90% · `?` dúvida ~60-75% · `x` chute ~50/50 |
| `B` | deixaria em branco na prova real — flag **sobre** a resposta, não no lugar dela |
| `T` | não tive tempo de pensar |

## Regras que não podem quebrar

- **Tempo nunca é inventado.** Dado ausente sai vazio, nunca estimado nem
  dividido igualmente. Uma passada interrompida por crash volta marcada como
  truncada e vale como piso, não como medida.
- **Branco (`-`) ≠ flag `B`.** Branco é não responder. `B` é responder e
  declarar que na prova real deixaria em branco.
- **Revisita é dado de primeira classe.** Tempo fragmentado ≠ tempo contínuo.
- **Corrigir depois não é nova passada.** A conferência abre a questão sem ligar
  o cronômetro, e a correção sai carimbada com `rev` no log.
- **O tipo da questão se descobre ao ler**, não no setup. O mesmo vale para o
  formato quando o eixo ficou em aberto: sem a declaração, a folha não abre —
  o app não supõe cinco itens porque cinco é o comum.
- **Anulada tira o item da prova.** É por isso que o gabarito alimenta a
  contagem de julgáveis: existentes, brancos incluídos, anulados fora.
- **Olhar depois se marca antes do gabarito.** O app registra o instante em que
  você abriu o gabarito e carimba `pos_gabarito` no que for marcado depois.

## Índices

Todo item válido termina em **exatamente um** de seis estados, e eles somam I.
A identidade é auto-auditável: se não fechar, há item sem destino.

| estado | significado |
|---|---|
| `C_m` | marquei e acertei |
| `E_m` | marquei e errei |
| `C_B` | declarei que deixaria em branco, e o palpite acertou |
| `E_B` | declarei que deixaria em branco, e o palpite errou |
| `S` | enfrentei e não tive nem palpite |
| `T` | não alcancei por tempo |

    C_m + E_m + C_B + E_B + S + T = I      (anulado e sem gabarito fora)

**Item marcado B rende 0 e tira 0, mas continua no denominador** — ele estava
em jogo e você não o levou. É isso que normaliza o índice contra a prova, e não
contra o que você resolveu enfrentar.

| decisão que dirige | índice | fórmula |
|---|---|---|
| projeção de nota, tendência | **real** (master) | pontos líquidos ÷ pontos em jogo |
| onde meu modelo falha | acerto do enfrentado | (C_m+C_B) ÷ (C_m+E_m+C_B+E_B) |
| pacing | branco por tempo | T ÷ I |
| cobertura | branco por conceito | S ÷ I |
| política de branco | branco por disciplina | (C_B+E_B) ÷ I |
| a disciplina me paga? | valor do branco | (E_B−C_B) ÷ I |
| política de chute | acerto por certeza / dúvida / chute / B-palpite | fórmula, não input |
| qualidade do dado | min por questão · % passadas truncadas | |

**real** é a versão ponderada de `(C_m − E_m) / I`: com peso +1 no acerto e −1
no erro devolve exatamente essa fração, e com os pesos da ANPEC (conta vale +5
e erra 0) continua dizendo a verdade, o que a fração crua não faria. Pelo mesmo
motivo sai também `valor_do_branco_pontos`: quando o erro não pune, a versão em
contagem diz que a disciplina é neutra, e ela custou o acerto que você abriu mão.

**T bloqueia a marcação** do item e o torna branco automaticamente. T não é um
jeito de responder — é a declaração de que você não chegou lá. Sem esse
bloqueio, T e resposta coexistiriam e os seis estados deixariam de ser
mutuamente exclusivos.

## Saída

Três arquivos, todos CSV.

`<nome>.csv` — uma linha por questão:

```
# materia,Estatística
# fonte,ANPEC 2014
# itens_conferem,2
q,apelido,tipo,param,itens,numerica,segundos,mmss,passadas,pag,pag_auto,olhar,gabarito
1,ANPEC14 Q5,A,5,"Vc F? Vc - FxB",,384,06:24,2,7-8,,1,"V F V X F"
9,9,B,3,"c",42,201,03:21,1,12,1,,"042"
```

`<nome>_estatisticas.csv` — formato longo, uma linha por combinação de tipo ×
confiança × flags × resultado, com a contagem. Grão diferente do arquivo acima,
por isso arquivo separado; combinação ausente é zero. O bloco `#` do CSV
principal repete os totais, para o caso de o terceiro download falhar.

```
tipo,confianca,sem_tempo,deixaria_branco,resultado,itens
A,c,0,0,acerto,12
A,x,0,0,erro,3
ME,?,1,0,erro,1
```

O bloco de metadados são linhas de comentário `#` — leia com
`pandas.read_csv(f, comment="#")`. No tipo B a resposta vai em `numerica` e a
coluna `itens` carrega a confiança e as flags daquele item. `param` é o nº de
itens em A, de alternativas em ME, de dígitos em B. `gabarito` usa o mesmo
alfabeto de `itens`, com `X` para anulada e vazio para sem gabarito. `pontos` é
a soma dos pesos dos itens daquela questão.

`<nome>_eventos.csv` — o log, uma linha por evento, em ordem cronológica.
Colunas fixas: `n, t, hora, ms, ev, q, item, passada, seg, resp, conf, flag, on,
tipo, campo, valor, rev, pos_gabarito, extra`. `t` é relógio de parede em ISO,
`ms` conta do primeiro evento, e `extra` recolhe o que não tem coluna própria
como `chave=valor`, para evento novo nunca sumir do arquivo.

Eventos: `start`, `passada`, `enter`, `leave`, `pause`, `resume`, `tipo`, `param`,
`mark`, `conf`, `flag`, `digit`, `digit_del`, `pag`, `apelido`, `ficha`, `olhar`,
`gab`, `gabarito_aberto`, `recover`. Todo evento discreto vai a disco no toque,
mais um heartbeat de 5 s enquanto o cronômetro corre — é isso que faz o log ser
o lastro, não o formato do arquivo.

## Testes

```
./testes/rodar.sh
```

Roda o app inteiro em Chrome headless com `performance.now()` sob controle, para
poder passar horas de sessão em milissegundos. Precisa de Chrome e Node; sem
instalar nada.

Cobre o que quebra caro: tempo acumulado com revisitas, geração da string de
itens, snapshot e retomada após crash, e a garantia de que a conferência não
cria passada. Não cobre layout.

Para depurar uma falha, abra `testes/harness.html` no navegador — é o app com o
cenário anexado.

## Publicar

O `sw.js` serve tudo do cache. **Ao publicar uma versão nova, incremente
`CACHE`** em [`sw.js`](sw.js) — é o que faz o aparelho pegar a versão nova.
