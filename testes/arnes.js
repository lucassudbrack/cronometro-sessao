// Monta um arnês: o index.html inteiro + um script que dirige um cenário
// com performance.now() controlado, e despeja o resultado num <pre>.
const fs = require("fs"), path = require("path");
const src = process.argv[2], scen = process.argv[3], out = process.argv[4];

const app = fs.readFileSync(src, "utf8");
const body = fs.readFileSync(scen, "utf8");

const pre = `
<pre id="OUT" style="all:initial;display:block;white-space:pre-wrap;font:12px monospace"></pre>
<script>
// Relógio de mentira, instalado antes de qualquer coisa rodar de verdade.
window.__t = 0;
performance.now = () => window.__t;
window.adv = ms => { window.__t += ms; };
// Sem download real no headless.
window.__files = [];
window.__lines = [];
// Escreve a cada linha: se o cenario travar num await, o relatorio mostra
// ate onde foi em vez de sair vazio.
window.P = (...a) => { window.__lines.push(a.join(" "));
  const o=document.getElementById("OUT"); if(o) o.textContent=window.__lines.join(String.fromCharCode(10)); };
window.addEventListener("unhandledrejection", e =>
  window.P("PROMESSA REJEITADA: " + (e.reason && (e.reason.stack||e.reason.message) || e.reason)));
// O headless descarta dialogos, o que responderia "nao" a todo confirm().
// Aqui o cenario controla a resposta e pode testar os dois lados.
window.__confirmYes = true;
window.confirm = () => window.__confirmYes;
window.__fails = 0;
window.EQ = (nome, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) window.__fails++;
  window.P((ok ? "ok   " : "FALHA") + "  " + nome + (ok ? "" : "\\n         obtido: " + JSON.stringify(got) + "\\n         esperado: " + JSON.stringify(want)));
};
window.NEAR = (nome, got, want, tol) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) window.__fails++;
  window.P((ok ? "ok   " : "FALHA") + "  " + nome + (ok ? "" : "  obtido " + got + ", esperado ~" + want));
};
window.onerror = (m, f, l) => { window.P("ERRO DE EXECUCAO: " + m + " @linha " + l); window.__fails++; };
</script>
`;

const runner = `
<script>
window.__dl_orig = window.dl;
window.dl = (name, txt) => window.__files.push({ name, txt });
(async function(){
try {
${body}
} catch (e) {
  P("EXCECAO NO CENARIO: " + (e && e.stack || e));
  window.__fails++;
}
P("");
P(window.__fails ? ("=== " + window.__fails + " FALHA(S) ===") : "=== TUDO OK ===");
document.getElementById("OUT").textContent = window.__lines.join("\\n");
})();
</script>
`;

fs.writeFileSync(out, pre + app + runner);
console.log("arnês:", out);
