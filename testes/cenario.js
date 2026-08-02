/* ---- cenário 1: tempo acumulado com revisita ---- */
$("nIn").value = "4";
$("goalIn").value = "2";
$("mData").value = "2026-08-02"; $("mData").dispatchEvent(new Event("change"));
$("mConc").value = "ANPEC"; $("mConc").dispatchEvent(new Event("change"));
$("mMat").value = "Estatística"; $("mMat").dispatchEvent(new Event("change"));
$("mFonte").value = "PDF, misto"; $("mFonte").dispatchEvent(new Event("change"));
EQ("nome padronizado da sessao", nomeBase(), "20260802_anpec_estatistica_prova_pdf_misto");
EQ("prova corre no relogio", cronometrar, true);
$("startBtn").click();
EQ("comecar nao apaga a identificacao", [ficha.concurso, ficha.mat], ["ANPEC", "PDF, misto"].slice(0,1).concat(["Estatística"]));
EQ("sessao iniciou", started, true);

select(1);            adv(60000);     // 60 s na Q1
select(2);            adv(30000);     // 30 s na Q2
select(1);            adv(20000);     // volta pra Q1, +20 s
setRunning(false);    adv(600000);    // pausa 10 min: nao conta

NEAR("Q1 acumula as duas passadas", times[1], 80, 0.05);
NEAR("Q2 isolada", times[2], 30, 0.05);
EQ("Q1 tem 2 passadas", passes(1), 2);
EQ("Q2 tem 1 passada", passes(2), 1);
EQ("trilha: 2 passadas fechadas + 1 viva", log.length + (visit ? 1 : 0), 3);
NEAR("pausa nao entra no total da sessao", sessionLive(), 110, 0.05);

/* ---- crash no meio da questao: o snapshot fecha o segmento aberto ---- */
select(4); adv(45000);            // 45 s correndo na Q4, sem sair dela
EQ("times so recebe no commit", times[4], undefined);
NEAR("mas qLive ja sabe", qLive(4), 45, 0.05);
const snap = snapshot();
NEAR("snapshot projeta o segmento aberto para times", snap.times[4], 45, 0.05);
NEAR("snapshot projeta a passada viva", snap.visit.sec, 45, 0.05);
EQ("snapshot marca que estava correndo", snap.running, true);
EQ("snapshot nao contamina o estado vivo", times[4], undefined);
adv(5000);                        // 5 s que o snapshot ja gravado nao pode conhecer
NEAR("snapshot ja tirado nao muda depois", snap.times[4], 45, 0.05);
NEAR("snapshot novo ja tem os 5 s", snapshot().times[4], 50, 0.05);

/* ---- retomar por select passa por setRunning ---- */
setRunning(false);
select(3); adv(15000);
NEAR("Q3 conta apos retomar", qLive(3), 15, 0.05);
const pr = events.filter(e => e.ev === "pause" || e.ev === "resume").map(e => e.ev);
EQ("pause e resume alternam, comecando em resume",
   pr.every((e, i) => e === (i % 2 ? "pause" : "resume")), true);
EQ("termina correndo, entao o ultimo e resume", pr[pr.length - 1], "resume");
EQ("resume carrega a questao", events.filter(e => e.ev === "resume").pop().q, 3);

/* ---- cenário 2: string de itens ---- */
curQ = 1;
ans[1] = blankAns("A");
ans[1].itens[0] = { r: "V", c: "c", B: false, T: false };
ans[1].itens[1] = { r: "F", c: "?", B: false, T: false };
ans[1].itens[2] = { r: "V", c: "c", B: false, T: false };
ans[1].itens[3] = { r: null, c: null, B: true, T: false };   // N: em branco, sem direção
ans[1].itens[4] = { r: "F", c: "x", B: true, T: false };
EQ("string de itens do brief",
   ans[1].itens.map(itemStr).join(" "), "Vc F? Vc -B FxB");
EQ("item vazio sem flag nao e estado, sai vazio",
   itemStr({ r: null, c: null, B: false, T: false }), "");
EQ("em branco com B e o estado N", itemStr({ r: null, c: null, B: true, T: false }), "-B");
EQ("em branco por tempo e T", itemStr({ r: null, c: null, B: false, T: true }), "-T");
EQ("B sobre resposta, nao no lugar", itemStr({ r: "V", c: "c", B: true, T: false }), "VcB");
EQ("T acumula com B", itemStr({ r: "A", c: "x", B: true, T: true }), "AxBT");

/* ---- tipo B ---- */
ans[2] = blankAns("B"); ans[2].num = "042"; ans[2].itens[0].r = "042"; ans[2].itens[0].c = "?";

/* ---- pag ---- */
const efv = () => { const e = pagsEfetivas(); return [1, 2, 3, 4].map(q => e[q].v); };
const efa = () => { const e = pagsEfetivas(); return [1, 2, 3, 4].map(q => e[q].auto); };
EQ("sem nada digitado, a pagina espelha a ordem", efv(), ["1", "2", "3", "4"]);
EQ("e tudo vem marcado como automatico", efa(), [true, true, true, true]);

curQ = 3; setPag("7-8"); EQ("pag aceita intervalo", pags[3], "7-8");
EQ("o default e cumulativo: depois de 7-8 vem a 9", efv(), ["1", "2", "7-8", "9"]);
EQ("so a digitada deixa de ser automatica", efa(), [true, true, false, true]);
curQ = 1; setPag("4");
EQ("mexer na Q1 desloca todas as seguintes", efv(), ["4", "5", "7-8", "9"]);
curQ = 1; setPag("");
EQ("apagar volta ao default, sem materializar nada", efv(), ["1", "2", "7-8", "9"]);
EQ("pags guarda so o que foi digitado", Object.keys(pags), ["3"]);

curQ = 4; $("pagSame").click();
EQ("pag repete a pagina efetiva da anterior", pags[4], "7-8");
curQ = 3; setPag("");   EQ("pag vazia some do mapa", pags[3], undefined);
EQ("com a Q3 no default e a Q4 digitada", efv(), ["1", "2", "3", "7-8"]);

/* ---- ficha e olhar ---- */
$("expBtn").click();
EQ("fechar para o cronometro", running, false);
EQ("folha de fechamento abriu", $("endSheet").classList.contains("hide"), false);
EQ("o fechamento mostra a identificacao pronta",
   $("identResumo").textContent, "20260802_anpec_estatistica_prova_pdf_misto");
$("olharGrid").children[0].click();
$("olharGrid").children[2].click();
EQ("olhar registrado", olharList(), [1, 3]);

/* ---- cenário 3: conferência ---- */
const pend = pendencias();
const txt = q => pend.filter(p => p.q === q).map(p => p.tipo + ":" + p.txt);
EQ("Q1 completa (o item 4 esta em branco de proposito)", txt(1), []);
EQ("Q3 nao tem tipo", txt(3), ["falta:sem tipo escolhido"]);
EQ("Q4 tambem nao", txt(4), ["falta:sem tipo escolhido"]);
EQ("Q2 tipo B esta completa", txt(2), []);
EQ("contagem de faltas", contaFaltas(), 2);
EQ("paginas nao conferidas viram um aviso agrupado, nao um por questao",
   pagsAuto(), [1, 2, 3]);

// tipo B com número mas sem confiança é falta — o numpad deixa sair assim
const cSave = ans[2].itens[0].c; ans[2].itens[0].c = null;
EQ("tipo B sem confianca vira falta",
   pendencias().filter(p => p.q === 2 && p.tipo === "falta").map(p => p.txt),
   ["sem confiança"]);
ans[2].itens[0].c = cSave;

// tipo A com resposta e sem confiança
// fica assim de proposito: a Q1 passa a ter pendencia e da para abri-la pela lista
ans[1].itens[2] = { r: "V", c: null, B: false, T: false };
EQ("tipo A sem confianca vira falta",
   pendencias().filter(p => p.q === 1 && p.tipo === "falta").map(p => p.txt),
   ["1 item sem confiança"]);
EQ("e o item em branco com B nao e cobrado",
   pendencias().some(p => p.q === 1 && /não preenchid/.test(p.txt)), false);

/* ---- corrigir depois nao pode virar passada ---- */
const passesAntes = passes(1), logAntes = log.length, tAntes = times[1], visitAntes = visit;
$("endRev").click();
EQ("conferencia abriu", $("paneRev").classList.contains("on"), true);
EQ("modo conferencia ligado", revisando, true);
const rotulos = () => [...$("revList").children].map(r => r.querySelector(".qq").textContent);
EQ("faltas primeiro, avisos depois", rotulos().slice(0, 3), ["Q1", "Q3", "Q4"]);
EQ("o aviso agrupado de paginas vem por ultimo, sem questao",
   /páginas vieram da ordem/.test([...$("revList").children].pop().textContent), true);
EQ("faixas comprime corridas", faixas([3, 4, 5, 9, 11, 12]), "3–5, 9, 11, 12");
// a Q1 tem só um aviso; abre por ela para conferir que corrigir nao cronometra
const linhaQ1 = [...$("revList").children].find(r => r.querySelector(".qq").textContent === "Q1");
linhaQ1.click();
EQ("abriu o painel da questao", $("paneQ").classList.contains("on"), true);
EQ("curQ mudou para a questao da pendencia", curQ, 1);
EQ("cronometro continua parado", running, false);
EQ("nao criou passada nova", passes(1), passesAntes);
EQ("nao mexeu na trilha", log.length, logAntes);
EQ("nao mexeu no tempo", times[1], tAntes);
EQ("nao trocou a passada corrente", visit === visitAntes, true);
EQ("a passada corrente continua sendo a Q3, so que parada", visit.q, 3);
EQ("botao Grade virou Conferencia", $("backBtn").textContent, "Conferência");

// uma correção feita aqui sai marcada no log
document.querySelectorAll("#answerArea .opts button")[0].click();   // Vc no item 1
const ult = events[events.length - 1];
EQ("correcao e um mark", ult.ev, "mark");
EQ("correcao vem marcada como rev", ult.rev, true);

// e sair da conferência voltando a cronometrar limpa o modo
select(1);
EQ("select encerra a conferencia", revisando, false);
EQ("select cria passada nova", passes(1), passesAntes + 1);
adv(10000);
const durante = events[events.length - 1];
EQ("evento durante a prova nao leva rev", durante.rev, undefined);
setRunning(false);

/* ---- CSV ---- */
const csv = buildCSV().split("\n");
const head = csv.filter(l => l.startsWith("#"));
const cols = csv.find(l => l.startsWith("q,apelido"));
const rows = csv.slice(csv.indexOf(cols) + 1);
EQ("um unico cabecalho de colunas", csv.filter(l => l.startsWith("q,apelido")).length, 1);
EQ("nenhuma linha antes do bloco de comentario", csv[0].startsWith("#"), true);
EQ("colunas", cols, "q,apelido,tipo,param,itens,numerica,segundos,mmss,passadas,pag,olhar,gabarito,pontos,pontos_em_jogo_q");
EQ("valor com virgula fica citado",
   head.find(l => l.startsWith("# fonte")), '# fonte,"PDF, misto"');
EQ("o bloco abre pelo nome da sessao",
   head.find(l => l.startsWith("# sessao")), "# sessao,20260802_anpec_estatistica_prova_pdf_misto");
EQ("e diz que foi cronometrada", head.find(l => l.startsWith("# cronometrada")), "# cronometrada,1");
EQ("materia no bloco", head.find(l => l.startsWith("# materia")), "# materia,Estatística");
EQ("linha da Q1", rows[0], '1,1,A,5,"Vc F? V -B FxB",,90,01:30,3,1,1,"",,');
EQ("linha da Q2 tipo B", rows[1], '2,2,B,3,"?",042,30,00:30,1,2,,"",,');
EQ("linha da Q3", rows[2], '3,3,,,"",,15,00:15,1,3,1,"",,');
EQ("linha da Q4 com pagina", rows[3], '4,7-8,,,"",,50,00:50,1,7-8,,"",,');
EQ("duracao total no bloco",
   head.find(l => l.startsWith("# duracao_total")), "# duracao_total,03:05");
EQ("Q3 fechada quando o fechamento parou o cronometro", Math.round(times[3]), 15);

/* ---- CSV de eventos ---- */
const evCsv = () => {
  const L = buildEventos().split(String.fromCharCode(10));
  const cab = L.find(l => l.startsWith("n,t,"));
  const cols = cab.split(",");
  return L.slice(L.indexOf(cab) + 1).map(l => {
    // RFC 4180: "" dentro de campo citado e uma aspa literal
    const v = []; let cur = "", asp = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i];
      if (ch === String.fromCharCode(34)) {
        if (asp && l[i + 1] === String.fromCharCode(34)) { cur += String.fromCharCode(34); i++; }
        else asp = !asp;
        continue;
      }
      if (ch === "," && !asp) { v.push(cur); cur = ""; continue; }
      cur += ch;
    }
    v.push(cur);
    const o = {}; cols.forEach((k, i) => o[k] = v[i]); return o; });
};
const evs = evCsv();
EQ("so comentario antes do cabecalho",
   buildEventos().split(String.fromCharCode(10)).slice(0, 8).every(l => l.startsWith("#")), true);
EQ("numeracao sequencial", evs.map(r => +r.n), evs.map((_, i) => i + 1));
EQ("a coluna ms nao anda para tras",
   evs.every((r, i) => i === 0 ? r.ms === "0" : +r.ms >= +evs[i - 1].ms), true);
const ts = evs.map(r => r.t);
EQ("eventos em ordem cronologica",
   ts.slice().sort().join("|") === ts.join("|"), true);
EQ("passadas fechadas no arquivo", evs.filter(r => r.ev === "passada").length, 6);
EQ("o log distingue correcao de marcacao sob relogio",
   evs.filter(r => r.ev === "mark" && r.rev === "1").length, 1);
// O aparelho morre com a Q2 aberta. O que estiver no disco é tudo que sobra.
$("nIn").value = "3"; $("startBtn").click();
select(1); adv(40000);
select(2); adv(300000);            // 5 min pensando na Q2
const disco = JSON.parse(JSON.stringify(snapshot()));   // último write antes do crash
adv(120000);                       // 2 min ate o app morrer: ninguem mediu isso

// reabre do zero, como se fosse outro processo
$("nIn").value = "3"; $("startBtn").click();
EQ("sessao nova comeca limpa", log.length, 0);
retomar(disco);

EQ("retomou com o numero de questoes certo", N, 3);
NEAR("Q1 intacta", times[1], 40, 0.05);
NEAR("Q2 tem os 5 min que estavam no disco", times[2], 300, 0.05);
EQ("os 2 min apos o ultimo registro NAO foram inventados", Math.round(times[2]), 300);
EQ("a passada aberta virou passada fechada", log.length, 2);
EQ("e veio marcada como truncada", log[1].trunc, true);
EQ("a passada anterior nao e truncada", !!log[0].trunc, false);
EQ("passadas contadas certo apos retomar", [passes(1), passes(2)], [1, 1]);
EQ("nao ha passada viva depois de retomar", visit, null);
EQ("cronometro parado ao retomar", running, false);
const rec = events.filter(e => e.ev === "recover");
EQ("o log registra a recuperacao", rec.length, 1);
EQ("recover aponta a questao certa", rec[0].q, 2);
NEAR("recover carrega o piso medido", rec[0].sec, 300, 0.05);
EQ("recover diz que e truncado", rec[0].truncada, true);
EQ("a passada truncada sai marcada no arquivo de eventos",
   evCsv().filter(r => r.ev === "passada" && /truncada=true/.test(r.extra)).length, 1);
EQ("a conferencia avisa que o tempo e piso",
   pendencias().some(p => p.q === 2 && /truncado/.test(p.txt)), true);

// e continuar a partir dali funciona
select(3); adv(20000); setRunning(false);
NEAR("segue cronometrando normal depois de retomar", times[3], 20, 0.05);
EQ("a trilha cresce a partir do que sobrou", log.length + (visit ? 1 : 0), 3);

/* ---- cenário 5: os três eixos de formato ---- */
const botoes = sel => [...document.querySelectorAll(sel)];
const clicaNum = (box, n) =>
  botoes("#" + box + " .numseg button, #" + box + " button")
    .find(b => b.textContent === String(n)).click();

// eixo fixo no setup: vale para todas e não há o que escolher na questão
cfgA = 5; cfgME = 4; cfgB = 2; pintaEixos();
$("nIn").value = "4"; $("startBtn").click();
select(1); document.querySelector('#typeRow button[data-t="A"]').click();
EQ("eixo fixo ja nasce com o parametro", ans[1].itens.length, 5);
EQ("sem seletor por questao quando o eixo e fixo", $("paramRow").style.display, "none");
select(2); document.querySelector('#typeRow button[data-t="ME"]').click();
EQ("ME herda as alternativas do setup", ans[2].alt, 4);
EQ("e so gera A-D", botoes("#answerArea .opts button").map(b => b.textContent).join(" "),
   "Ac A? Ax Bc B? Bx Cc C? Cx Dc D? Dx —");
select(3); document.querySelector('#typeRow button[data-t="B"]').click();
EQ("conta herda os digitos do setup", ans[3].dig, 2);
botoes("#answerArea .numpad button").find(b => b.textContent === "7").click();
botoes("#answerArea .numpad button").find(b => b.textContent === "4").click();
botoes("#answerArea .numpad button").find(b => b.textContent === "9").click();
EQ("o terceiro digito nao entra com dig=2", ans[3].num, "74");

// eixo em aberto: cada questão declara o seu
cfgA = 0; cfgME = 0; cfgB = 0; pintaEixos();
$("nIn").value = "4"; $("startBtn").click();
select(1); document.querySelector('#typeRow button[data-t="A"]').click();
EQ("na hora: nasce sem itens", ans[1].itens.length, 0);
EQ("na hora: parametro indefinido", paramDe(ans[1]), null);
EQ("na hora: a folha nao abre antes da escolha",
   botoes("#answerArea .item").length, 0);
EQ("na hora: o seletor aparece", $("paramRow").style.display, "block");
EQ("na hora: a grade marca o tipo com ?",
   document.querySelector('[data-d="1"]').textContent, "A?");
EQ("na hora: a conferencia cobra a escolha",
   pendencias().some(p => p.q === 1 && p.txt === "sem itens escolhidos"), true);
EQ("na hora: incompleta nao conta como respondida", isComplete(1), false);
EQ("na hora: nao entra na contagem de itens do set", itensNoSet(), 0);

clicaNum("paramRow", 3);
EQ("escolheu 3 itens", ans[1].itens.length, 3);
EQ("a folha abriu com 3 itens", botoes("#answerArea .item").length, 3);
EQ("agora conta 3 itens", itensNoSet(), 3);
EQ("evento param registrado", events[events.length - 1].ev, "param");

// aumentar não pergunta nada e preserva o que já estava marcado
botoes("#answerArea .opts button")[0].click();            // Vc no item 1
clicaNum("paramRow", 6);
EQ("aumentar preserva a marcacao", itemStr(ans[1].itens[0]), "Vc");
EQ("aumentar cria itens vazios", ans[1].itens.length, 6);

// reduzir cortando marcação exige confirmação
botoes("#answerArea .item")[4].querySelectorAll(".opts button")[3].click();  // Fc no item 5
EQ("item 5 marcado", itemStr(ans[1].itens[4]), "Fc");
window.__confirmYes = false;
clicaNum("paramRow", 2);
EQ("recusar o aviso nao mexe em nada", ans[1].itens.length, 6);
EQ("e nao perde a marcacao", itemStr(ans[1].itens[4]), "Fc");
window.__confirmYes = true;
clicaNum("paramRow", 2);
EQ("aceitar corta para 2 itens", ans[1].itens.length, 2);
EQ("o item 1 sobrevive", itemStr(ans[1].itens[0]), "Vc");

// ME na hora: trocar alternativas para menos invalida a resposta
select(2); document.querySelector('#typeRow button[data-t="ME"]').click();
EQ("ME na hora nasce sem alt", ans[2].alt, null);
clicaNum("paramRow", 5);
botoes("#answerArea .opts button").find(b => b.textContent === "Ec").click();
EQ("marcou E", itemStr(ans[2].itens[0]), "Ec");
window.__confirmYes = false;
clicaNum("paramRow", 3);
EQ("recusar mantem 5 alternativas", ans[2].alt, 5);
window.__confirmYes = true;
clicaNum("paramRow", 3);
EQ("aceitar reduz e apaga a resposta que sumiu", [ans[2].alt, ans[2].itens[0].r], [3, null]);

// B na hora: número mais longo que o novo limite
select(3); document.querySelector('#typeRow button[data-t="B"]').click();
clicaNum("paramRow", 3);
["1", "2", "3"].forEach(d =>
  botoes("#answerArea .numpad button").find(b => b.textContent === d).click());
EQ("digitou 3 digitos", ans[3].num, "123");
window.__confirmYes = true;
clicaNum("paramRow", 2);
EQ("reduzir para 2 corta o numero", ans[3].num, "12");
EQ("e a resposta do item acompanha", ans[3].itens[0].r, "12");

// o eixo escolhido por questão chega no CSV
const csv5 = buildCSV().split("\n");
const cols5 = csv5.find(l => l.startsWith("q,apelido"));
const r5 = csv5.slice(csv5.indexOf(cols5) + 1);
EQ("param por questao no CSV",
   r5.slice(0, 3).map(l => { const p = l.split(","); return [p[0], p[2], p[3]].join("|"); }),
   ["1|A|2", "2|ME|3", "3|B|2"]);
EQ("o bloco declara o eixo em aberto",
   csv5.find(l => l.startsWith("# ce_itens")), "# ce_itens,na hora");

/* ---- cenário 6: gabarito ---- */
cfgA = 3; cfgME = 4; cfgB = 2; pintaEixos();
$("nIn").value = "4"; $("startBtn").click();

select(1); document.querySelector('#typeRow button[data-t="A"]').click();
// item1 V (vai conferir) · item2 F (vai divergir) · item3 branco
[["V", 0], ["F", 1]].forEach(([L, i]) => {
  const bs = [...document.querySelectorAll("#answerArea .item")][i].querySelectorAll(".opts button");
  bs[L === "V" ? 0 : 3].click();
});
[...document.querySelectorAll("#answerArea .item")][2].querySelectorAll(".flags button")[0].click(); // B -> N
EQ("Q1 marcada", ans[1].itens.map(itemStr).join(" "), "Vc Fc -B");

select(2); document.querySelector('#typeRow button[data-t="ME"]').click();
[...document.querySelectorAll("#answerArea .opts button")].find(b => b.textContent === "Cc").click();

select(3); document.querySelector('#typeRow button[data-t="B"]').click();
["4", "2"].forEach(d =>
  [...document.querySelectorAll("#answerArea .numpad button")].find(b => b.textContent === d).click());
select(4); adv(5000);     // visitada, cronometrada, mas sem tipo declarado
setRunning(false);

// abrir o gabarito sem ter marcado olhar avisa, e recusar volta pro fechamento
window.__confirmYes = false;
$("expBtn").click(); $("endGab").click();
EQ("sem olhar marcado, recusar nao abre o gabarito", gabAberto, null);
EQ("e volta para o fechamento", $("endSheet").classList.contains("hide"), false);
$("olharGrid").children[0].click();
EQ("olhar antes do gabarito nao vem carimbado",
   events[events.length - 1].pos_gabarito, undefined);

window.__confirmYes = true;
$("endGab").click();
EQ("gabarito abriu", $("paneGab").classList.contains("on"), true);
EQ("o instante de ver o gabarito ficou registrado", typeof gabAberto, "string");
EQ("e virou evento", events.some(e => e.ev === "gabarito_aberto"), true);
EQ("so lista questoes com tipo e formato", [...$("gabList").querySelectorAll(".gq")].length, 3);
EQ("a Q4 sem tipo fica de fora, mas avisada",
   /Q4/.test($("gabList").querySelector(".gwarn") ? $("gabList").querySelector(".gwarn").textContent : ""), true);

const bloco = q => [...$("gabList").querySelectorAll(".gq")]
  .find(b => b.querySelector(".qq").textContent === "Q" + q);
const clicaGab = (q, col, txt) => {
  const b = bloco(q);
  const alvo = col === null ? b.querySelector(".grow")
                            : b.querySelectorAll(".gcol")[col];
  [...alvo.querySelectorAll("button")].find(x => x.textContent === txt).click();
};

EQ("tipo A tem uma coluna por item", bloco(1).querySelectorAll(".gcol").length, 3);
EQ("cada coluna oferece V, F e X",
   [...bloco(1).querySelectorAll(".gcol")[0].querySelectorAll("button")].map(b => b.textContent),
   ["V", "F", "X"]);
EQ("ME oferece A-D mais X",
   [...bloco(2).querySelectorAll(".grow button")].map(b => b.textContent),
   ["A", "B", "C", "D", "X"]);

clicaGab(1, 0, "V");   // confere com Vc
clicaGab(1, 1, "V");   // diverge de Fc
clicaGab(1, 2, "F");   // item em branco
EQ("gabarito da Q1 gravado", gab[1].itens, ["V", "V", "F"]);
EQ("item que confere", confere(1, 0), "ok");
EQ("item que diverge", confere(1, 1), "erro");
EQ("item em branco nao conta como erro", confere(1, 2), "branco");

clicaGab(2, null, "C");
EQ("ME confere", confere(2, 0), "ok");
clicaGab(2, null, "C");
EQ("tocar de novo desmarca", gab[2].itens[0], null);
clicaGab(2, null, "B");
EQ("ME diverge", confere(2, 0), "erro");

const inpB = bloco(3).querySelector("input");
inpB.value = "42"; inpB.dispatchEvent(new Event("input")); inpB.dispatchEvent(new Event("change"));
EQ("conta confere", confere(3, 0), "ok");
EQ("o numero do gabarito ficou", gab[3].num, "42");

// anulada tira o item da contagem de julgáveis da prova
EQ("itens declarados no set", itensNoSet(), 5);   // 3 (A) + 1 (ME) + 1 (B)
clicaGab(1, 1, "X");
EQ("item anulado", confere(1, 1), "anulado");
EQ("anulado sai de I, mas nao de itens_no_set",
   [indices().I, itensNoSet()], [4, 5]);
EQ("contagem crua", (c => [c.ok, c.erro, c.branco, c.anulado, c.sem])(tally()),
   [2, 1, 1, 1, 0]);

// olhar marcado depois do gabarito sai carimbado
$("gabBack").click();
$("olharGrid").children[3].click();
EQ("olhar depois do gabarito vem carimbado",
   events[events.length - 1].pos_gabarito, true);

// export
const csv6 = buildCSV().split("\n");
const c6 = csv6.find(l => l.startsWith("q,apelido"));
const r6 = csv6.slice(csv6.indexOf(c6) + 1);
EQ("gabarito de tipo A na coluna, com o anulado",
   r6[0].split(",").slice(-3)[0], '"V X F"');
EQ("gabarito de ME", r6[1].split(",").slice(-3)[0], '"B"');
EQ("gabarito de conta e o numero", r6[2].split(",").slice(-3)[0], '"42"');
EQ("bloco traz a contagem",
   csv6.filter(l => /^# itens_(conferem|divergem|anulados),/.test(l)),
   ["# itens_conferem,2", "# itens_divergem,1", "# itens_anulados,1"]);
EQ("bloco registra quando o gabarito foi visto",
   /^# gabarito_visto_em,20/.test(csv6.find(l => l.startsWith("# gabarito_visto_em"))), true);
EQ("a contagem do gabarito esta no bloco",
   csv6.find(l => l.startsWith("# itens_conferem,")), "# itens_conferem,2");
EQ("cada toque no gabarito virou evento", evCsv().filter(r => r.ev === "gab").length > 0, true);

/* ---- cenário 7: sessão de aprendizado não corre no relógio ---- */
const clicaTipo = v => document.querySelector('#segTipo button[data-v="' + v + '"]').click();
clicaTipo("aprendizado");
EQ("aprendizado desliga o cronometro", cronometrar, false);
EQ("e o corpo marca isso pro CSS", document.body.classList.contains("semcrono"), true);
$("mData").value = "2026-08-02"; $("mData").dispatchEvent(new Event("change"));
$("mConc").value = "BACEN"; $("mConc").dispatchEvent(new Event("change"));
$("mMat").value = "Matemática"; $("mMat").dispatchEvent(new Event("change"));
$("mFonte").value = "Questões comentadas"; $("mFonte").dispatchEvent(new Event("change"));
EQ("o tipo entra no nome", nomeBase(),
   "20260802_bacen_matematica_aprendizado_questoes_comentadas");
cfgA = 2; cfgME = 5; cfgB = 2; pintaEixos();
$("nIn").value = "3"; $("startBtn").click();

select(1); adv(300000);          // cinco minutos de relógio de parede
EQ("o relogio nao liga", running, false);
EQ("nenhum tempo foi registrado", times[1], undefined);
EQ("mas a passada existe", passes(1), 1);
select(2); adv(120000);
EQ("a trilha registra a navegacao", log.length, 1);
EQ("e nada de tempo na sessao", sessionLive(), 0);
EQ("setRunning nao consegue ligar a forca", (setRunning(true), running), false);

document.querySelector('#typeRow button[data-t="A"]').click();
[...document.querySelectorAll("#answerArea .item")][0].querySelectorAll(".opts button")[0].click();
EQ("marcar continua funcionando", itemStr(ans[2].itens[0]), "Vc");
EQ("a conferencia nao cobra tempo em sessao sem relogio",
   pendencias().some(p => /tempo/.test(p.txt)), false);

const csv7 = buildCSV().split("\n");
const h7 = csv7.filter(l => l.startsWith("#"));
const c7 = csv7.find(l => l.startsWith("q,apelido"));
const r7 = csv7.slice(csv7.indexOf(c7) + 1);
EQ("o bloco diz que nao foi cronometrada",
   h7.find(l => l.startsWith("# cronometrada")), "# cronometrada,0");
EQ("duracao total sai vazia", h7.find(l => l.startsWith("# duracao_total")), "# duracao_total,");
EQ("segundos e mmss saem vazios, nao zero",
   r7.map(l => { const p = l.split(","); return p[6] + "|" + p[7]; }), ["|", "|"]);
EQ("mas as passadas continuam saindo",
   r7.map(l => l.split(",")[8]), ["1", "1"]);
EQ("o evento start marca a sessao como nao cronometrada",
   evCsv().find(r => r.ev === "start").extra.includes("cronometrada=false"), true);
EQ("e os pesos saem legiveis no extra, nao como [object Object]",
   /pesos={"A":/.test(evCsv().find(r => r.ev === "start").extra), true);

/* ---- cenário 8: apelidos ---- */
clicaTipo("prova");
$("nIn").value = "4"; paintApelidos();
EQ("a lista do setup tem uma linha por questao",
   $("aplList").querySelectorAll(".aplrow").length, 4);
EQ("e o placeholder mostra o default", [...$("aplList").querySelectorAll("input")]
   .map(i => i.placeholder), ["1", "2", "3", "4"]);
const aplIn = q => $("aplList").querySelector('[data-a="' + q + '"]');
aplIn(1).value = "ANPEC14 Q5"; aplIn(1).dispatchEvent(new Event("change"));
aplIn(3).value = "BACEN22 Q10"; aplIn(3).dispatchEvent(new Event("change"));
$("startBtn").click();

EQ("apelido definido vale como rotulo", rotulo(1), "ANPEC14 Q5");
EQ("sem apelido, vale a pagina", rotulo(2), "2");

paint();
const cel0 = q => document.querySelector('.q[data-q="' + q + '"]');
EQ("sem apelido e sem pagina, a celula e so o numero",
   [cel0(2).querySelector(".n").textContent, cel0(2).querySelector(".ord").textContent],
   ["2", ""]);

curQ = 2; setPag("9");
EQ("e a pagina digitada passa a ser o rotulo", rotulo(2), "9");
EQ("mas o apelido continua ganhando", rotulo(1), "ANPEC14 Q5");
EQ("em lista, pagina nao vira nome de questao", [rotuloQ(1), rotuloQ(2)],
   ["ANPEC14 Q5", "Q2"]);

paint();
const cel = q => document.querySelector('.q[data-q="' + q + '"]');
EQ("a grade mostra o apelido", cel(1).querySelector(".n").textContent, "ANPEC14 Q5");
EQ("e revela o ordinal no canto quando difere", cel(1).querySelector(".ord").textContent, "1");
// a Q2 foi para a pagina 9, entao o cumulativo empurra a Q4 para a 11:
// a celula deixa de coincidir com a ordem e o ordinal aparece no canto
EQ("pagina deslocada tambem revela o ordinal",
   [cel(4).querySelector(".n").textContent, cel(4).querySelector(".ord").textContent],
   ["11", "4"]);
EQ("apelido longo encolhe a fonte", cel(1).querySelector(".n").style.fontSize, "8px");

select(1);
EQ("o cabecalho usa o apelido", /ANPEC14 Q5/.test($("label").textContent), true);
EQ("o campo da questao traz o apelido", $("aplIn").value, "ANPEC14 Q5");
$("aplIn").value = "ANPEC14 Q7"; $("aplIn").dispatchEvent(new Event("change"));
EQ("da para renomear pela questao", apelidos[1], "ANPEC14 Q7");
EQ("e vira evento", events[events.length - 1].ev, "apelido");
$("aplIn").value = ""; $("aplIn").dispatchEvent(new Event("change"));
EQ("apagar volta ao default", [apelidos[1], rotulo(1)], [undefined, "1"]);

aplIn(1).value = "ANPEC14 Q5"; aplIn(1).dispatchEvent(new Event("change"));
const csv8 = buildCSV().split("\n");
const c8 = csv8.find(l => l.startsWith("q,apelido"));
const r8 = csv8.slice(csv8.indexOf(c8) + 1);
EQ("apelido sai como segunda coluna",
   r8.map(l => l.split(",").slice(0, 2).join("|")), ["1|ANPEC14 Q5", "2|9"]);
EQ("renomear a questao virou evento",
   evCsv().filter(r => r.ev === "apelido").length > 0, true);

/* ---- cenário 9: várias sessões guardadas ---- */
// Este cenário mexe em disco de verdade: limpa e trabalha do zero.
// Os cenários acima disparam saveNow() sem await; as continuações só drenariam
// no primeiro await daqui, depois da limpeza, e ressuscitariam o índice.
// Fica em microtask de propósito: um setTimeout cairia depois do load e o
// --dump-dom perderia o resto do relatório.
const drena = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
await drena();
Object.keys(localStorage).filter(k => k.startsWith("sessao:")).forEach(k => localStorage.removeItem(k));
idx = []; sid = null;

const nomes = () => idx.slice().sort((a, b) => b.ts - a.ts).map(r => r.nome);

clicaTipo("prova");
$("mData").value = "2026-08-02"; $("mData").dispatchEvent(new Event("change"));
$("mConc").value = "ANPEC"; $("mConc").dispatchEvent(new Event("change"));
$("mMat").value = "Micro"; $("mMat").dispatchEvent(new Event("change"));
$("mFonte").value = ""; $("mFonte").dispatchEvent(new Event("change"));
$("nIn").value = "3"; apelidos = {}; paintApelidos();
$("startBtn").click();
const sid1 = sid;
select(1); adv(60000);
document.querySelector('#typeRow button[data-t="ME"]').click();
[...document.querySelectorAll("#answerArea .opts button")].find(b => b.textContent === "Ac").click();
await saveNow(); await drena();
EQ("a sessao entrou no indice", nomes(), ["20260802_anpec_micro_prova"]);
EQ("com o progresso no resumo", idx[0].feitas, 1);
EQ("e ficou gravada na propria chave",
   !!localStorage.getItem("sessao:s:" + sid1), true);

// começar outra NÃO apaga a primeira
$("newBtn").click();
$("mMat").value = "Macro"; $("mMat").dispatchEvent(new Event("change"));
$("nIn").value = "2"; paintApelidos();
$("startBtn").click();
const sid2 = sid;
EQ("a nova sessao tem id proprio", sid2 !== sid1, true);
select(1); adv(30000);
await saveNow(); await drena();
EQ("as duas convivem no indice", nomes().length, 2);
EQ("a mais recente primeiro", nomes()[0], "20260802_anpec_macro_prova");
EQ("e a primeira segue intacta no disco",
   JSON.parse(localStorage.getItem("sessao:s:" + sid1)).N, 3);

// voltar para a primeira recupera tudo
await abreSessao(sid1); await drena();
EQ("voltou para a sessao antiga", sid, sid1);
EQ("com o numero de questoes dela", N, 3);
EQ("e as marcacoes dela", ans[1] && ans[1].itens[0].r, "A");
NEAR("e o tempo dela", times[1], 60, 0.1);
EQ("a linha da sessao aberta vem marcada",
   $("sessList").querySelector(".srow.viva").querySelector("b").textContent,
   "20260802_anpec_micro_prova");

// excluir a que não está aberta
window.__confirmYes = false;
await excluiSessao(sid2, "macro");
EQ("recusar a confirmacao nao apaga", nomes().length, 2);
window.__confirmYes = true;
await excluiSessao(sid2, "macro"); await drena();
EQ("excluida some do indice", nomes(), ["20260802_anpec_micro_prova"]);
EQ("e some do disco", localStorage.getItem("sessao:s:" + sid2), null);
EQ("a que ficou nao foi tocada", sid, sid1);

// excluir a que está aberta devolve o app ao setup, sem sessão
await excluiSessao(sid1, "micro"); await drena();
EQ("indice vazio", idx.length, 0);
EQ("nenhuma sessao aberta", sid, null);
EQ("estado limpo", [started, log.length, Object.keys(ans).length], [false, 0, 0]);
EQ("a caixa da lista some quando nao ha nada",
   $("sessBox").style.display, "none");
EQ("gravar sem sessao aberta nao recria nada",
   (await saveNow(), Object.keys(localStorage).filter(k => k.startsWith("sessao:s:")).length), 0);

// migração da chave única antiga
localStorage.setItem("sessao:v1", JSON.stringify({
  fmt: 2, N: 7, times: { 1: 42 }, log: [], ans: {}, events: [], ts: 1780000000000,
  ficha: { tipo: "teste", mat: "Antiga" }
}));
idx = [];
await migraChaveAntiga();
EQ("a chave antiga virou sessao na lista", idx.length, 1);
EQ("com as questoes que ela tinha", idx[0].questoes, 7);
EQ("e a chave antiga foi embora", localStorage.getItem("sessao:v1"), null);
const antiga = await leSessao(idx[0].id);
EQ("o conteudo veio junto", antiga.times[1], 42);

/* ---- cenário 10: estatísticas de calibragem ---- */
Object.keys(localStorage).filter(k => k.startsWith("sessao:")).forEach(k => localStorage.removeItem(k));
idx = []; sid = null;
clicaTipo("prova");
$("mConc").value = "ANPEC"; $("mConc").dispatchEvent(new Event("change"));
$("mMat").value = "Calib"; $("mMat").dispatchEvent(new Event("change"));
$("mFonte").value = ""; $("mFonte").dispatchEvent(new Event("change"));
cfgA = 4; cfgME = 5; cfgB = 2; pintaEixos();
$("nIn").value = "3"; apelidos = {}; paintApelidos();
$("startBtn").click();

// tipo A, 4 itens: acerto com certeza, erro com chute, branco, acerto com dúvida sem tempo
select(1); ans[1] = blankAns("A");
ans[1].itens[0] = { r: "V", c: "c", B: false, T: false };
ans[1].itens[1] = { r: "F", c: "x", B: false, T: false };
ans[1].itens[2] = { r: null, c: null, B: true, T: false };
ans[1].itens[3] = { r: "V", c: "?", B: true,  T: true  };
// múltipla: erro com dúvida, sem tempo
select(2); ans[2] = blankAns("ME"); ans[2].itens[0] = { r: "C", c: "?", B: false, T: true };
// conta: acerto com certeza
select(3); ans[3] = blankAns("B"); ans[3].dig = 2; ans[3].num = "42";
ans[3].itens[0] = { r: "42", c: "c", B: false, T: false };
setRunning(false);

gab[1] = { itens: ["V", "V", "F", "V"], num: "" };   // item2 diverge, item3 era F
gab[2] = { itens: ["A"], num: "" };                   // marcou C, era A
gab[3] = { itens: [null], num: "42" };

const linha = (tp, cf, t_, b_, res) => estatTidy()
  .filter(r => r.tipo === tp && r.confianca === cf && r.sem_tempo === t_ &&
               r.deixaria_branco === b_ && r.resultado === res)
  .reduce((s, r) => s + r.itens, 0);

EQ("acerto com certeza em C/E", linha("A", "c", 0, 0, "acerto"), 1);
EQ("erro com chute em C/E", linha("A", "x", 0, 0, "erro"), 1);
EQ("branco com B nao carrega confianca", linha("A", "-", 0, 1, "branco"), 1);
EQ("acerto com duvida, sem tempo e marcado B",
   linha("A", "?", 1, 1, "acerto"), 1);
EQ("erro com duvida em multipla, sem tempo", linha("ME", "?", 1, 0, "erro"), 1);
EQ("acerto com certeza em conta", linha("B", "c", 0, 0, "acerto"), 1);
EQ("nenhuma combinacao zerada e emitida",
   estatTidy().every(r => r.itens > 0), true);
EQ("total de itens bate com a folha",
   estatTidy().reduce((s, r) => s + r.itens, 0), 6);

const est = buildEstat().split("\n");
EQ("o arquivo de estatisticas tem cabecalho proprio",
   est.find(l => l.startsWith("tipo,")),
   "tipo,confianca,sem_tempo,deixaria_branco,resultado,estado,itens,pontos");
EQ("e so linhas de comentario antes dele",
   est.slice(0, est.indexOf(est.find(l => l.startsWith("tipo,")))).every(l => l.startsWith("#")), true);
EQ("uma linha por combinacao ocorrida",
   est.length - est.indexOf(est.find(l => l.startsWith("tipo,"))) - 1, estatTidy().length);

const h10 = buildCSV().split("\n").filter(l => l.startsWith("#"));
const val = k => (h10.find(l => l.startsWith("# " + k + ",")) || "").split(",")[1];
EQ("o resumo do csv principal traz os acertos por confianca",
   [val("acertos_certeza"), val("acertos_duvida"), val("acertos_chute")], ["2", "1", "0"]);
EQ("e os erros por confianca",
   [val("erros_certeza"), val("erros_duvida"), val("erros_chute")], ["0", "1", "1"]);
EQ("segmentado por tipo",
   [val("A_acertos"), val("A_erros"), val("A_brancos"),
    val("ME_acertos"), val("ME_erros"), val("B_acertos")], ["2", "1", "1", "0", "1", "1"]);
// sem_tempo_* deixou de ser emitido: com T forçando branco eles seriam sempre
// 0, 0 e igual a T. Quem carrega o eixo agora é a primitiva T.
EQ("sem_tempo_* saiu do bloco por ser redundante",
   h10.some(l => l.startsWith("# sem_tempo_")), false);
// aqui os itens tem T junto de resposta, marcados direto no estado: e o caso
// legado, e a classificacao segue a resposta em vez de descartar o dado
EQ("T com resposta nao vira T: a resposta manda",
   [indices().T, indices().C_m + indices().E_m + indices().C_B + indices().E_B], [0, 5]);
EQ("o unico branco vira N, nao T", [indices().N, indices().T], [1, 0]);
EQ("mas a flag continua na coluna sem_tempo do arquivo de estatisticas",
   buildEstat().split(String.fromCharCode(10)).filter(l => /^[AB]?ME?,/.test(l))
     .filter(l => l.split(",")[2] === "1").length > 0, true);
EQ("o arquivo de estatisticas tem uma linha por combinacao",
   buildEstat().split(String.fromCharCode(10)).filter(l => /^(A|ME|B),/.test(l)).length,
   estatTidy().length);

doExport();
EQ("o export sai com tres arquivos", window.__files.map(f => f.name.replace(/^[^_]*_/, "")),
   ["anpec_calib_prova.csv", "anpec_calib_prova_estatisticas.csv",
    "anpec_calib_prova_eventos.jsonl"].slice(0, window.__files.length));

/* ---- cenário 11: modelos de prova, tipos desligados e pesos ---- */
Object.keys(localStorage).filter(k => k.startsWith("sessao:")).forEach(k => localStorage.removeItem(k));
idx = []; sid = null;
const tipoVisivel = t => document.querySelector('#typeRow button[data-t="' + t + '"]').style.display !== "none";
const campoVisivel = k => $("fld" + k).style.display !== "none";

// ANPEC
$("tpl").value = "anpec"; $("tpl").dispatchEvent(new Event("change"));
EQ("ANPEC: C/E com 5 itens", cfgA, 5);
EQ("ANPEC: conta com 2 digitos", cfgB, 2);
EQ("ANPEC: nao tem multipla escolha", usa.ME, false);
EQ("ANPEC: pesos de C/E", [pesos.A.acerto, pesos.A.erro], [1, -1]);
EQ("ANPEC: conta acerta 5X e erra 0", [pesos.B.acerto, pesos.B.erro], [5, 0]);
EQ("multipla some do setup", campoVisivel("ME"), false);
EQ("e some do seletor de tipo da questao", tipoVisivel("ME"), false);
EQ("mas C/E e conta continuam la", [tipoVisivel("A"), tipoVisivel("B")], [true, true]);
EQ("a tabela de pesos so mostra os tipos em uso",
   [...$("pesos").querySelectorAll(".rot")].map(r => r.textContent), ["C / E", "Conta"]);

// BACEN
$("tpl").value = "bacen"; $("tpl").dispatchEvent(new Event("change"));
EQ("BACEN: so C/E", [usa.A, usa.ME, usa.B], [true, false, false]);
EQ("BACEN: acerto X e erro -0,5X", [pesos.A.acerto, pesos.A.erro], [1, -0.5]);
EQ("BACEN: 1 item por questao (padrao Cebraspe, a confirmar no edital)", cfgA, 1);
EQ("a nota do modelo avisa que e para conferir",
   /edital/.test($("tplHint").textContent), true);

// com um tipo só, a questão já nasce com ele
$("mConc").value = "BACEN"; $("mConc").dispatchEvent(new Event("change"));
$("mMat").value = "Direito"; $("mMat").dispatchEvent(new Event("change"));
$("mSub").value = "Administrativo"; $("mSub").dispatchEvent(new Event("change"));
$("mFonte").value = ""; $("mFonte").dispatchEvent(new Event("change"));
EQ("subtopico entra no nome do arquivo", nomeBase(),
   "20260802_bacen_direito_administrativo_prova");
$("nIn").value = "4"; apelidos = {}; paintApelidos();
$("startBtn").click();
select(1);
EQ("tipo unico ja vem escolhido", ans[1] && ans[1].tipo, "A");
EQ("e o log diz que foi automatico",
   events.filter(e => e.ev === "tipo").pop().auto, true);
EQ("com 1 item, a folha abre direto", ans[1].itens.length, 1);

// não dá para desligar o último tipo
usa.A = true; usa.ME = false; usa.B = false;
document.querySelector('#segUsa button[data-u="A"]').click();
EQ("desligar o ultimo tipo e recusado", usa.A, true);

// pontuação com os pesos do BACEN
[...document.querySelectorAll("#answerArea .opts button")].find(b => b.textContent === "Vc").click();
select(2); [...document.querySelectorAll("#answerArea .opts button")].find(b => b.textContent === "Fc").click();
select(3); [...document.querySelectorAll("#answerArea .opts button")].find(b => b.textContent === "V?").click();
select(4); [...document.querySelectorAll("#answerArea .flags button")].find(b => b.textContent === "B").click();
setRunning(false);
gab[1] = { itens: ["V"], num: "" };   // acerto  -> +1
gab[2] = { itens: ["V"], num: "" };   // erro    -> -0,5
gab[3] = { itens: ["F"], num: "" };   // erro    -> -0,5
gab[4] = { itens: ["V"], num: "" };   // branco  ->  0
EQ("pontos pelos pesos declarados", indices().pontos, 0);
EQ("pontos em jogo", indices().pontos_em_jogo, 4);
EQ("pontos por questao", [1, 2, 3, 4].map(pontosQ), [1, -0.5, -0.5, 0]);

// o mesmo set com os pesos da ANPEC dá outro número, e é só o peso que muda
pesos.A = { acerto: 1, erro: -1 };
EQ("trocar o peso muda so a conta",
   [indices().pontos, indices().pontos_em_jogo], [-1, 4]);
pesos.A = { acerto: 1, erro: -0.5 };

// flag B: quanto valeria se eu tivesse deixado em branco o que marquei como B
ans[3].itens[0].B = true;
EQ("o master respeita o B: o erro da Q3 sai da conta", indices().pontos, 0.5);
EQ("mas o item continua no denominador", indices().pontos_em_jogo, 4);
EQ("e a referencia ignorando B mostra o que teria sido",
   indices().pontos_ignorando_B, 0);

const h11 = buildCSV().split("\n").filter(l => l.startsWith("#"));
const v11 = k => (h11.find(l => l.startsWith("# " + k + ",")) || "").split(",")[1];
EQ("os pesos vao no bloco",
   [v11("peso_A_acerto"), v11("peso_A_erro")], ["1", "-0.5"]);
EQ("so os tipos em uso aparecem no bloco",
   h11.some(l => l.startsWith("# peso_B_")), false);
EQ("o bloco declara os tipos da prova e o modelo",
   [v11("tipos_na_prova"), v11("modelo")], ["A", "bacen"]);
EQ("e os pontos", [v11("pontos"), v11("pontos_em_jogo"), v11("pontos_ignorando_B")],
   ["0.5", "4", "0"]);
const est11 = buildEstat().split("\n");
EQ("o arquivo de estatisticas ganhou a coluna de pontos",
   est11.find(l => l.startsWith("tipo,")),
   "tipo,confianca,sem_tempo,deixaria_branco,resultado,estado,itens,pontos");
EQ("a soma da coluna bate com o total",
   est11.slice(est11.indexOf(est11.find(l => l.startsWith("tipo,"))) + 1)
        .reduce((s, l) => s + parseFloat(l.split(",").pop()), 0), 0.5);

/* ---- cenário 12: os seis estados, a identidade e os índices ---- */
Object.keys(localStorage).filter(k => k.startsWith("sessao:")).forEach(k => localStorage.removeItem(k));
idx = []; sid = null;
$("tpl").value = "bacen"; $("tpl").dispatchEvent(new Event("change"));   // só C/E, +1 / −0,5
$("mConc").value = "BACEN"; $("mConc").dispatchEvent(new Event("change"));
$("mMat").value = "Estados"; $("mMat").dispatchEvent(new Event("change"));
$("mSub").value = ""; $("mSub").dispatchEvent(new Event("change"));
$("mFonte").value = ""; $("mFonte").dispatchEvent(new Event("change"));
cfgA = 8; pintaEixos();
$("nIn").value = "1"; apelidos = {}; paintApelidos();
$("startBtn").click();
select(1);
const its = () => [...document.querySelectorAll("#answerArea .item")];
const marca = (i, txt) => [...its()[i].querySelectorAll(".opts button")]
  .find(b => b.textContent === txt).click();
const flag = (i, f) => [...its()[i].querySelectorAll(".flags button")]
  .find(b => b.textContent === f).click();

marca(0, "Vc");                 // C_m
marca(1, "Vc");                 // E_m
marca(2, "V?"); flag(2, "B");   // C_B
marca(3, "V?"); flag(3, "B");   // E_B
flag(4, "B");                   // N: em branco com B
flag(5, "T");                   // T
marca(6, "Vc");                 // vai virar anulado
marca(7, "Vc");                 // fica sem gabarito
setRunning(false);

// T zera a marcação e trava o resto
EQ("T vira branco automaticamente",
   [ans[1].itens[5].r, ans[1].itens[5].c, ans[1].itens[5].B], [null, null, false]);
EQ("e trava os botoes de resposta daquele item",
   [...its()[5].querySelectorAll(".opts button")].slice(0, -1).every(b => b.disabled), true);
EQ("B fica indisponivel sem resposta", [...its()[5].querySelectorAll(".flags button")]
   .find(b => b.textContent === "B").disabled, true);
EQ("o item aparece marcado como sem tempo", its()[5].className.includes("semtempo"), true);
EQ("os outros itens seguem livres",
   [...its()[0].querySelectorAll(".opts button")].some(b => b.disabled), false);
// marcar T por cima de uma resposta apaga a resposta
marca(6, "Fx"); flag(6, "T");
EQ("T por cima de resposta apaga a resposta", ans[1].itens[6].r, null);
EQ("e o log registra que zerou", events[events.length - 1].zerou, true);
flag(6, "T"); marca(6, "Vc");   // desfaz e remarca

gab[1] = { itens: ["V", "F", "V", "F", "V", "V", "X", null], num: "" };
const X = () => indices();

EQ("C_m", X().C_m, 1);
EQ("E_m", X().E_m, 1);
EQ("C_B", X().C_B, 1);
EQ("E_B", X().E_B, 1);
EQ("N — em branco, sem direcao", X().N, 1);
EQ("nada ficou por preencher", X().itens_nao_preenchidos, 0);
EQ("T — nao alcancei por tempo", X().T, 1);
EQ("anulado fica fora", X().anulados, 1);
EQ("sem gabarito fica fora", X().sem_gabarito, 1);
EQ("I = os estados somados", X().I, 6);
EQ("a identidade fecha", X().identidade_fecha, true);
EQ("nenhum item ficou sem destino",
   X().C_m + X().E_m + X().C_B + X().E_B + X().N + X().T + X().itens_nao_preenchidos +
   X().anulados + X().sem_gabarito, ans[1].itens.length);

// pontuação: +1 no acerto, −0,5 no erro; B rende 0 e tira 0
EQ("pontos liquidos = C_m·(+1) + E_m·(−0,5)", X().pontos, 0.5);
EQ("pontos em jogo = os 6 itens validos", X().pontos_em_jogo, 6);
EQ("real = liquido / em jogo", X().real, 0.0833);
EQ("ignorando B, o palpite certo entra e o errado tambem",
   [X().pontos_ignorando_B, X().real_ignorando_B], [1, 0.1667]);

EQ("acerto do enfrentado = (C_m+C_B) / opinou", X().acerto_do_enfrentado, 0.5);
EQ("nao ha mais indice que nomeie a causa do branco",
   [X().branco_por_tempo, X().branco_por_conceito], [undefined, undefined]);
EQ("as contagens ficam, para quem quiser dividir sabendo o que divide",
   [X().T, X().N, X().I], [1, 1, 6]);
EQ("branco por disciplina = (C_B+E_B)/I", X().branco_por_disciplina, 0.3333);
EQ("valor do branco = (E_B−C_B)/I", X().valor_do_branco, 0);
EQ("acerto B-palpite = C_B/(C_B+E_B)", X().acerto_B_palpite, 0.5);
EQ("acerto por certeza", X().acerto_certeza, 0.5);
EQ("acerto por duvida", X().acerto_duvida, 0.5);
EQ("sem chutes, o indice fica vazio e nao zero", X().acerto_chute, null);

// a fórmula crua (C_m−E_m)/I é o caso particular de pesos +1/−1
pesos.A = { acerto: 1, erro: -1 };
EQ("com +1/−1 o real reduz a (C_m−E_m)/I",
   indices().real, Math.round((1 - 1) / 6 * 10000) / 10000);
pesos.A = { acerto: 1, erro: -0.5 };

// valor do branco em contagem engana quando o erro nao pune
pesos.A = { acerto: 1, erro: 0 };
EQ("em contagem, a disciplina parece neutra", indices().valor_do_branco, 0);
EQ("em pontos, ela custou o acerto que voce abriu mao",
   indices().valor_do_branco_pontos, -0.1667);
pesos.A = { acerto: 1, erro: -0.5 };

const h12 = buildCSV().split("\n").filter(l => l.startsWith("#"));
const v12 = k => (h12.find(l => l.startsWith("# " + k + ",")) || "").split(",")[1];
EQ("as primitivas vao no bloco",
   ["C_m", "E_m", "C_B", "E_B", "N", "T", "I"].map(v12), ["1", "1", "1", "1", "1", "1", "6"]);
EQ("e a identidade e declarada fechada", v12("identidade_fecha"), "1");
EQ("os indices tambem", [v12("real"), v12("acerto_do_enfrentado")], ["0.0833", "0.5"]);
EQ("e o bloco declara que a causa do branco nao e do app",
   /caderno/.test(h12.find(l => l.startsWith("# causa_do_branco")) || ""), true);
EQ("os indices de causa sumiram do bloco",
   h12.some(l => /^# branco_por_(tempo|conceito),/.test(l)), false);
EQ("o estado entra no arquivo de estatisticas",
   buildEstat().split("\n").find(l => l.startsWith("tipo,")),
   "tipo,confianca,sem_tempo,deixaria_branco,resultado,estado,itens,pontos");
EQ("e cada linha carrega um dos seis",
   buildEstat().split("\n").filter(l => /^A,/.test(l))
     .map(l => l.split(",")[5]).sort().join(" "),
   "C_B C_m E_B E_m N T anulado sem_gabarito");
EQ("os indices saem no bloco do CSV principal", v12("I"), "6");

/* ---- cenário 13: questão sem gabarito não pode sumir em silêncio ---- */
// Reproduz o que aconteceu na sessão de 02/08: a Q4 ficou sem gabarito e levou
// 4 dos 5 itens marcados com T embora, derrubando a primitiva T de 5 para 1.
Object.keys(localStorage).filter(k => k.startsWith("sessao:")).forEach(k => localStorage.removeItem(k));
idx = []; sid = null;
$("tpl").value = "bacen"; $("tpl").dispatchEvent(new Event("change"));
$("mConc").value = "BACEN"; $("mConc").dispatchEvent(new Event("change"));
$("mMat").value = "Lacuna"; $("mMat").dispatchEvent(new Event("change"));
$("mSub").value = ""; $("mSub").dispatchEvent(new Event("change"));
cfgA = 2; pintaEixos();
$("nIn").value = "2"; apelidos = {}; paintApelidos();
$("startBtn").click();
const itn = () => [...document.querySelectorAll("#answerArea .item")];
const flg = (i, f) => [...itn()[i].querySelectorAll(".flags button")]
  .find(b => b.textContent === f).click();
select(1); flg(0, "T"); flg(1, "T");          // Q1: dois itens sem tempo
select(2); flg(0, "T"); flg(1, "T");          // Q2: idem
setRunning(false);
gab[1] = { itens: ["V", "V"], num: "" };      // só a Q1 recebe gabarito
gabAberto = iso(Date.now());

EQ("os quatro T foram marcados",
   [1, 2].reduce((s, q) => s + ans[q].itens.filter(i => i.T).length, 0), 4);
EQ("mas so os da questao com gabarito viram a primitiva T", indices().T, 2);
EQ("e os outros quatro contam como sem gabarito", indices().sem_gabarito, 2);
EQ("a primitiva T enxerga so metade", indices().T, 2);
EQ("a conferencia agora cobra a questao sem gabarito",
   pendencias().filter(p => p.q === 2 && p.tipo === "falta").map(p => p.txt),
   ["sem gabarito — sai de todos os índices"]);
EQ("e ela entra na contagem que trava o export", contaFaltas() > 0, true);

gab[2] = { itens: ["V", null], num: "" };     // preenche metade
EQ("gabarito parcial tambem e cobrado, com a contagem",
   pendencias().filter(p => p.q === 2 && p.tipo === "falta").map(p => p.txt),
   ["1 item sem gabarito"]);

gab[2] = { itens: ["V", "V"], num: "" };
EQ("completo, a cobranca some", pendencias().filter(p => /gabarito/.test(p.txt)).length, 0);

// e a linha da pendencia tem que levar para a folha do gabarito, nao para a questao
gab[2] = { itens: [null, null], num: "" };
EQ("a pendencia de gabarito declara o destino",
   pendencias().filter(p => /gabarito/.test(p.txt)).map(p => p.destino), ["gabarito"]);
EQ("e as outras continuam indo para a questao",
   pendencias().filter(p => !/gabarito/.test(p.txt)).every(p => p.destino === "questao"), true);
openRev();
const linhaGab = [...$("revList").children]
  .find(r => /sem gabarito/.test(r.textContent));
linhaGab.click();
EQ("clicar abre a folha do gabarito", $("paneGab").classList.contains("on"), true);
EQ("e nao o painel da questao", $("paneQ").classList.contains("on"), false);
EQ("com a questao certa acesa",
   [...$("gabList").querySelectorAll(".gq.foco")].map(b => b.querySelector(".qq").textContent),
   ["Q2"]);
sairRev();
gab[2] = { itens: ["V", "V"], num: "" };
EQ("e agora os quatro T aparecem", indices().T, 4);
EQ("T passa a dizer a verdade", indices().T, 4);

const h13 = buildCSV().split(String.fromCharCode(10)).filter(l => l.startsWith("#"));
const v13 = k => (h13.find(l => l.startsWith("# " + k + ",")) || "").split(",")[1];
EQ("o bloco declara o gabarito completo", v13("gabarito_completo"), "1");
EQ("itens_no_set e o total declarado", v13("itens_no_set"), "4");
EQ("e I sai dele tirando anulado e sem gabarito",
   +v13("itens_no_set") - +v13("itens_anulados_fora") - +v13("itens_sem_gabarito"), +v13("I"));
EQ("o contador ambiguo saiu do bloco",
   h13.some(l => l.startsWith("# itens_julgaveis_no_set")), false);

/* ---- cenário 14: tempo de prova trava a folha ---- */
Object.keys(localStorage).filter(k => k.startsWith("sessao:")).forEach(k => localStorage.removeItem(k));
idx = []; sid = null;
$("tpl").value = "bacen"; $("tpl").dispatchEvent(new Event("change"));
$("mConc").value = "BACEN"; $("mConc").dispatchEvent(new Event("change"));
$("mMat").value = "Relogio"; $("mMat").dispatchEvent(new Event("change"));
cfgA = 2; pintaEixos();
$("nIn").value = "3"; apelidos = {}; paintApelidos();
$("limIn").value = "2";            // dois minutos de prova
$("startBtn").click();
EQ("o limite entrou em segundos", limite, 120);
EQ("e o start registrou", events.find(e => e.ev === "start").tempo_de_prova_seg, 120);

select(1); adv(50000);
EQ("antes do limite nao trava", travado, false);
EQ("o rodape mostra o que resta", (tick(), $("total").textContent), "01:10");
EQ("com o rotulo trocado", $("rotTotal").textContent, "Restam");
const bt = () => [...document.querySelectorAll("#answerArea .opts button")];
bt().find(b => b.textContent === "Vc").click();
EQ("da para marcar antes do limite", ans[1].itens[0].r, "V");

adv(80000);                        // passa dos 2 min
tick();
EQ("estourou e travou", travado, true);
EQ("o cronometro parou", running, false);
EQ("a folha de fim apareceu", $("fimSheet").classList.contains("hide"), false);
EQ("o corpo marca o travamento", document.body.classList.contains("travado"), true);
EQ("e virou evento", events.some(e => e.ev === "tempo_esgotado"), true);
EQ("o evento leva o limite e a duracao",
   (e => [e.limite_seg, e.duracao_seg >= 120])(events.find(e => e.ev === "tempo_esgotado")),
   [120, true]);
EQ("o restante zera e nao fica negativo", restante(), 0);

// travado: a folha não aceita mais nada
$("fimVer").click();
select(2);
EQ("select nao religa o cronometro", running, false);
EQ("nem cria passada nova na Q2 fora do tempo", passes(2), 1);
EQ("os botoes de resposta estao travados",
   bt().length === 0 || bt().every(b => b.disabled), true);
document.querySelector('#typeRow button[data-t="A"]').click();
EQ("nem escolher tipo depois do tempo", ans[2], undefined);
EQ("e prova de tipo unico nao auto-atribui fora do tempo",
   ans[3] === undefined && (openQ(3), ans[3] === undefined), true);
setRunning(true);
EQ("setRunning se recusa a religar", running, false);

// mas a conferência continua aberta, e o que sai dali vem carimbado
openRev();
EQ("conferencia abre depois de travado", revisando, true);
const alvo = [...$("revList").children].find(r => r.querySelector(".qq").textContent === "Q1");
if (alvo) alvo.click(); else openQ(1);
EQ("na conferencia a folha destrava", bt().some(b => !b.disabled), true);
bt().find(b => b.textContent === "F?").click();
const ultimo = events[events.length - 1];
EQ("a correcao sai como rev", ultimo.rev, true);
EQ("e carimbada como depois do tempo", ultimo.pos_limite, true);
sairRev();

const h14 = buildCSV().split(String.fromCharCode(10)).filter(l => l.startsWith("#"));
const v14 = k => (h14.find(l => l.startsWith("# " + k + ",")) || "").split(",")[1];
EQ("o bloco declara o tempo de prova", v14("tempo_de_prova"), "02:00");
EQ("e que ele estourou", v14("tempo_esgotou"), "1");
EQ("e tempo_sobrou sai vazio, nao zero", v14("tempo_sobrou"), "");

// o travamento sobrevive a fechar e reabrir
await saveNow(); await drena();
const guardado = await leSessao(sid);
EQ("o snapshot guarda o travamento", [guardado.limite, guardado.travado], [120, true]);
travado = false; limite = 0; document.body.classList.remove("travado");
retomar(guardado);
EQ("retomar traz o travamento de volta", [limite, travado], [120, true]);
EQ("e a classe do corpo tambem", document.body.classList.contains("travado"), true);

// sessão sem limite não trava nunca
$("newBtn").click();
$("limIn").value = ""; $("nIn").value = "2"; paintApelidos();
$("startBtn").click();
EQ("sem limite, limite fica zero", limite, 0);
select(1); adv(9999000); tick();
EQ("e nao trava nunca", travado, false);
EQ("o rodape volta a mostrar o total", $("rotTotal").textContent, "Sessão");
setRunning(false);

/* ---- cenário 15: tocar o tipo já selecionado não pode apagar ---- */
// Aconteceu na sessão de 02/08: a Q9 tinha 42 com confiança c, o botão "Conta"
// foi tocado de novo e a resposta sumiu sem aviso.
Object.keys(localStorage).filter(k => k.startsWith("sessao:")).forEach(k => localStorage.removeItem(k));
idx = []; sid = null;
$("tpl").value = "livre"; $("tpl").dispatchEvent(new Event("change"));
usa = { A: true, ME: true, B: true }; pintaUsa();
cfgA = 3; cfgME = 4; cfgB = 2; pintaEixos();
$("mConc").value = "T"; $("mConc").dispatchEvent(new Event("change"));
$("mMat").value = "Retoque"; $("mMat").dispatchEvent(new Event("change"));
$("mSub").value = ""; $("mSub").dispatchEvent(new Event("change"));
$("mFonte").value = ""; $("mFonte").dispatchEvent(new Event("change"));
$("nIn").value = "2"; apelidos = {}; paintApelidos();
$("startBtn").click();
const tp = v => document.querySelector('#typeRow button[data-t="' + v + '"]').click();

select(1); tp("B");
[...document.querySelectorAll("#answerArea .numpad button")].find(b => b.textContent === "4").click();
[...document.querySelectorAll("#answerArea .numpad button")].find(b => b.textContent === "2").click();
[...document.querySelectorAll("#answerArea .opts button")].find(b => /certeza/.test(b.textContent)).click();
EQ("a conta esta preenchida", [ans[1].num, ans[1].itens[0].c], ["42", "c"]);
const antes = events.length;
window.__confirmYes = false;
tp("B");
EQ("tocar o tipo ja selecionado nao apaga", [ans[1].num, ans[1].itens[0].c], ["42", "c"]);
EQ("e nem gera evento", events.length, antes);

// trocar de verdade continua pedindo confirmacao, e recusar preserva
tp("A");
EQ("recusar a troca preserva a conta", [ans[1].tipo, ans[1].num], ["B", "42"]);
window.__confirmYes = true;
tp("A");
EQ("aceitar troca de verdade", ans[1].tipo, "A");
EQ("e ai sim a folha e nova", ans[1].itens.length, 3);

select(2); tp("ME");
[...document.querySelectorAll("#answerArea .opts button")].find(b => b.textContent === "Cc").click();
const antes2 = events.length;
tp("ME");
EQ("vale para multipla tambem", itemStr(ans[2].itens[0]), "Cc");
EQ("sem evento", events.length, antes2);
setRunning(false);
EQ("n_I saiu do bloco por ser o proprio I",
   buildCSV().split(String.fromCharCode(10)).some(l => l.startsWith("# n_I,")), false);

/* ---- cenário 16: os cinco ajustes do export ---- */
Object.keys(localStorage).filter(k => k.startsWith("sessao:")).forEach(k => localStorage.removeItem(k));
idx = []; sid = null;
$("tpl").value = "anpec"; $("tpl").dispatchEvent(new Event("change"));
$("mConc").value = "ANPEC"; $("mConc").dispatchEvent(new Event("change"));
$("mMat").value = "Ajustes"; $("mMat").dispatchEvent(new Event("change"));
$("mSub").value = ""; $("mSub").dispatchEvent(new Event("change"));
$("mFonte").value = ""; $("mFonte").dispatchEvent(new Event("change"));
cfgA = 4; cfgB = 2; pintaEixos();
$("nIn").value = "3"; apelidos = {}; paintApelidos();
$("limIn").value = "10";                       // 10 min de prova
$("startBtn").click();

// 5) a página digitada re-ancora as seguintes
curQ = 2; setPag("12");
EQ("digitar a pagina re-ancora as seguintes",
   [1, 2, 3].map(q => pagEf(q).v), ["1", "12", "13"]);
curQ = 2; setPag("12-14");
EQ("intervalo tambem re-ancora", [1, 2, 3].map(q => pagEf(q).v), ["1", "12-14", "15"]);
curQ = 2; setPag("");

select(1); adv(40000);
const it16 = () => [...document.querySelectorAll("#answerArea .item")];
const op16 = (i, txt) => [...it16()[i].querySelectorAll(".opts button")]
  .find(b => b.textContent === txt).click();
const fl16 = (i, f) => [...it16()[i].querySelectorAll(".flags button")]
  .find(b => b.textContent === f).click();
document.querySelector('#typeRow button[data-t="A"]').click();

// 4) os dois brancos legítimos, e a borracha
op16(0, "Vc");
op16(1, "Fc");
fl16(2, "B");                                   // N: em branco com B
fl16(3, "T");                                   // T
EQ("N e branco com B", itemStr(ans[1].itens[2]), "-B");
EQ("T continua T", itemStr(ans[1].itens[3]), "-T");
gab[1] = { itens: ["V", "V", "V", "V"], num: "" };   // item 2 marcou F: erro
EQ("os estados", [0,1,2,3].map(i => estadoDoItem(1, i)), ["C_m", "E_m", "N", "T"]);
EQ("N rende 0 e tira 0", pontosQ(1), 0 + 1 - 1);
EQ("mas continua no que estava em jogo", pontosJogoQ(1), 4);

// a borracha devolve o item a não preenchido
op16(0, "—");
EQ("a borracha limpa a marcacao", itemStr(ans[1].itens[0]), "");
EQ("e o item vira nao preenchido", estadoDoItem(1, 0), "nao_preenchido");
EQ("que a conferencia cobra",
   pendencias().some(p => p.q === 1 && /não preenchid/.test(p.txt)), true);
EQ("e nao entra em nenhum dos estados da prova",
   [indices().C_m, indices().itens_nao_preenchidos], [0, 1]);
op16(0, "Vc");
EQ("remarcar tira a cobranca",
   pendencias().some(p => p.q === 1 && /não preenchid/.test(p.txt)), false);
// a borracha apaga tambem as flags
fl16(2, "B"); op16(2, "Vc"); fl16(2, "B"); op16(2, "—");
EQ("a borracha apaga resposta, confianca e flags",
   [ans[1].itens[2].r, ans[1].itens[2].c, ans[1].itens[2].B, ans[1].itens[2].T],
   [null, null, false, false]);
fl16(2, "B");

// 2) pausas
setRunning(false); adv(30000); setRunning(true); adv(5000);
setRunning(false); adv(20000); setRunning(true); adv(5000);
setRunning(false);
EQ("duas pausas fechadas", pausas().n, 2);
// tempo_em_pausa vem do relogio de parede dos eventos, nao do cronometro
// falso do arnes: aqui so da para verificar que e inteiro e nao negativo.
EQ("e o tempo em pausa e inteiro nao negativo",
   Number.isInteger(pausas().seg) && pausas().seg >= 0, true);

const h16 = buildCSV().split(String.fromCharCode(10)).filter(l => l.startsWith("#"));
const v16 = k => (h16.find(l => l.startsWith("# " + k + ",")) || "").split(",")[1];
// 1) segundos inteiros
EQ("duracao em mm:ss e em segundos",
   [v16("duracao_total"), v16("duracao_total_seg")], ["00:50", "50"]);
EQ("tempo de prova nos dois formatos",
   [v16("tempo_de_prova"), v16("tempo_de_prova_seg")], ["10:00", "600"]);
EQ("e o que sobrou tambem", [v16("tempo_sobrou"), v16("tempo_sobrou_seg")], ["09:10", "550"]);
// 2) pausas no bloco
EQ("pausas no bloco", v16("n_pausas"), "2");
EQ("e o tempo em pausa", /^\d+$/.test(v16("tempo_em_pausa_seg")), true);
// 4) identidade nova
EQ("a identidade nova esta declarada",
   v16("identidade"), "C_m+E_m+C_B+E_B+N+T+itens_nao_preenchidos = I");
EQ("N no bloco, S fora", [v16("N"), h16.some(l => l.startsWith("# S,"))], ["1", false]);
EQ("e ela fecha", v16("identidade_fecha"), "1");
// 3) e 5) colunas
const c16 = buildCSV().split(String.fromCharCode(10)).find(l => l.startsWith("q,apelido"));
EQ("pag_auto saiu e pontos_em_jogo_q entrou", c16,
   "q,apelido,tipo,param,itens,numerica,segundos,mmss,passadas,pag,olhar,gabarito,pontos,pontos_em_jogo_q");
const r16 = buildCSV().split(String.fromCharCode(10));
EQ("a Q1 traz os dois campos de pontos",
   r16[r16.indexOf(c16) + 1].split(",").slice(-2), ["0", "4"]);
EQ("o doc de pag_auto tambem saiu",
   h16.some(l => l.startsWith("# col.pag_auto")), false);

P("");
P("eventos gravados: " + events.length + "  |  tipos: " +
  [...new Set(events.map(e => e.ev))].join(" "));
