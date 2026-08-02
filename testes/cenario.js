/* ---- cenário 1: tempo acumulado com revisita ---- */
$("nIn").value = "4";
$("goalIn").value = "2";
$("tagIn").value = "teste, com virgula";
$("startBtn").click();
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
ans[1].itens[3] = { r: "-", c: null, B: false, T: false };
ans[1].itens[4] = { r: "F", c: "x", B: true, T: false };
EQ("string de itens do brief",
   ans[1].itens.map(itemStr).join(" "), "Vc F? Vc - FxB");
EQ("branco nao vira flag B", itemStr({ r: "-", c: null, B: false, T: false }), "-");
EQ("B sobre resposta, nao no lugar", itemStr({ r: "V", c: "c", B: true, T: false }), "VcB");
EQ("item nao respondido sai vazio", itemStr({ r: null, c: null, B: false, T: false }), "");
EQ("T acumula com B", itemStr({ r: "A", c: "x", B: true, T: true }), "AxBT");

/* ---- tipo B ---- */
ans[2] = blankAns("B"); ans[2].num = "042"; ans[2].itens[0].r = "042"; ans[2].itens[0].c = "?";

/* ---- pag ---- */
curQ = 3; setPag("7-8"); EQ("pag aceita intervalo", pags[3], "7-8");
curQ = 4; $("pagSame").click(); EQ("pag repete a anterior preenchida", pags[4], "7-8");
curQ = 3; setPag("");   EQ("pag vazia some do mapa", pags[3], undefined);

/* ---- ficha e olhar ---- */
$("expBtn").click();
EQ("fechar para o cronometro", running, false);
EQ("folha de fechamento abriu", $("endSheet").classList.contains("hide"), false);
$("mMat").value = "Estatística"; $("mMat").dispatchEvent(new Event("change"));
$("mFonte").value = "ANPEC 2014"; $("mFonte").dispatchEvent(new Event("change"));
$("mItensCalc").click();
EQ("itens do set = 5 (tipo A) + 1 (tipo B)", ficha.itens, "6");
$("olharGrid").children[0].click();
$("olharGrid").children[2].click();
EQ("olhar registrado", olharList(), [1, 3]);

/* ---- cenário 3: conferência ---- */
const pend = pendencias();
const txt = q => pend.filter(p => p.q === q).map(p => p.tipo + ":" + p.txt);
EQ("Q1 completa (o item 4 esta em branco de proposito), so falta a pagina",
   txt(1), ["aviso:sem página do caderno"]);
EQ("Q3 nao tem tipo e nao tem pagina",
   txt(3), ["falta:sem tipo escolhido", "aviso:sem página do caderno"]);
EQ("Q4 so tem tempo e pagina", txt(4), ["falta:sem tipo escolhido"]);
EQ("Q2 tipo B esta completa", txt(2), ["aviso:sem página do caderno"]);
EQ("contagem de faltas", contaFaltas(), 2);

// tipo B com número mas sem confiança é falta — o numpad deixa sair assim
const cSave = ans[2].itens[0].c; ans[2].itens[0].c = null;
EQ("tipo B sem confianca vira falta",
   pendencias().filter(p => p.q === 2 && p.tipo === "falta").map(p => p.txt),
   ["sem confiança"]);
ans[2].itens[0].c = cSave;

// tipo A com resposta e sem confiança
ans[1].itens[2] = { r: "V", c: null, B: false, T: false };
EQ("tipo A sem confianca vira falta",
   pendencias().filter(p => p.q === 1 && p.tipo === "falta").map(p => p.txt),
   ["1 item sem confiança"]);
ans[1].itens[2] = { r: "V", c: "c", B: false, T: false };

/* ---- corrigir depois nao pode virar passada ---- */
const passesAntes = passes(1), logAntes = log.length, tAntes = times[1], visitAntes = visit;
$("endRev").click();
EQ("conferencia abriu", $("paneRev").classList.contains("on"), true);
EQ("modo conferencia ligado", revisando, true);
const rotulos = () => [...$("revList").children].map(r => r.querySelector(".qq").textContent);
EQ("faltas primeiro, avisos depois", rotulos().slice(0, 2), ["Q3", "Q4"]);
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
const cols = csv.find(l => l.startsWith("q,tipo"));
const rows = csv.slice(csv.indexOf(cols) + 1);
EQ("um unico cabecalho de colunas", csv.filter(l => l.startsWith("q,tipo")).length, 1);
EQ("nenhuma linha antes do bloco de comentario", csv[0].startsWith("#"), true);
EQ("colunas", cols, "q,tipo,param,itens,numerica,segundos,mmss,passadas,pag,olhar");
EQ("rotulo com virgula fica citado",
   head.find(l => l.startsWith("# rotulo")), '# rotulo,"teste, com virgula"');
EQ("materia no bloco", head.find(l => l.startsWith("# materia")), "# materia,Estatística");
EQ("linha da Q1", rows[0], '1,A,5,"Vc F? Vc - FxB",,90,01:30,3,,1');
EQ("linha da Q2 tipo B", rows[1], '2,B,3,"?",042,30,00:30,1,,');
EQ("linha da Q3", rows[2], '3,,,"",,15,00:15,1,,1');
EQ("linha da Q4 com pagina", rows[3], '4,,,"",,50,00:50,1,7-8,');
EQ("duracao total no bloco",
   head.find(l => l.startsWith("# duracao_total")), "# duracao_total,03:05");
EQ("Q3 fechada quando o fechamento parou o cronometro", Math.round(times[3]), 15);

/* ---- JSONL ---- */
const jl = buildJSONL().split("\n").map(JSON.parse);
EQ("primeira linha e meta", jl[0].ev, "meta");
EQ("meta leva materia", jl[0].materia, "Estatística");
EQ("meta leva olhar", jl[0].olhar, [1, 3]);
EQ("meta leva pags", jl[0].pags, { 4: "7-8" });
const ts = jl.slice(1).map(r => r.t);
EQ("resto do arquivo em ordem cronologica",
   ts.slice().sort().join("|") === ts.join("|"), true);
EQ("passadas fechadas no arquivo", jl.filter(r => r.ev === "passada").length, 6);
EQ("o log distingue correcao de marcacao sob relogio",
   jl.filter(r => r.ev === "mark" && r.rev).length, 1);
/* ---- cenário 4: crash e retomada de ponta a ponta ---- */
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
const jl2 = buildJSONL().split("\n").map(JSON.parse);
EQ("a passada truncada sai marcada no jsonl",
   jl2.filter(r => r.ev === "passada" && r.truncada).length, 1);
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
EQ("na hora: nao entra na contagem de julgaveis do set", itensDoSet(), 0);

clicaNum("paramRow", 3);
EQ("escolheu 3 itens", ans[1].itens.length, 3);
EQ("a folha abriu com 3 itens", botoes("#answerArea .item").length, 3);
EQ("agora conta 3 julgaveis", itensDoSet(), 3);
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
const cols5 = csv5.find(l => l.startsWith("q,tipo"));
const r5 = csv5.slice(csv5.indexOf(cols5) + 1);
EQ("param por questao no CSV", r5.slice(0, 3).map(l => l.split(",").slice(0, 3).join("|")),
   ["1|A|2", "2|ME|3", "3|B|2"]);
EQ("o bloco declara o eixo em aberto",
   csv5.find(l => l.startsWith("# ce_itens")), "# ce_itens,na hora");

P("");
P("eventos gravados: " + events.length + "  |  tipos: " +
  [...new Set(events.map(e => e.ev))].join(" "));
