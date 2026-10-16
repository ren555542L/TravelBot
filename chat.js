/* ═══════════════════════════════════════════════
   WanderAI — Chat Engine v2
   Streaming SSE · Voice Input · Theme Toggle · GPT-4
   ═══════════════════════════════════════════════ */
'use strict';

// ── STATE ────────────────────────────────────────
const state = {
  apiKey:          '',
  model:           'gpt-4o-mini',
  temperature:     0.7,
  messages:        [],          // OpenAI message history [{role, content}]
  chatHistory:     [],          // Stored sessions [{id, title, msgs, ts}]
  currentChatId:   null,
  isLoading:       false,
  abortController: null,
  isRecording:     false,
  recognition:     null,
};

// System prompt — travel-focused persona
const SYSTEM_PROMPT = `You are WanderAI, a world-class AI travel assistant powered by GPT-4. You are knowledgeable, enthusiastic, and highly detailed. Your expertise includes:

🗺️ **Destination Guides**: Detailed information about cities, countries, landmarks, culture, and hidden gems
📅 **Itinerary Planning**: Day-by-day travel plans tailored to budget, interests, and travel style
💰 **Budget Advice**: Cost estimates, money-saving tips, best-value experiences
✈️ **Flights & Transport**: Tips on finding cheap flights, local transport, intercity travel
🏨 **Accommodation**: Hotels, hostels, Airbnbs — recommendations for every budget
🍽️ **Food & Dining**: Local cuisines, must-try dishes, restaurant recommendations
📋 **Visa & Entry**: Requirements, application processes, travel documents
🌤️ **Best Times to Visit**: Seasonal weather, festivals, peak vs. off-peak seasons
🔒 **Safety & Health**: Travel advisories, vaccinations, safety tips for solo travelers
🎒 **Packing Tips**: What to bring for different climates and activities

Always format your responses clearly using:
- **Bold** for key highlights
- Numbered lists for itineraries or steps
- Bullet points for tips or options
- Emojis to make it visually engaging
- Organized sections with headers when providing comprehensive guides

Be concise yet comprehensive. If the user asks a vague question, ask for clarification about their budget, travel dates, interests, or group size to give a more personalized answer.

IMPORTANT: Only answer travel-related questions. If asked about unrelated topics, politely redirect: "I'm specialized in travel guidance! Let me help you plan an amazing trip instead. 🌍"`;

// ── DOM REFERENCES ────────────────────────────────
const els = {
  chatMessages:    document.getElementById('chat-messages'),
  chatWelcome:     document.getElementById('chat-welcome'),
  chatInput:       document.getElementById('chat-input'),
  sendBtn:         document.getElementById('send-btn'),
  voiceBtn:        document.getElementById('voice-btn'),
  themeToggle:     document.getElementById('theme-toggle'),
  charCounter:     document.getElementById('char-counter'),
  apiKeyInput:     document.getElementById('api-key-input'),
  apiToggleVis:    document.getElementById('api-toggle-vis'),
  apiSaveBtn:      document.getElementById('api-save-btn'),
  apiKeyStatus:    document.getElementById('api-key-status'),
  sidebarChats:    document.getElementById('sidebar-chats'),
  newChatBtn:      document.getElementById('new-chat-btn'),
  clearBtn:        document.getElementById('clear-btn'),
  settingsBtn:     document.getElementById('settings-btn'),
  settingsModal:   document.getElementById('settings-modal'),
  modalClose:      document.getElementById('modal-close'),
  modalCancel:     document.getElementById('modal-cancel'),
  modalSave:       document.getElementById('modal-save'),
  modalApiKey:     document.getElementById('modal-api-key'),
  modalModel:      document.getElementById('modal-model'),
  modalTemp:       document.getElementById('modal-temp'),
  modelBadge:      document.getElementById('model-badge'),
  toastContainer:  document.getElementById('toast-container'),
  aiStatus:        document.getElementById('ai-status'),
};

// ── TOAST SYSTEM ─────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  els.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ── LOCAL STORAGE HELPER ─────────────────────────
const Storage = {
  get(key, fallback = null) {
    try {
      const item = localStorage.getItem(`wanderai_${key}`);
      return item !== null ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`wanderai_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  },
  remove(key) {
    localStorage.removeItem(`wanderai_${key}`);
  },
};

// ── THEME TOGGLE ─────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('wanderai_theme') || 'dark';
  if (saved === 'light') {
    document.body.classList.add('light');
    if (els.themeToggle) els.themeToggle.textContent = '☀️';
  } else {
    document.body.classList.remove('light');
    if (els.themeToggle) els.themeToggle.textContent = '🌙';
  }

  if (els.themeToggle) {
    els.themeToggle.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light');
      els.themeToggle.textContent = isLight ? '☀️' : '🌙';
      localStorage.setItem('wanderai_theme', isLight ? 'light' : 'dark');
    });
  }
}

// ── VOICE INPUT (Web Speech API) ──────────────────
function initVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (els.voiceBtn) {
      els.voiceBtn.title = 'Voice input not supported in this browser';
      els.voiceBtn.style.opacity = '0.4';
      els.voiceBtn.addEventListener('click', () => {
        showToast('Voice input is not supported in this browser. Try Chrome or Edge.', 'info');
      });
    }
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    state.isRecording = true;
    if (els.voiceBtn) {
      els.voiceBtn.classList.add('recording');
      els.voiceBtn.title = 'Listening... click to stop';
    }
    showToast('🎙️ Listening... Speak now', 'info', 2000);
  };

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }

    if (transcript.trim()) {
      const current = els.chatInput.value.trim();
      els.chatInput.value = current ? `${current} ${transcript}` : transcript;
      updateInputState();
    }
  };

  recognition.onerror = (event) => {
    console.warn('Speech recognition error:', event.error);
    stopRecording();
    if (event.error === 'not-allowed') {
      showToast('Microphone access denied. Please allow microphone permissions.', 'error');
    } else if (event.error !== 'no-speech') {
      showToast(`Voice error: ${event.error}`, 'error');
    }
  };

  recognition.onend = () => {
    stopRecording();
  };

  function stopRecording() {
    state.isRecording = false;
    if (els.voiceBtn) {
      els.voiceBtn.classList.remove('recording');
      els.voiceBtn.title = 'Voice input';
    }
  }

  if (els.voiceBtn) {
    els.voiceBtn.addEventListener('click', () => {
      if (state.isRecording) {
        recognition.stop();
        stopRecording();
      } else {
        try {
          recognition.start();
        } catch (err) {
          console.warn('Failed to start speech recognition:', err);
          stopRecording();
        }
      }
    });
  }

  state.recognition = recognition;
}

// ── INITIALIZATION ────────────────────────────────
function init() {
  initTheme();
  initVoiceInput();

  // Load persisted configuration
  state.apiKey      = Storage.get('apiKey', '');
  state.model       = Storage.get('model', 'gpt-4o-mini');
  state.temperature = Storage.get('temperature', 0.7);
  state.chatHistory = Storage.get('chatHistory', []);

  // Sync UI with state
  if (state.apiKey) {
    els.apiKeyInput.value = '•'.repeat(20);
    updateApiStatus(true);
  } else {
    updateApiStatus(false);
  }

  els.modelBadge.textContent = state.model;
  els.modalModel.value       = state.model;
  els.modalTemp.value        = String(state.temperature);

  renderSidebarHistory();
  startNewChat();

  // Check URL query parameters (e.g. from landing page search)
  const params = new URLSearchParams(window.location.search);
  const preloadQ = params.get('q');
  if (preloadQ) {
    const decoded = decodeURIComponent(preloadQ).trim();
    if (decoded) {
      setTimeout(() => sendMessage(decoded), 400);
    }
  }
}

// ── API KEY MANAGEMENT ────────────────────
function updateApiStatus(isSet) {
  if (isSet) {
    els.apiKeyStatus.textContent = '✅ Key saved';
    els.apiKeyStatus.className   = 'api-key-status set';
    els.aiStatus.innerHTML = `<div class="status-dot"></div>GPT-4 Online`;
  } else {
    els.apiKeyStatus.textContent = '⚠️ No key set';
    els.apiKeyStatus.className   = 'api-key-status error';
    els.aiStatus.innerHTML = `<div class="status-dot" style="background:#f59e0b;box-shadow:0 0 8px #f59e0b"></div>No API Key`;
  }
}

els.apiToggleVis.addEventListener('click', () => {
  const isPass = els.apiKeyInput.type === 'password';
  els.apiKeyInput.type = isPass ? 'text' : 'password';
  els.apiToggleVis.textContent = isPass ? '🔒' : '👁';
  if (state.apiKey && isPass) els.apiKeyInput.value = state.apiKey;
});

els.apiSaveBtn.addEventListener('click', saveApiKey);

function saveApiKey() {
  const raw = els.apiKeyInput.value.trim();
  if (!raw || raw === '•'.repeat(20)) {
    showToast('Please enter your OpenAI API key.', 'error');
    return;
  }
  if (!raw.startsWith('sk-')) {
    showToast('Invalid key format. OpenAI keys start with "sk-".', 'error');
    return;
  }
  state.apiKey = raw;
  Storage.set('apiKey', raw);
  els.apiKeyInput.value = '•'.repeat(20);
  els.apiKeyInput.type = 'password';
  els.apiToggleVis.textContent = '👁';
  updateApiStatus(true);
  showToast('✅ API key saved! You can start chatting.', 'success');
}

// ── SETTINGS MODAL ────────────────────────────────
els.settingsBtn.addEventListener('click', () => {
  if (state.apiKey) els.modalApiKey.value = state.apiKey;
  els.settingsModal.classList.add('open');
});
els.modalClose.addEventListener('click',  () => els.settingsModal.classList.remove('open'));
els.modalCancel.addEventListener('click', () => els.settingsModal.classList.remove('open'));
els.settingsModal.addEventListener('click', (e) => {
  if (e.target === els.settingsModal) els.settingsModal.classList.remove('open');
});

els.modalSave.addEventListener('click', () => {
  const key  = els.modalApiKey.value.trim();
  const mdl  = els.modalModel.value;
  const temp = parseFloat(els.modalTemp.value);

  if (key && key !== state.apiKey) {
    if (!key.startsWith('sk-')) {
      showToast('Invalid API key format. Must start with "sk-".', 'error');
      return;
    }
    state.apiKey = key;
    Storage.set('apiKey', key);
    els.apiKeyInput.value = '•'.repeat(20);
    updateApiStatus(true);
  }

  state.model       = mdl;
  state.temperature = temp;
  Storage.set('model', mdl);
  Storage.set('temperature', temp);
  els.modelBadge.textContent = mdl;
  els.modalModel.value       = mdl;

  els.settingsModal.classList.remove('open');
  showToast(`Settings saved! Using ${mdl}.`, 'success');
});

// ── CHAT HISTORY & SESSIONS ──────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function startNewChat() {
  state.messages      = [];
  state.currentChatId = generateId();
  els.chatMessages.innerHTML = '';
  els.chatWelcome.classList.remove('hidden');
  renderSidebarHistory();
}

function saveCurrentChat(title) {
  if (state.messages.length < 2) return;
  const existing = state.chatHistory.find(c => c.id === state.currentChatId);
  if (existing) {
    existing.msgs  = [...state.messages];
    existing.title = title || existing.title;
  } else {
    state.chatHistory.unshift({
      id:    state.currentChatId,
      title: title || 'Travel Chat',
      msgs:  [...state.messages],
      ts:    Date.now(),
    });
    if (state.chatHistory.length > 30) state.chatHistory.pop();
  }
  Storage.set('chatHistory', state.chatHistory);
  renderSidebarHistory();
}

function loadChat(id) {
  const chat = state.chatHistory.find(c => c.id === id);
  if (!chat) return;
  state.messages      = [...chat.msgs];
  state.currentChatId = id;
  els.chatMessages.innerHTML = '';
  els.chatWelcome.classList.add('hidden');

  chat.msgs.filter(m => m.role !== 'system').forEach(m => {
    renderMessage(m.content, m.role === 'user' ? 'user' : 'ai', false);
  });

  renderSidebarHistory();
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

function renderSidebarHistory() {
  els.sidebarChats.innerHTML = '';
  if (!state.chatHistory.length) {
    els.sidebarChats.innerHTML = '<p style="color:var(--text-dim);font-size:0.8rem;padding:0 12px;">No recent chats</p>';
    return;
  }
  state.chatHistory.slice(0, 20).forEach(chat => {
    const item = document.createElement('div');
    item.className = `chat-history-item${chat.id === state.currentChatId ? ' active' : ''}`;
    item.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      <span>${escapeHTML(chat.title)}</span>
    `;
    item.addEventListener('click', () => loadChat(chat.id));
    els.sidebarChats.appendChild(item);
  });
}

// ── TEXTAREA AUTO-RESIZE & COUNTER ───────────────
function updateInputState() {
  els.chatInput.style.height = 'auto';
  els.chatInput.style.height = Math.min(els.chatInput.scrollHeight, 180) + 'px';
  const len = els.chatInput.value.length;
  els.charCounter.textContent = `${len} / 4000`;
  els.charCounter.classList.toggle('warn', len > 3500);
  els.sendBtn.disabled = !els.chatInput.value.trim() || state.isLoading;
}

els.chatInput.addEventListener('input', updateInputState);

els.chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!els.sendBtn.disabled) triggerSend();
  }
});

els.sendBtn.addEventListener('click', triggerSend);

function triggerSend() {
  const msg = els.chatInput.value.trim();
  if (!msg || state.isLoading) return;
  sendMessage(msg);
  els.chatInput.value = '';
  els.chatInput.style.height = 'auto';
  els.charCounter.textContent = '0 / 4000';
  els.sendBtn.disabled = true;
}

// ── SUGGESTION CHIPS & PROMPTS ───────────────────
document.querySelectorAll('.suggestion-chip').forEach(chip => {
  chip.addEventListener('click', () => sendMessage(chip.dataset.msg));
});

document.querySelectorAll('.quick-prompt-item').forEach(item => {
  item.addEventListener('click', () => sendMessage(item.dataset.prompt));
});

// ── NEW CHAT / CLEAR ──────────────────────────────
els.newChatBtn.addEventListener('click', startNewChat);
els.clearBtn.addEventListener('click', () => {
  if (!state.messages.length) return;
  if (confirm('Clear this conversation? It will be saved in your history.')) {
    saveCurrentChat();
    startNewChat();
    showToast('Chat cleared. Starting fresh! 🌍', 'info');
  }
});

// ── MARKDOWN RENDERER ─────────────────────────────
function renderMarkdown(text) {
  let html = escapeHTML(text);

  // Fenced code blocks
  html = html.replace(/```([\s\S]*?)```/g, (_, code) =>
    `<pre><code>${code.trim()}</code></pre>`
  );
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h3>$1</h3>');
  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ol>${m}</ol>`);
  // Bullet lists
  html = html.replace(/^[-*•] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr />');
  // Paragraphs and breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br />');
  html = `<p>${html}</p>`;

  // Clean empty paragraphs and nested structure
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<(?:ul|ol|pre|h[1-6]|blockquote|hr)[^>]*>)/g, '$1');
  html = html.replace(/(<\/(?:ul|ol|pre|h[1-6]|blockquote|hr)>)<\/p>/g, '$1');

  // Clickable links [text](url)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  return html;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── RENDER MESSAGE ────────────────────────────────
function renderMessage(content, role, animate = true) {
  const isAI = role === 'ai';
  els.chatWelcome.classList.add('hidden');

  const msgEl = document.createElement('div');
  msgEl.className = `msg ${role}`;

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const avatarContent = isAI ? '✈' : 'You';

  msgEl.innerHTML = `
    <div class="msg-avatar">${avatarContent}</div>
    <div style="flex:1; max-width: 100%;">
      <div class="msg-bubble">${isAI ? renderMarkdown(content) : `<p>${escapeHTML(content)}</p>`}</div>
      <div class="msg-time">${now}</div>
      ${isAI ? `
        <div class="msg-actions">
          <button class="msg-action-btn copy-btn" title="Copy to clipboard">📋 Copy</button>
        </div>
      ` : ''}
    </div>
  `;

  if (!animate) msgEl.style.animation = 'none';

  const copyBtn = msgEl.querySelector('.copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => {
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
      });
    });
  }

  els.chatMessages.appendChild(msgEl);
  requestAnimationFrame(() => {
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  });

  return msgEl;
}

// ── STREAMING BUBBLE HELPER ───────────────────────
function createStreamingBubble() {
  els.chatWelcome.classList.add('hidden');

  const msgEl = document.createElement('div');
  msgEl.className = 'msg ai';

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  msgEl.innerHTML = `
    <div class="msg-avatar">✈</div>
    <div style="flex:1; max-width: 100%;">
      <div class="msg-bubble streaming-content"><span class="typing-dot" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--primary);"></span></div>
      <div class="msg-time">${now}</div>
      <div class="msg-actions" style="display:none;">
        <button class="msg-action-btn copy-btn" title="Copy to clipboard">📋 Copy</button>
      </div>
    </div>
  `;

  els.chatMessages.appendChild(msgEl);
  requestAnimationFrame(() => {
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  });

  const bubbleEl = msgEl.querySelector('.streaming-content');
  const actionsEl = msgEl.querySelector('.msg-actions');
  const copyBtn = msgEl.querySelector('.copy-btn');

  return {
    update(rawText) {
      bubbleEl.innerHTML = renderMarkdown(rawText);
      requestAnimationFrame(() => {
        els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
      });
    },
    finalize(finalText) {
      bubbleEl.innerHTML = renderMarkdown(finalText);
      actionsEl.style.display = 'flex';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(finalText).then(() => {
          copyBtn.textContent = '✅ Copied!';
          setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
        });
      });
      requestAnimationFrame(() => {
        els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
      });
    },
    remove() {
      msgEl.remove();
    }
  };
}

// ── SEND MESSAGE WITH STREAMING ───────────────────
async function sendMessage(userText) {
  if (!userText.trim() || state.isLoading) return;

  // Check API Key
  if (!state.apiKey) {
    renderMessage(userText, 'user');
    setTimeout(() => {
      const errorMsg = '⚠️ **No API Key Found**\n\nPlease add your OpenAI API key in the sidebar (bottom-left) or in Settings (⚙️).\n\nYou can generate an API key at [platform.openai.com](https://platform.openai.com/api-keys).';
      renderMessage(errorMsg, 'ai');
    }, 400);
    return;
  }

  // Append user message
  state.messages.push({ role: 'user', content: userText });
  renderMessage(userText, 'user');

  state.isLoading = true;
  els.sendBtn.disabled = true;
  state.abortController = new AbortController();

  let streamBubble = null;

  try {
    const payload = {
      model: state.model,
      temperature: state.temperature,
      max_tokens: 2048,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...state.messages,
      ],
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: state.abortController.signal,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg  = errData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new APIError(errMsg, response.status);
    }

    // Read SSE Stream
    streamBubble = createStreamingBubble();
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullAiText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.replace(/^data:\s*/, '');
        if (dataStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullAiText += delta;
            streamBubble.update(fullAiText);
          }
        } catch {
          // Ignore partial JSON parses across chunks
        }
      }
    }

    if (!fullAiText.trim()) {
      fullAiText = 'Sorry, I received an empty response. Please try again.';
    }

    streamBubble.finalize(fullAiText);
    state.messages.push({ role: 'assistant', content: fullAiText });

    // Auto-generate title from first user query
    if (state.messages.filter(m => m.role === 'user').length === 1) {
      const title = userText.slice(0, 48) + (userText.length > 48 ? '…' : '');
      saveCurrentChat(title);
    } else {
      saveCurrentChat();
    }

  } catch (err) {
    if (streamBubble) streamBubble.remove();

    if (err.name === 'AbortError') {
      showToast('Generation cancelled.', 'info');
      state.messages.pop();
      return;
    }

    let userMsg = '❌ **Something went wrong**\n\n';
    if (err instanceof APIError) {
      if (err.status === 401) {
        userMsg += 'Invalid API key. Please check your OpenAI API key in Settings.\n\nGet a key at [platform.openai.com](https://platform.openai.com/api-keys).';
        updateApiStatus(false);
      } else if (err.status === 429) {
        userMsg += "Rate limit reached. You've exceeded your OpenAI quota. Please check your [billing settings](https://platform.openai.com/account/billing).";
      } else if (err.status === 503 || err.status === 500) {
        userMsg += 'OpenAI servers are temporarily overloaded. Please try again in a moment.';
      } else {
        userMsg += `OpenAI Error: ${err.message}`;
      }
    } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      userMsg += 'Network error. Please check your internet connection and try again.';
    } else {
      userMsg += err.message || 'An unexpected error occurred. Please try again.';
    }

    renderMessage(userMsg, 'ai');
    state.messages.pop();

  } finally {
    state.isLoading = false;
    state.abortController = null;
    els.sendBtn.disabled = !els.chatInput.value.trim();
  }
}

// Custom error class
class APIError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

// ── KEYBOARD SHORTCUTS ────────────────────────────
document.addEventListener('keydown', (e) => {
  // Escape: Close modal or cancel current AI generation
  if (e.key === 'Escape') {
    els.settingsModal.classList.remove('open');
    if (state.isLoading && state.abortController) {
      state.abortController.abort();
    }
  }
  // Ctrl/Cmd + K: Focus chat input
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    els.chatInput.focus();
  }
  // Ctrl/Cmd + N: Start new chat
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    startNewChat();
  }
});

// ── FOCUS INPUT ON LOAD ───────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  els.chatInput.focus();
  init();
});

console.log('%c✈ WanderAI Chat Engine v2 Ready (Streaming + Voice + Theme)', 'color:#818cf8;font-size:14px;font-weight:bold;');
console.log('%cShortcuts: Enter (Send), Shift+Enter (Newline), Ctrl+K (Focus), Ctrl+N (New Chat), Esc (Cancel/Close)', 'color:#64748b;font-size:11px;');
