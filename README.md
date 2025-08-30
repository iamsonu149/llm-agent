# LLM Agent — Proof of Concept

A minimal, hackable browser-based LLM agent that demonstrates a reasoning loop: accepts user input, queries an LLM, and conditionally invokes simple tools (search, sandboxed JS, AI Pipe proxy). It is intended as a starting point for experimentation and deployment as static files or a tiny Flask app.

Key features
- Browser UI with a model picker and simple conversation view
- Support for OpenAI-compatible endpoints and AIPipe/Gemini generateContent endpoints
- Small set of built-in tools: search (DuckDuckGo), run_js (sandboxed), and an aipipe helper
- Lightweight codebase: `index.html`, `agent.js` and optional `app.py` for serving

Quick start (static)
1. Open the folder `llm_agent` in your browser (double-click `index.html`) or serve it with a static server.

Quick start (recommended: local dev server using Python)
1. Open PowerShell and change into the folder:

```powershell
cd llm_agent
```

2. (Optional, recommended) create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

3. Run the tiny Flask server (if you want a backend for deployment testing):

```powershell
python app.py
```

Then open http://127.0.0.1:5000/ in your browser.

Files
- `index.html` — main UI, model picker, conversation area
- `agent.js` — core agent loop, model selection logic, tool implementations
- `bootstrap-llm-provider.js` — model-picker helper (UI)
- `bootstrap-alert.js` — alert helper for errors/messages
- `app.py` — tiny Flask static server (optional for platforms like Railway)

Configuration & usage notes
- Model picker: choose a model from the dropdown. The picker will set the `Base URL` for API calls when available.
- AIPipe login: the page attempts to auto-load `https://aipipe.org/aipipe.js` and will redirect to the aipipe login when a token is required. After login the token is shown in the `API Key` field.
- Gemini models: the agent detects Gemini generateContent base URLs (contains `geminiv1beta`) and issues the generateContent-style payload. Other models are sent to the OpenAI-style `/chat/completions` endpoint.

Extending the agent
- Add tools: extend the `tools` object in `agent.js` with async functions that return strings. Tools are simple and synchronous-friendly for the POC.
- Add models/providers: update the model `<select>` in `index.html` with new `data-url` values. Ensure the payload shape matches the endpoint.

Debugging & troubleshooting
- If you get HTTP 400 from aipipe/gemini endpoints: open DevTools → Network → inspect the request body and the response JSON. Common causes:
  - Wrong endpoint (OpenAI-style vs Gemini generateContent) — ensure the model's `data-url` points at the correct path.
  - Invalid/expired token — re-login at https://aipipe.org/login and refresh the page.
  - Endpoint expects additional fields (e.g., `temperature`) — adjust `agent.js` payload accordingly.
- If the page shows no token in the API key field: ensure popups/redirects are allowed and that `aipipe.org` can be reached from your machine.

Security
- This is a development POC. Do not use it with secret keys in untrusted environments. The `run_js` tool executes code via the Function constructor; keep that usage under control and avoid exposing the page to untrusted inputs.

Deployment suggestions
- Static hosting (GitHub Pages, Netlify, Vercel): push the `llm_agent` folder and configure static hosting.
- Railway/Heroku: use `app.py` as a tiny Flask app that serves the static folder; ensure you set environment variables or provide a safe way for users to supply API keys/tokens.

Contribution and license
- This repo is a small demo. Feel free to open issues or PRs for improvements. Include tests or a quick demo page when adding features.

Contact / Next steps
- If you want, I can:
  - Add a `requirements.txt` and a one-command dev task
  - Add example environment variables and a safe server-side proxy for keys
  - Improve payload handling for Gemini variants (temperature, system prompts)
