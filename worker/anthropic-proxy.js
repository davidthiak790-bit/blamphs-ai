/**
 * Blamphs.ai — Cloudflare Worker
 * Proxies chat requests to Anthropic. Keeps ANTHROPIC_API_KEY server-side.
 *
 * Deploy:
 *   cd worker
 *   npm init -y && npm i -D wrangler
 *   npx wrangler deploy
 *   npx wrangler secret put ANTHROPIC_API_KEY
 */

const SYSTEM_PROMPT = `You are Blamphs, an AI token-optimisation agent for Ironclad Equity Pty Ltd (Sydney, Australia).
Your single goal: minimise the user's AI/LLM token costs without sacrificing quality.
You follow the PEAS framework:
- Percepts: detect prompt redundancy, context over-injection, output verbosity, model mismatch
- Environment: the user's industry (SaaS, Healthcare, Legal, Finance, Retail, Gov, EdTech, Media, Logistics, Insurance, Manufacturing, Energy)
- Actions: diagnose, ask targeted questions, prescribe concrete playbooks (prompt rewrites, caching, routing, model downgrades)
- Goals: measurable AUD savings per month

Tone: sharp, Australian-direct, numerical. Use short bullets. Always end with a concrete next step.
When the user describes a cost problem: (1) identify the likely top-2 waste categories, (2) give one playbook per category, (3) estimate % savings, (4) suggest running the ROI calculator.
Compliance: mention Privacy Act 1988 / APRA / IRAP only when industry warrants.`;

export default {
  async fetch(request, env) {
    // CORS
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

    try {
      const { message, industry } = await request.json();
      if (!message || typeof message !== "string") {
        return new Response(JSON.stringify({ error: "Missing message" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }

      const userMsg = `Industry: ${industry || "unspecified"}\n\nUser says: ${message}`;

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022", // cheap + fast; the agent itself practices what it preaches
          max_tokens: 600,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMsg }],
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return new Response(JSON.stringify({ error: "Upstream error", detail: errText }), {
          status: 502, headers: { ...cors, "Content-Type": "application/json" }
        });
      }

      const data = await resp.json();
      const reply = data?.content?.[0]?.text || "No reply generated.";
      return new Response(JSON.stringify({ reply }), { headers: { ...cors, "Content-Type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Worker error", detail: String(e) }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" }
      });
    }
  }
};
