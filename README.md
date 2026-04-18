# Blamphs.ai — AI Token Optimisation Platform

Production-ready landing page + live interactive demo for **Ironclad Equity Pty Ltd** (ABN: 79 683 225 854).

## Stack
- Plain HTML/CSS/JS (Tailwind via CDN)
- Cloudflare Pages (static hosting on www.blamphs.ai)
- Cloudflare Worker (Anthropic API proxy — Phase 2)

## Files
- `index.html` — Landing page + live demo
- `assets/app.js` — Demo logic (chat agent, ROI calc, dashboard)
- `assets/styles.css` — Custom CSS overlays on Tailwind
- `worker/anthropic-proxy.js` — Cloudflare Worker that proxies chat to Anthropic
- `_headers` — Cloudflare Pages security headers
- `_redirects` — Apex → www redirect

## Deploy

### 1. Cloudflare Pages
```bash
# In Cloudflare dashboard:
# Pages → Create project → Direct upload (or connect Git repo)
# Build output dir: / (root)
# Custom domain: www.blamphs.ai
```

### 2. Anthropic Worker (when you have an API key)
1. Get key: https://console.anthropic.com → Settings → API Keys
2. Deploy worker:
   ```bash
   cd worker
   npx wrangler deploy
   npx wrangler secret put ANTHROPIC_API_KEY
   ```
3. Update `assets/app.js` → set `WORKER_URL` to your worker URL
4. Set `USE_LIVE_API = true`

## Brand
- Deep navy `#0A1628` + electric green `#00FF88` ("money saved")
- Inter font
