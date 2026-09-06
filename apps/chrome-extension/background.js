/**
 * Jarvis Extension Background Service Worker
 * Manages JWT tokens in chrome.storage.local and coordinates streaming commands with Gateway.
 */

const GATEWAY_URL = 'http://localhost:5000';
let actionSocket = null;
const pendingConfirmations = new Map();
let reconnectTimer = null;

function sendActionResponse(message) {
  if (actionSocket?.readyState === WebSocket.OPEN) actionSocket.send(JSON.stringify(message));
}

if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

async function getActiveTabId() {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs.length > 0 && tabs[0].id) return tabs[0].id;
    const fallback = await chrome.tabs.query({ active: true });
    return fallback[0]?.id || null;
  } catch {
    return null;
  }
}

async function connectActionSocket() {
  if (actionSocket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(actionSocket.readyState)) return;
  const token = await getAuthToken();
  if (!token) return;
  actionSocket = new WebSocket(`${GATEWAY_URL.replace(/^http/, 'ws')}/ws/extension`);
  actionSocket.onopen = () => actionSocket.send(JSON.stringify({ type: 'AUTH', accessToken: token, deviceId: `extension-${chrome.runtime.id}`, extensionVersion: chrome.runtime.getManifest().version }));
  actionSocket.onmessage = async (event) => {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (message.type === 'AUTHENTICATED') return;
    if (message.type === 'CONFIRM_REQUIRED') {
      if (!message.actionId || !message.action || message.action.expiresAt <= Date.now()) return;
      pendingConfirmations.set(message.actionId, message);
      const tabId = message.tabId || (await getActiveTabId());
      if (tabId) chrome.tabs.sendMessage(tabId, { type: 'CONFIRM_REQUIRED', action: message }).catch(() => {});
      return;
    }
    if (message.type !== 'EXECUTE_ACTION') return;
    if (message.type === 'EXECUTE_ACTION' && message.action?.type === 'openTab') {
      let rawUrl = message.action.payload?.url || '';
      if (!/^https?:\/\//i.test(rawUrl)) rawUrl = 'https://' + rawUrl;
      try {
        await chrome.tabs.create({ url: rawUrl });
        return sendActionResponse({ type: 'ACTION_RESULT', actionId: message.action.actionId, userId: message.action.userId, ok: true, result: { message: `Tab opened: ${rawUrl}` } });
      } catch (err) {
        return sendActionResponse({ type: 'ACTION_RESULT', actionId: message.action.actionId, userId: message.action.userId, ok: false, error: err.message });
      }
    }
    const tabId = message.action.tabId || (await getActiveTabId());
    if (!tabId) return sendActionResponse({ type: 'ACTION_RESULT', actionId: message.action.actionId, userId: message.action.userId, ok: false, error: 'No active tab found' });

    // Send action to active tab with fallback injection
    chrome.tabs.sendMessage(tabId, { type: 'EXECUTE_ACTION', action: message.action }, async (result) => {
      if (chrome.runtime.lastError || result === undefined) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['dom-actions.js']
          });
          chrome.tabs.sendMessage(tabId, { type: 'EXECUTE_ACTION', action: message.action }, (retryResult) => {
            const err = retryResult?.error || chrome.runtime.lastError?.message;
            sendActionResponse({
              type: 'ACTION_RESULT',
              actionId: message.action.actionId,
              userId: message.action.userId,
              ok: retryResult?.ok === true,
              result: retryResult?.result,
              error: err
            });
          });
        } catch (injectErr) {
          sendActionResponse({
            type: 'ACTION_RESULT',
            actionId: message.action.actionId,
            userId: message.action.userId,
            ok: false,
            error: `DOM execution failed: ${injectErr.message}`
          });
        }
      } else {
        sendActionResponse({
          type: 'ACTION_RESULT',
          actionId: message.action.actionId,
          userId: message.action.userId,
          ok: result?.ok === true,
          result: result?.result,
          error: result?.error
        });
      }
    });
  };
  actionSocket.onclose = () => { actionSocket = null; clearTimeout(reconnectTimer); reconnectTimer = setTimeout(connectActionSocket, 3000); };
}

// Store and retrieve tokens securely using chrome.storage.local
export async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['accessToken'], (result) => {
      resolve(result.accessToken || null);
    });
  });
}

export async function setAuthToken(token) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ accessToken: token }, () => {
      resolve(true);
    });
  });
}

// Background command handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CHECK_AUTH') {
    getAuthToken().then((token) => {
      if (token) connectActionSocket();
      sendResponse({ isAuthenticated: !!token, token });
    });
    return true;
  }

  if (request.type === 'SET_AUTH') {
    setAuthToken(request.token).then(() => { connectActionSocket();
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.type === 'LOGOUT') {
    clearTimeout(reconnectTimer);
    actionSocket?.close();
    actionSocket = null;
    chrome.storage.local.remove(['accessToken'], () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.type === 'CONFIRM_ACTION' || request.type === 'CANCEL_ACTION') {
    const pending = pendingConfirmations.get(request.actionId);
    if (!pending) return false;
    pendingConfirmations.delete(request.actionId);
    sendActionResponse({ type: request.type === 'CONFIRM_ACTION' ? 'CONFIRM' : 'CANCEL', actionId: request.actionId, userId: pending.action.userId });
    return false;
  }
});
