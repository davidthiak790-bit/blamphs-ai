/* Blamphs.ai — interactive demo logic
 * Phase 1: smart mock agent, runs entirely client-side.
 * Phase 2: flip USE_LIVE_API to true and set WORKER_URL to your Cloudflare Worker.
 */

const USE_LIVE_API = true; // wired to Cloudflare Worker
const WORKER_URL = "https://blamphs-anthropic-proxy.davidthiak790.workers.dev";

// ---------- ROI CALCULATOR ----------
const fmt = (n) => "A$" + Math.round(n).toLocaleString("en-AU");
const $ = (id) => document.getElementById(id);

function recomputeROI() {
  const spend = +$("roi-spend").value;
  const team = +$("roi-team").value;
  const eff = +$("roi-eff").value;

  $("roi-spend-val").textContent = fmt(spend);
  $("roi-team-val").textContent = team + " engineer" + (team === 1 ? "" : "s");
  $("roi-eff-val").textContent = eff + "%";

  // Savings model: gap from 90% efficient ceiling, scaled by spend, with team-size compounding
  const gap = Math.max(0, 0.9 - eff / 100);                 // headroom (0..0.8)
  const baseSavingsPctOfSpend = gap * 0.75;                  // realistically capture 75% of headroom
  const teamMultiplier = 1 + Math.min(0.25, (team - 1) * 0.005); // engineers compound the effect
  const monthly = spend * baseSavingsPctOfSpend * teamMultiplier;
  const annual = monthly * 12;

  // Pricing tier auto-detect
  const planCost = spend < 5000 ? 499 : spend < 50000 ? 1490 : 4500;
  const paybackDays = monthly > 0 ? Math.max(1, Math.round((planCost / monthly) * 30)) : 0;
  const threeYearROI = annual > 0 ? Math.round((annual * 3 - planCost * 36) / (planCost * 36) * 100) : 0;

  $("roi-monthly").textContent = fmt(monthly);
  $("roi-annual").textContent = fmt(annual);
  $("roi-annual2").textContent = fmt(annual);
  $("roi-payback").textContent = paybackDays > 0 ? paybackDays + " days" : "—";
  $("roi-3yr").textContent = threeYearROI > 0 ? threeYearROI + "%" : "—";
}

["roi-spend","roi-team","roi-eff"].forEach(id => $(id).addEventListener("input", recomputeROI));
recomputeROI();

// ---------- PERCEPTS PANEL ----------
function setPercepts({ redundancy = 0, context = 0, verbosity = 0, model = 0 }) {
  const set = (key, val) => {
    const v = Math.min(100, Math.max(0, Math.round(val)));
    $("p-" + key).textContent = v + "%";
    $("b-" + key).style.width = v + "%";
  };
  set("redundancy", redundancy);
  set("context", context);
  set("verbosity", verbosity);
  set("model", model);

  // Efficiency = inverse of average waste
  const avgWaste = (redundancy + context + verbosity + model) / 4;
  const score = Math.round(100 - avgWaste);
  $("eff-score").textContent = score;
  let label = "Excellent — minimal waste";
  if (score < 80) label = "Good — minor opportunities";
  if (score < 60) label = "Fair — significant savings available";
  if (score < 40) label = "Poor — urgent optimisation needed";
  if (score < 20) label = "Critical — burning money";
  $("eff-label").textContent = label;
}

// ---------- CHAT AGENT ----------
const chat = $("chat");
const input = $("chat-input");
const send = $("chat-send");
const industrySel = $("industry");

function addMsg(role, text) {
  const row = document.createElement("div");
  row.className = "msg-row " + role;
  const bubble = document.createElement("div");
  bubble.className = "bubble-" + role;
  bubble.innerHTML = text;
  row.appendChild(bubble);
  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;
  return bubble;
}

function thinking() {
  const row = document.createElement("div");
  row.className = "msg-row agent";
  const bubble = document.createElement("div");
  bubble.className = "bubble-agent thinking";
  bubble.textContent = "Analysing…";
  row.appendChild(bubble);
  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;
  return row;
}

// Smart mock — diagnoses based on keywords + industry context
function diagnose(userText, industry) {
  const t = userText.toLowerCase();
  const sym = {
    redundancy: 30 + Math.random() * 20,
    context: 30 + Math.random() * 20,
    verbosity: 30 + Math.random() * 20,
    model: 20 + Math.random() * 20,
  };

  // Keyword-driven percept boosts
  if (/system prompt|instructions|preamble/.test(t)) sym.redundancy += 30;
  if (/rag|retrieve|chunk|context|document/.test(t)) sym.context += 35;
  if (/long|verbose|wordy|paragraph|detail/.test(t)) sym.verbosity += 30;
  if (/gpt-?4|opus|claude-3-opus|expensive|premium/.test(t)) sym.model += 35;
  if (/support|chat|bot|customer/.test(t)) { sym.redundancy += 15; sym.verbosity += 10; }
  if (/summari[sz]e|extract|classify/.test(t)) sym.model += 20;
  if (/agent|tool|function/.test(t)) { sym.context += 15; sym.redundancy += 10; }

  Object.keys(sym).forEach(k => sym[k] = Math.min(95, sym[k]));
  setPercepts(sym);

  // Industry flavour
  const industryNotes = {
    saas: "multi-tenant prompt sharding + per-tenant cache",
    healthcare: "PHI-safe redaction before external calls + on-prem inference for triage",
    legal: "citation cache + statute lookup via embeddings (skip context bloat)",
    finance: "deterministic JSON-mode for trades + APRA-safe audit log",
    retail: "catalog dedup via product-id keying + Haiku for short-form recs",
    gov: "IRAP-aligned routing + Sydney-region inference",
    edtech: "cohort-level prompt cache (one prep, thousand students)",
    media: "long-context budgeting + Haiku/Mini for headline generation",
    logistics: "structured outputs for routing + tiny model for status updates",
    insurance: "claim-summary cache + extractive summaries (no rewrites)",
    manufacturing: "spec-extraction with grammar-guided decoding + cache by SKU",
    energy: "telemetry compression + window-based inference",
  };
  const industryFix = industryNotes[industry] || "vertical-specific routing";

  // Top recommendation
  const fixes = [];
  const ranked = Object.entries(sym).sort((a,b)=>b[1]-a[1]);
  for (const [k, v] of ranked) {
    if (v < 50) continue;
    if (k === "redundancy") fixes.push("✂️ <b>Strip system prompt boilerplate</b> — your prompts likely have ~30-40% repeated scaffolding. Cache the static portion server-side.");
    if (k === "context") fixes.push("📦 <b>Switch from full-doc to top-k RAG</b> — ship 2-4 chunks, not the whole knowledge base. Typical 60% input-token reduction.");
    if (k === "verbosity") fixes.push("📝 <b>Force concise outputs</b> — add <code>max_tokens</code> caps + an output-style instruction. Cuts output cost 40-55%.");
    if (k === "model") fixes.push("🎯 <b>Route by complexity</b> — send 70% of traffic to Haiku/Mini, escalate only when confidence drops. 5-8x cost cut.");
  }
  if (fixes.length === 0) fixes.push("✅ Your usage looks healthy. Want a deeper audit on caching strategy?");

  // Estimated savings
  const wasteAvg = (sym.redundancy + sym.context + sym.verbosity + sym.model) / 4;
  const savePct = Math.round(wasteAvg * 0.7);

  return `
<b>Diagnosis</b> · ${industry.toUpperCase()} environment<br/>
I see <b>${savePct}% waste</b> in this pattern. Top issues:
<ul style="margin:8px 0 0 16px;list-style:disc">
${fixes.slice(0,3).map(f=>`<li style="margin:4px 0">${f}</li>`).join("")}
</ul>
<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(5,13,26,0.2)">
<b>Vertical playbook:</b> ${industryFix}
</div>
<div style="margin-top:8px;font-size:12px;opacity:0.8">Run the ROI calculator below to see what this means in AUD →</div>
  `;
}

const greeting = `👋 G'day. I'm the Blamphs agent. Tell me about your AI cost problem — what model, what use case, rough monthly spend. I'll diagnose the waste and prescribe fixes.<br/><br/><i>Try: "Our customer support bot uses GPT-4 and costs A$22k/month"</i>`;
addMsg("agent", greeting);

async function handleSend() {
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  addMsg("user", text.replace(/</g,"&lt;"));
  const t = thinking();

  try {
    let reply;
    if (USE_LIVE_API) {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, industry: industrySel.value })
      });
      const data = await res.json();
      reply = data.reply || "Sorry, the agent backend is temporarily unavailable.";
      // Live mode: still show some percepts heuristic
      diagnose(text, industrySel.value);
    } else {
      await new Promise(r => setTimeout(r, 700 + Math.random() * 800));
      reply = diagnose(text, industrySel.value);
    }
    t.remove();
    addMsg("agent", reply);
  } catch (e) {
    t.remove();
    addMsg("agent", "⚠️ Connection issue. Try again in a moment.");
    console.error(e);
  }
}

send.addEventListener("click", handleSend);
input.addEventListener("keydown", (e) => { if (e.key === "Enter") handleSend(); });
