/**
 * Jarvis Extension Content Script
 * Extracts minimal and safe active tab context without leaking private data.
 */

// Listen for context requests from popup or background worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_TAB_CONTEXT') {
    try {
      const selectedText = window.getSelection() ? window.getSelection().toString().trim() : '';
      const pageText = document.body ? document.body.innerText.substring(0, 1500) : '';

      sendResponse({
        success: true,
        context: {
          url: window.location.href,
          title: document.title || 'Untitled Page',
          selectedText: selectedText || '',
          pageText: pageText
        }
      });
    } catch (err) {
      sendResponse({
        success: false,
        error: err.message,
        context: {
          url: window.location.href,
          title: document.title
        }
      });
    }
  }
  return true;
});
