# Sessão cronometrada

[https://lucassudbrack.github.io/cronometro-sessao/](https://lucassudbrack.github.io/cronometro-sessao/)

App de arquivo único para registrar sets de prova cronometrados: cronômetro por
questão com detecção de revisitas, folha de respostas com resposta e confiança
num toque só, e export de CSV + log de eventos.

Uso real: estudo para o Exame ANPEC e para o concurso do BACEN, com o PDF da
prova aberto no tablet e o app numa janela flutuante ao lado.

Sem backend, sem dependências, sem telemetria. Todo o dado fica no aparelho.

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
  itens: [ { r, c, B, T } ],   // A: 5 ou 1 item · ME e B: 1 item
  num: "042"                    // só tipo B
}
pags[q] = "7-8"                 // página do caderno, número ou intervalo
```

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
- **O tipo da questão se descobre ao ler**, não no setup.

## Saída

Dois arquivos. O primário é o segundo.

`sessao-<stamp>.csv` — resumo, uma linha por questão:

```
# materia,Estatística
# fonte,ANPEC 2014
q,tipo,itens,numerica,segundos,mmss,passadas,pag,olhar
1,A,"Vc F? Vc - FxB",,384,06:24,2,7-8,1
9,B,"c",42,201,03:21,1,12,
```

O bloco de metadados são linhas de comentário `#` — leia com
`pandas.read_csv(f, comment="#")`. No tipo B a resposta vai em `numerica` e a
coluna `itens` carrega a confiança e as flags daquele item.

`eventos-<stamp>.jsonl` — log append-only, cronológico, uma linha por evento
(`meta`, `passada`, `enter`, `leave`, `mark`, `flag`, `pag`, `ficha`, `olhar`,
`pause`, `resume`, `recover`). É o lastro: o CSV é derivado dele. Todo evento
discreto é gravado em disco no toque, mais um heartbeat de 5 s enquanto o
cronômetro corre.

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
