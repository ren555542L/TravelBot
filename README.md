# ✈️ WanderAI — Intelligent AI Travel Assistant

WanderAI is a modern, responsive, production-ready web application designed to help travelers discover destinations, generate custom day-by-day itineraries, check visa requirements, calculate budgets, and get real-time recommendations. Powered by OpenAI's GPT-4 models.

---

## 🌟 Key Features

### 1. 🌐 Landing Page (`index.html` & `landing.js`)
- **Immersive Visual Design**: Dynamic dark & light themes, glassmorphism aesthetics, responsive typography, and animated micro-interactions.
- **Hero Background Parallax**: Multi-layered depth effects with floating particle canvas simulation.
- **Interactive Itinerary Generator**: Real-time trip planner supporting destination, duration, budget, and travel style filters with instant preview cards.
- **Curated Destinations Grid**: Filter by region (Europe, Asia, Americas, Africa) with interactive explore actions that deep-link directly into the chat engine with pre-loaded prompts.
- **Reviews & Testimonials**: Dynamic rating cards and interactive review modal with localStorage persistence.
- **FAQ Accordion**: Smooth collapsible accordion covering travel planning questions.

### 2. 💬 Chat Application (`chat.html` & `chat.js`)
- **Server-Sent Events (SSE) Streaming**: Real-time token streaming directly from OpenAI's Chat Completions API with fluid typing animations.
- **Live Markdown Engine**: Formats headings, bulleted/numbered lists, bold/italics, blockquotes, code blocks, and active hyperlinks with safety sanitization.
- **🎙️ Web Speech API Voice Dictation**: Speech-to-text input with live recording indicators and pulse effects for hands-free query creation.
- **🌗 Persistent Theme Switcher**: Toggle between Dark and Light mode across all pages with state remembered via `localStorage`.
- **Multi-Session History**: Organize, switch, and persist previous chat sessions in the collapsible sidebar.
- **Settings & Model Customization**: Switch between `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, and `gpt-3.5-turbo`, adjust temperature (Conservative / Balanced / Creative), and manage API credentials.
- **Convenience Actions**: One-click copy-to-clipboard for all AI responses, suggestion chips, and quick-prompt templates.
- **Keyboard Shortcuts**:
  - `Enter`: Send message
  - `Shift + Enter`: Multi-line prompt newline
  - `Ctrl / Cmd + K`: Instant focus on chat input
  - `Ctrl / Cmd + N`: Create a new chat session
  - `Escape`: Close settings modal or cancel ongoing generation

---

## 📁 Project Structure

```text
nlpchatbot/
├── index.html       # Landing page structure, SEO meta tags, and semantic sections
├── landing.js       # Parallax, particles, itinerary previewer, theme toggle, and filters
├── style.css        # Design tokens, CSS variables, typography, and landing styles
├── chat.html        # Chat app interface, sidebar, settings modal, and input area
├── chat.js          # Chat engine v2 (SSE streaming, Web Speech API, session storage)
├── chat.css         # Chat layout, message bubbles, voice pulse animation, and theme overrides
├── hero-bg.jpg      # Hero section visual banner
├── scratchpad.md    # Active development notes and feature tracking
└── README.md        # Production documentation
```

---

## 🔑 How to Set Up Your OpenAI API Key

WanderAI connects directly to OpenAI's API. You have three flexible options to configure your key:

### Option A: Via Chat Sidebar (Recommended)
1. Open `chat.html` in your browser.
2. Look at the bottom-left sidebar under **"🔑 OpenAI API Key"**.
3. Paste your key (starts with `sk-...`).
4. Click **"Save Key"**.
5. *The key is securely stored in your browser's private `localStorage` (`wanderai_apiKey`) and persists across page reloads.*

### Option B: Via Settings Modal (⚙️)
1. In `chat.html`, click the **⚙️ (Settings)** icon in the top-right navbar.
2. Enter your OpenAI API key in the **OpenAI API Key** field.
3. Select your preferred default model and temperature style.
4. Click **"Save Settings"**.

### Option C: Pre-configuring a Default Key (Developer Mode)
If you want to bake in a default key for local testing without entering it in the UI, open `chat.js` and set the fallback in `state`:
```javascript
// chat.js Line 8
const state = {
  apiKey: Storage.get('apiKey', 'sk-your-actual-key-here'),
  // ...
};
```

> **Security Note**: Never commit actual API keys to public repositories or shared source control. For public enterprise deployments, route requests through a secure backend proxy (see [Production Deployment](#-production-deployment)).

---

## 🚀 Getting Started

### Local Development
No build tools, bundlers, or Node.js runtime required! WanderAI runs directly on standard vanilla web standards.

#### Using VS Code Live Server:
1. Open the project folder in VS Code.
2. Right-click `index.html` and select **"Open with Live Server"**.

#### Using Python:
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000` in your web browser.

#### Using Node `npx serve`:
```bash
npx serve .
```

---

## 🛡️ Production Deployment

### 1. Static Web Hosting
Because the project is entirely client-side, you can deploy it in seconds to:
- **GitHub Pages**: Push repository and enable Pages in repository settings.
- **Vercel**: Run `vercel` or connect your Git repo.
- **Netlify**: Drag-and-drop the folder or configure continuous deployment.
- **Cloudflare Pages**: Link repo with no build commands.

### 2. Enterprise Backend Proxy (Optional)
If deploying WanderAI for end users without asking them for individual API keys:
1. Create a lightweight serverless function (Next.js API route, Cloudflare Worker, or Express server).
2. Store your OpenAI API key securely in server environment variables (`OPENAI_API_KEY`).
3. Replace the `fetch('https://api.openai.com/v1/chat/completions')` endpoint in `chat.js` with your backend route `/api/chat`.
4. Add rate limiting, user authentication, and CORS headers.

---

## 🌐 Browser Compatibility

| Feature | Chrome / Edge | Safari | Firefox |
|---|---|---|---|
| Core Chat UI | ✅ Supported | ✅ Supported | ✅ Supported |
| SSE Streaming | ✅ Supported | ✅ Supported | ✅ Supported |
| Web Speech API (Voice) | ✅ Supported | ⚠️ Requires permissions | ⚠️ Flag required |
| Dark / Light Theme | ✅ Supported | ✅ Supported | ✅ Supported |
| LocalStorage Sessions | ✅ Supported | ✅ Supported | ✅ Supported |

---

## 📄 License
MIT License. Open source and free to use for personal and commercial applications.
