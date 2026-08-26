/**
 * Popup Script for Jarvis Assistant Extension
 * Full-featured controller: Auth, Tab Context, Voice/Text Commands, Action Chips, TTS, and Copying.
 */

const GATEWAY_URL = 'http://localhost:5000';

let currentTabContext = null;
let isRecording = false;
let isSpeaking = false;
let isTtsEnabled = true;
let recognition = null;
let micStream = null;
let lastResponseText = '';

// ─── Token & View Helpers ───────────────────────────────────────────────────

function showAppView() {
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('appView').style.display = 'flex';
}

function showLoginView() {
  document.getElementById('loginView').style.display = 'flex';
  document.getElementById('appView').style.display = 'none';
}

function getStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['accessToken'], (res) => resolve(res.accessToken || null));
  });
}

function storeToken(token) {
  return new Promise((resolve) => chrome.storage.local.set({ accessToken: token }, resolve));
}

function clearToken() {
  return new Promise((resolve) => chrome.storage.local.remove(['accessToken'], resolve));
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const existingToken = await getStoredToken();
  if (existingToken) {
    showAppView();
    initAppView();
  } else {
    showLoginView();
    initLoginView();
  }
});

// ─── Login Screen ────────────────────────────────────────────────────────────

function initLoginView() {
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');

  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    loginBtn.disabled = true;
    loginBtn.querySelector('.btn-text').textContent = 'Connecting...';
    loginError.textContent = '';

    try {
      const resp = await fetch(`${GATEWAY_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await resp.json();

      // Check backend contract: data.session.accessToken or fallback
      const token = data.session?.accessToken || data.accessToken || data.token;

      if (!resp.ok || !token) {
        const errorMsg = data.status?.message || data.message || data.error || 'Invalid credentials';
        loginError.textContent = errorMsg;
        loginBtn.disabled = false;
        loginBtn.querySelector('.btn-text').textContent = 'Sign In';
        return;
      }

      await storeToken(token);
      showAppView();
      initAppView();

    } catch (err) {
      loginError.textContent = `Could not reach Gateway at ${GATEWAY_URL}. Is backend running?`;
      loginBtn.disabled = false;
      loginBtn.querySelector('.btn-text').textContent = 'Sign In';
    }
  };
}

// ─── App Screen ──────────────────────────────────────────────────────────────

function initAppView() {
  const pageTitleEl = document.getElementById('pageTitle');
  const selectionBadge = document.getElementById('selectionBadge');
  const chipSummarize = document.getElementById('chipSummarize');
  const chipTakeaways = document.getElementById('chipTakeaways');
  const chipSelection = document.getElementById('chipSelection');
  const chipTime = document.getElementById('chipTime');
  const btnMic = document.getElementById('btnMic');
  const btnSend = document.getElementById('btnSend');
  const btnClear = document.getElementById('btnClear');
  const btnCopy = document.getElementById('btnCopy');
  const btnTtsToggle = document.getElementById('btnTtsToggle');
  const btnLogout = document.getElementById('btnLogout');
  const commandInput = document.getElementById('commandInput');
  const outputArea = document.getElementById('outputArea');
  const outputStatus = document.getElementById('outputStatus');
  const listeningWave = document.getElementById('listeningWave');

  // 1. Logout Action
  btnLogout.onclick = async () => {
    stopSpeaking();
    stopRecording();
    await clearToken();
    showLoginView();
    initLoginView();
  };

  // 2. TTS Voice Output Toggle
  btnTtsToggle.onclick = () => {
    isTtsEnabled = !isTtsEnabled;
    btnTtsToggle.classList.toggle('muted', !isTtsEnabled);
    btnTtsToggle.title = isTtsEnabled ? 'Voice Output: ON' : 'Voice Output: MUTED';
    if (!isTtsEnabled) stopSpeaking();
  };

  // 3. Clear Output Action
  btnClear.onclick = () => {
    stopSpeaking();
    outputArea.innerHTML = '<p class="placeholder-text">Press the microphone or tap an action chip above to talk to Jarvis...</p>';
    btnCopy.style.display = 'none';
    outputStatus.textContent = 'Jarvis Assistant';
    lastResponseText = '';
  };

  // 4. Copy Output Action
  btnCopy.onclick = async () => {
    if (lastResponseText) {
      try {
        await navigator.clipboard.writeText(lastResponseText);
        outputStatus.textContent = 'Copied to clipboard!';
        setTimeout(() => { outputStatus.textContent = 'Jarvis Assistant'; }, 2000);
      } catch (err) {
        console.warn('Copy failed:', err);
      }
    }
  };

  // 5. Query Active Tab Context
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      const tab = tabs[0];
      pageTitleEl.textContent = tab.title || tab.url || 'Active Tab';

      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { type: 'GET_TAB_CONTEXT' }, (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          currentTabContext = { url: tab.url, title: tab.title };
        } else if (response && response.context) {
          currentTabContext = response.context;
          if (currentTabContext.selectedText) {
            selectionBadge.style.display = 'inline-block';
            chipSelection.style.display = 'inline-flex';
          }
        }
      });
    }
  });

  // 6. Action Chips
  chipSummarize.onclick = () => {
    sendCommand('Please provide a clear and concise summary of the key content on this active webpage.');
  };

  chipTakeaways.onclick = () => {
    sendCommand('Extract the top 3 to 5 key takeaways or action points from this page as clear bullet points.');
  };

  chipSelection.onclick = () => {
    if (currentTabContext?.selectedText) {
      sendCommand(`Explain and analyze this selected text from the webpage in detail: "${currentTabContext.selectedText}"`);
    }
  };

  chipTime.onclick = () => {
    sendCommand('What is the current time in UTC and my local timezone?');
  };

  // 7. Text Input Send
  btnSend.onclick = () => {
    const text = commandInput.value.trim();
    if (text) {
      sendCommand(text);
      commandInput.value = '';
    }
  };

  commandInput.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = commandInput.value.trim();
      if (text) {
        sendCommand(text);
        commandInput.value = '';
      }
    }
  };

  // 8. Voice STT Setup
  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognitionClass) {
    recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const text = final || interim;
      if (text) commandInput.value = text;
      if (final.trim()) {
        stopRecording();
        sendCommand(final.trim());
        commandInput.value = '';
      }
    };

    recognition.onerror = (event) => {
      console.warn('[Extension Voice] Speech error:', event.error);
      stopRecording();
      if (event.error === 'not-allowed') {
        outputStatus.textContent = 'Mic access needed (Opening helper tab)';
        chrome.tabs.create({ url: chrome.runtime.getURL('permission.html') });
      }
    };

    recognition.onend = () => {
      stopRecording();
    };
  }

  async function startRecording() {
    stopSpeaking();
    try {
      // Trigger microphone permission in extension context if needed
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.warn('Microphone permission request failed:', err);
    }

    isRecording = true;
    btnMic.classList.add('active');
    listeningWave.style.display = 'flex';
    outputStatus.textContent = 'Listening...';

    if (recognition) {
      try {
        commandInput.value = '';
        recognition.start();
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  }

  function stopRecording() {
    isRecording = false;
    btnMic.classList.remove('active');
    listeningWave.style.display = 'none';
    outputStatus.textContent = 'Jarvis Assistant';

    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      micStream = null;
    }
    if (recognition) {
      try { recognition.stop(); } catch (err) {}
    }
  }

  btnMic.onclick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // 9. TTS Audio Playback
  function stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
    }
  }

  function speakResponse(text) {
    if (!isTtsEnabled || !('speechSynthesis' in window) || !text) return;
    stopSpeaking();

    const cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[*_~#]/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onstart = () => { isSpeaking = true; };
    utterance.onend = () => { isSpeaking = false; };
    utterance.onerror = () => { isSpeaking = false; };

    window.speechSynthesis.speak(utterance);
  }

  // 10. Browser Action Intent Detector & Executor
  function executeBrowserAction(transcript) {
    const t = transcript.toLowerCase().trim();

    // YouTube (handles "open youtube", "open youthub", "open utube", "play youtube")
    if (t.includes('youtube') || t.includes('youthub') || t.includes('utube')) {
      const searchMatch = t.match(/(?:search|play|find)\s+(?:on\s+youtube\s+for|youtube\s+for|for)?\s*(.+)/i);
      if (searchMatch && searchMatch[1] && !t.startsWith('open')) {
        const query = encodeURIComponent(searchMatch[1].replace(/on youtube/i, '').trim());
        chrome.tabs.create({ url: `https://www.youtube.com/results?search_query=${query}` });
        return `Searching YouTube for "${searchMatch[1].trim()}".`;
      }
      chrome.tabs.create({ url: 'https://www.youtube.com' });
      return 'Opening YouTube in a new tab.';
    }

    // Google
    if (t.includes('open google') || t === 'google') {
      chrome.tabs.create({ url: 'https://www.google.com' });
      return 'Opening Google in a new tab.';
    }

    // New Tab
    if (t.includes('open new tab') || t.includes('new tab') || t.includes('open tab') || t === 'tab') {
      chrome.tabs.create({ url: 'chrome://newtab' });
      return 'Opening a new tab.';
    }

    // GitHub
    if (t.includes('open github') || t === 'github') {
      chrome.tabs.create({ url: 'https://www.github.com' });
      return 'Opening GitHub in a new tab.';
    }

    // Reddit
    if (t.includes('open reddit') || t === 'reddit') {
      chrome.tabs.create({ url: 'https://www.reddit.com' });
      return 'Opening Reddit in a new tab.';
    }

    // Twitter / X
    if (t.includes('open twitter') || t.includes('open x') || t === 'twitter') {
      chrome.tabs.create({ url: 'https://www.x.com' });
      return 'Opening X (Twitter) in a new tab.';
    }

    // Google Search
    const gMatch = t.match(/^(?:search|google|search for|search on google for)\s+(.+)/i);
    if (gMatch && gMatch[1]) {
      const query = encodeURIComponent(gMatch[1].trim());
      chrome.tabs.create({ url: `https://www.google.com/search?q=${query}` });
      return `Searching Google for "${gMatch[1].trim()}".`;
    }

    // Generic "open <site>" (e.g. "open wikipedia", "open amazon", "open netflix")
    const openMatch = t.match(/^open\s+([a-z0-9\-]+(?:\.[a-z]{2,})?)$/i);
    if (openMatch && openMatch[1]) {
      let domain = openMatch[1].trim();
      if (!domain.includes('.')) domain += '.com';
      const url = `https://${domain}`;
      chrome.tabs.create({ url });
      return `Opening ${domain} in a new tab.`;
    }

    return null;
  }

  // 11. Send Voice/Text Command to Gateway & Agent
  async function sendCommand(transcript) {
    stopSpeaking();
    stopRecording();
    btnCopy.style.display = 'none';
    outputArea.textContent = '';
    const conversationId = `ext-${Date.now()}`;

    // Check if command is a direct browser action (open tab, open youtube, etc.)
    const browserActionResult = executeBrowserAction(transcript);
    if (browserActionResult) {
      outputStatus.textContent = 'Action Executed';
      outputArea.textContent = browserActionResult;
      lastResponseText = browserActionResult;
      btnCopy.style.display = 'flex';
      speakResponse(browserActionResult);
      return;
    }

    outputStatus.textContent = 'Jarvis is thinking...';

    try {
      const token = await getStoredToken();
      if (!token) {
        showLoginView();
        initLoginView();
        return;
      }

      const response = await fetch(`${GATEWAY_URL}/api/agent/voice-command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-request-id': `ext-req-${Date.now()}`
        },
        body: JSON.stringify({
          conversationId,
          transcript,
          browserContext: currentTabContext || {}
        })
      });

      if (response.status === 401) {
        await clearToken();
        showLoginView();
        initLoginView();
        return;
      }

      if (!response.ok) {
        outputStatus.textContent = 'Error';
        outputArea.textContent = `Server returned status ${response.status}. Ensure services are healthy.`;
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunkObj = JSON.parse(line);
              if (chunkObj.chunk) {
                fullResponse += chunkObj.chunk;
                outputArea.textContent = fullResponse;
                outputArea.scrollTop = outputArea.scrollHeight;
              }
            } catch (err) {}
          }
        }
      }

      lastResponseText = fullResponse;
      outputStatus.textContent = 'Ready';

      if (!fullResponse) {
        outputArea.textContent = 'Jarvis processed your request.';
      } else {
        btnCopy.style.display = 'flex';
        speakResponse(fullResponse);
      }

    } catch (err) {
      outputStatus.textContent = 'Connection Error';
      outputArea.textContent = `Could not reach Jarvis Gateway at ${GATEWAY_URL}. Ensure Docker stack is up.`;
    }
  }
}
