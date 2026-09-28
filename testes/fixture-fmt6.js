/* Gera a fixture de contrato do fmt6 (tests/fixtures/export-fmt6) rodando o app
   de verdade: uma sessão ANPEC com C/E e conta, tempo de prova que esgota, itens
   deixados por tempo com e sem palpite, e um erro de conta (para o B_erros).
   Não é teste: é o gerador. Roda por tests/fixtures/gera-fixture-fmt6.sh, que
   decodifica a saída. Os arquivos saem em hex para nenhum byte do CSV ser lido
   como palavra de falha pelo rodar.sh. */
Object.keys(localStorage).filter(k => k.startsWith("sessao:")).forEach(k => localStorage.removeItem(k));
idx = []; sid = null;
$("mData").value = "2026-09-28"; $("mData").dispatchEvent(new Event("change"));
$("mConc").value = "ANPEC"; $("mConc").dispatchEvent(new Event("change"));
$("tpl").value = "anpec"; $("tpl").dispatchEvent(new Event("change"));
$("mProva").value = "ANPEC 2019"; $("mProva").dispatchEvent(new Event("change"));
$("mMat").value = "Estatística"; $("mMat").dispatchEvent(new Event("change"));
$("mSub").value = "Inferência"; $("mSub").dispatchEvent(new Event("change"));
$("mFonte").value = "Prova ANPEC"; $("mFonte").dispatchEvent(new Event("change"));
$("nIn").value = "4"; $("limIn").value = "6"; $("goalIn").value = "";
$("startBtn").click();
const it = () => [...document.querySelectorAll("#answerArea .item")];
const op = (i, t) => [...it()[i].querySelectorAll(".opts button")].find(b => b.textContent === t).click();
const fl = (i, f) => [...it()[i].querySelectorAll(".flags button")].find(b => b.textContent === f).click();
const pad = t => [...document.querySelectorAll("#answerArea .numpad button")].find(b => b.textContent === t).click();
const cf = t => [...document.querySelectorAll("#answerArea .opts button")].find(b => b.textContent === t).click();
const tipo = t => document.querySelector('#typeRow button[data-t="' + t + '"]').click();

select(1); tipo("A"); adv(50000);
op(0, "Vc"); op(1, "F?"); op(2, "Vx"); fl(3, "B"); op(4, "F?"); fl(4, "B");
select(2); tipo("B"); adv(80000);
pad("1"); pad("7"); cf("c certeza");
select(3); tipo("A"); adv(90000);
op(0, "Fc"); fl(1, "T"); fl(2, "T"); op(3, "V?"); fl(4, "T");
select(4); tipo("B"); adv(20000);
[...document.querySelectorAll("#answerArea .flags button")].find(b => b.textContent === "T").click();
adv(120000); checaLimite();

// fase depois do relógio: palpite nos itens deixados por tempo
curQ = 3; renderQ(); op(1, "Vc"); op(2, "F?");
curQ = 4; renderQ(); pad("2"); pad("5"); cf("x chute");

openEnd();
olhar[3] = true;
openGab();
gab[1] = { itens: ["V", "F", "F", "V", "V"], num: "" };
gab[2] = { itens: [null], num: "18" };
gab[3] = { itens: ["F", "V", "V", "V", "X"], num: "" };
gab[4] = { itens: [null], num: "25" };

const hex = s => [...new TextEncoder().encode(s)].map(b => b.toString(16).padStart(2, "0")).join("");
const espera = ms => { const t = Date.now(); while (Date.now() - t < ms) {} };
const base = nomeBase();
[["", buildCSV], ["_estatisticas", buildEstat], ["_eventos", buildEventos], ["_dicionario", buildDic]]
  .forEach(([suf, f]) => { P("ARQ " + base + suf + ".csv " + hex("﻿" + f())); espera(7); });
