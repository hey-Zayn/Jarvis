/**
 * Popup Script for Jarvis Assistant Extension
 */

const GATEWAY_URL = 'http://localhost:5000';

let currentTabContext = null;
let isRecording = false;
let isSpeaking = false;
let recognition = null;

// View helpers
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

function initLoginView() {
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
    loginError.textContent = '';
    try {
      const resp = await fetch(`${GATEWAY_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await resp.json();
      if (!resp.ok) {
        loginError.textContent = data.message || data.error || `Error ${resp.status}`;
        loginBtn.disabled = false; loginBtn.textContent = 'Sign In'; return;
      }
      const token = data.accessToken || data.token || data.access_token;
      if (!token) {
        loginError.textContent = 'No token in response.';
        loginBtn.disabled = false; loginBtn.textContent = 'Sign In'; return;
      }
      await storeToken(token);
      showAppView(); initAppView();
    } catch (err) {
      loginError.textContent = `Cannot reach gateway at ${GATEWAY_URL}`;
      loginBtn.disabled = false; loginBtn.textContent = 'Sign In';
    }
  });
}

function initAppView() {
  const pageTitleEl = document.getElementById('pageTitle');
  const btnSummarize = document.getElementById('btnSummarize');
  const btnMic = document.getElementById('btnMic');
  const btnSend = document.getElementById('btnSend');
  const commandInput = document.getElementById('commandInput');
  const outputArea = document.getElementById('outputArea');
  const btnLogout = document.getElementById('btnLogout');

  btnLogout.addEventListener('click', async () => {
    await clearToken();
    showLoginView();
    initLoginView();
  });
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      const tab = tabs[0];
      pageTitleEl.textContent = tab.title || tab.url || 'Active Tab';

      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { type: 'GET_TAB_CONTEXT' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not yet injected or special page (e.g. chrome://)
          currentTabContext = {
            url: tab.url,
            title: tab.title
          };
        } else if (response && response.context) {
          currentTabContext = response.context;
        }
      });
    }
  });

  // Setup Web Speech API for voice input
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
      if (text) {
        commandInput.value = text;
      }
      if (final.trim()) {
        stopRecording();
        sendCommand(final.trim());
        commandInput.value = '';
      }
    };

    recognition.onerror = (event) => {
      console.warn('[Extension Voice] Speech error:', event.error);
      stopRecording();
    };

    recognition.onend = () => {
      stopRecording();
    };
  }

  function startRecording() {
    stopSpeaking();
    isRecording = true;
    btnMic.classList.add('active');
    outputArea.textContent = 'Listening to your microphone... (Speak now)';

    if (recognition) {
      try {
        commandInput.value = '';
        recognition.start();
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    } else {
      // Fallback
      setTimeout(() => {
        if (isRecording) {
          sendCommand('Summarize this tab and check current time');
          stopRecording();
        }
      }, 1200);
    }
  }

  function stopRecording() {
    isRecording = false;
    btnMic.classList.remove('active');
    if (recognition) {
      try {
        recognition.stop();
      } catch (err) {}
    }
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
    }
  }

  function speakResponse(text) {
    if (!('speechSynthesis' in window) || !text) return;
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

  // Handle Summarize button
  btnSummarize.addEventListener('click', () => {
    const prompt = 'Please summarize the main content of this active web page concisely.';
    sendCommand(prompt);
  });

  // Handle Send button and Enter key
  btnSend.addEventListener('click', () => {
    const text = commandInput.value.trim();
    if (text) {
      sendCommand(text);
      commandInput.value = '';
    }
  });

  commandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const text = commandInput.value.trim();
      if (text) {
        sendCommand(text);
        commandInput.value = '';
      }
    }
  });

  // Handle Mic toggle
  btnMic.addEventListener('click', () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  async function sendCommand(transcript) {
    stopSpeaking();
    outputArea.textContent = 'Thinking...';
    const conversationId = `ext-${Date.now()}`;

    try {
      const token = await getStoredToken();
      if (!token) { showLoginView(); initLoginView(); return; }

      const response = await fetch(`${GATEWAY_URL}/api/agent/voice-command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-request-id': `ext-req-${Date.now()}`
        },
        body: JSON.stringify({ conversationId, transcript, browserContext: currentTabContext || {} })
      });

      if (response.status === 401) {
        await clearToken();
        showLoginView(); initLoginView(); return;
      }

      if (!response.ok) {
        outputArea.textContent = `Error: Gateway returned status ${response.status}`;
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

      if (!fullResponse) {
        outputArea.textContent = 'Response complete.';
      } else {
        // Audible feedback via TTS
        speakResponse(fullResponse);
      }
    } catch (err) {
      outputArea.textContent = `Connection error: Could not reach Jarvis Gateway at ${GATEWAY_URL}. Ensure backend is running.`;
    }
  }
}
