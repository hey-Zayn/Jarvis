/**
 * Jarvis Extension Background Service Worker
 * Manages JWT tokens in chrome.storage.local and coordinates streaming commands with Gateway.
 */

const GATEWAY_URL = 'http://localhost:5000';

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
      sendResponse({ isAuthenticated: !!token, token });
    });
    return true;
  }

  if (request.type === 'SET_AUTH') {
    setAuthToken(request.token).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.type === 'LOGOUT') {
    chrome.storage.local.remove(['accessToken'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
