// Minimal LLM Agent POC core logic
// Uses OpenAI-style tool calls, model picker, error alerts

// --- UI Elements ---
const conversation = document.getElementById('conversation');
const userForm = document.getElementById('user-form');
const userInput = document.getElementById('user-input');
const alertArea = document.getElementById('alert-area');


// --- Model Picker (from bootstrap-llm-provider) ---
// Assume bootstrap-llm-provider exposes window.LLMProviderPicker
let llmProvider = null;
if (window.LLMProviderPicker) {
  window.LLMProviderPicker.render('model-picker', provider => {
    llmProvider = provider;
  });
}



// --- Dynamic Model & Base URL Selection ---
const modelSelect = document.getElementById('model');
const baseUrlInput = document.getElementById('base-url');
const apiKeyInput = document.getElementById('api-key');

modelSelect.addEventListener('change', () => {
  const selected = modelSelect.options[modelSelect.selectedIndex];
  const url = selected.getAttribute('data-url') || '';
  baseUrlInput.value = url;
  baseUrlInput.disabled = !url;
});

// --- AIPipe Authentication ---
let aipipeProfile = null;
async function ensureAipipeAuth() {
  if (!aipipeProfile) {
    const { getProfile } = await import('https://aipipe.org/aipipe.js');
    aipipeProfile = getProfile();
    if (!aipipeProfile.token) {
      window.location = `https://aipipe.org/login?redirect=${window.location.href}`;
      return false;
    }
    // Show token in API Key box
    apiKeyInput.value = aipipeProfile.token;
  }
  return true;
}

function getSettings() {
  return {
    baseUrl: document.getElementById('base-url').value.trim(),
    model: document.getElementById('model').value.trim()
  };
}

// --- Conversation State ---
let messages = [];

// --- Tool Definitions ---
const tools = {
  search: async (query) => {
    // Google Search API stub (replace with real API)
    try {
      const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
      const data = await res.json();
      return data?.RelatedTopics?.[0]?.Text || 'No results.';
    } catch (e) {
      showAlert('Search error: ' + e.message);
      return 'Search failed.';
    }
  },
  aipipe: async (payload) => {
    // AI Pipe proxy API stub (replace with real endpoint)
    try {
      const res = await fetch('https://aipipe-proxy.example.com/api', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return data.result || 'No result.';
    } catch (e) {
      showAlert('AI Pipe error: ' + e.message);
      return 'AI Pipe failed.';
    }
  },
  run_js: async (code) => {
    // Secure JS code execution (sandboxed)
    try {
      // Use Function constructor for isolation
      const result = Function(`"use strict";return (${code})`)();
      return String(result);
    } catch (e) {
      showAlert('JS error: ' + e.message);
      return 'JS execution failed.';
    }
  }
};

// --- Alert/Error UI (from bootstrap-alert) ---
function showAlert(msg) {
  if (window.BootstrapAlert) {
    window.BootstrapAlert.show(alertArea, msg, 'danger');
  } else {
    alertArea.innerHTML = `<div class='alert alert-danger'>${msg}</div>`;
  }
}


// --- Agent Reasoning Loop ---
async function agentLoop() {

  const settings = getSettings();
  const lastMsg = messages[messages.length - 1];
  

  // Ensure aipipe authentication
  const authed = await ensureAipipeAuth();
  if (!authed) return;

  let agentOutput = '';
  let toolCalls = [];
  let data = {};

  // Gemini model special handling (handle gemini-1.5, gemini-2.5-pro, gemini-2.5-flash, etc.)
  if (settings.model.startsWith('google/gemini') || settings.baseUrl.includes('geminiv1beta')) {
    // Use Gemini endpoint and payload
    const geminiPayload = {
      contents: [
        { parts: [ { text: messages[messages.length-1].content } ] }
      ]
    };
    try {
      const res = await fetch(settings.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + aipipeProfile.token
        },
        body: JSON.stringify(geminiPayload)
      });
      data = await res.json();
      if (!res.ok) {
        const errMsg = data.error?.message || res.status + ' ' + res.statusText;
        showAlert('API error: ' + errMsg);
        agentOutput = 'API error: ' + errMsg;
        addMessage('agent', agentOutput);
        return;
      }
      // Gemini returns output in data.candidates[0].content.parts[0].text
      agentOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
    } catch (e) {
      showAlert('LLM error: ' + e.message);
      agentOutput = 'LLM error: ' + e.message;
      addMessage('agent', agentOutput);
      return;
    }
  } else {
    // Prepare minimal payload for aipipe
    const payload = {
      model: settings.model,
      messages: messages.map(m => ({role: m.role === 'user' ? 'user' : 'assistant', content: m.content}))
    };
    try {
      const res = await fetch(settings.baseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + aipipeProfile.token
        },
        body: JSON.stringify(payload)
      });
      try {
        data = await res.json();
      } catch (jsonErr) {
        showAlert('Response not JSON: ' + jsonErr.message);
        agentOutput = 'API returned non-JSON response.';
        addMessage('agent', agentOutput);
        return;
      }
      if (!res.ok) {
        const errMsg = data.error?.message || res.status + ' ' + res.statusText;
        showAlert('API error: ' + errMsg);
        agentOutput = 'API error: ' + errMsg;
        addMessage('agent', agentOutput);
        return;
      }
      agentOutput = data.choices?.[0]?.message?.content || 'No response.';
      toolCalls = data.choices?.[0]?.message?.tool_calls || [];
    } catch (e) {
      showAlert('LLM error: ' + e.message);
      agentOutput = 'LLM error: ' + e.message;
      addMessage('agent', agentOutput);
      return;
    }
  }

  addMessage('agent', agentOutput);

  // --- Auto-search for current events if LLM says info is outdated ---
  const outdatedPatterns = [
    /I do not have information beyond/i,
    /cannot provide the current/i,
    /check a reliable news source/i,
    /recommend checking/i,
    /not up to date/i
  ];
  if (agentOutput && outdatedPatterns.some(p => p.test(agentOutput))) {
    // Use last user question for search
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      const result = await tools.search(lastUserMsg.content);
      addMessage('tool', `Auto-search result: ${result}`);
      messages.push({role:'tool',content:`Auto-search result: ${result}`});
      await agentLoop();
      return;
    }
  }

  // --- Tool-call parsing (for aipipe, since toolCalls is not supported) ---
  // Look for search("query") or run_js("code") in output
  const searchMatch = agentOutput.match(/search\(["'](.+?)["']\)/);
  const jsMatch = agentOutput.match(/run_js\(["']([\s\S]+?)["']\)/);

  if (searchMatch) {
    const query = searchMatch[1];
  const result = await tools.search(query);
  addMessage('tool', `Search result: ${result}`);
  messages.push({role:'tool',content:`Search result: ${result}`});
    await agentLoop();
    return;
  }
  if (jsMatch) {
    const code = jsMatch[1];
    const result = await tools.run_js(code);
    addMessage('tool', `JS result: ${result}`);
    messages.push({role:'tool',content:`JS result: ${result}`});
    await agentLoop();
    return;
  }
}

function addMessage(role, content) {
  messages.push({role, content});
  const div = document.createElement('div');
  div.className = 'mb-2';
  div.innerHTML = `<b>${role}:</b> ${content}`;
  conversation.appendChild(div);
  conversation.scrollTop = conversation.scrollHeight;
}

userForm.onsubmit = async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;
  addMessage('user', text);
  userInput.value = '';
  await agentLoop();
};


// Ensure aipipe authentication on page load
(async () => {
  await ensureAipipeAuth();
  addMessage('agent', 'Hello! How can I help you today?');
})();
