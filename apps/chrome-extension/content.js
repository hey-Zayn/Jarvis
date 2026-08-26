/**
 * Jarvis Extension Content Script
 * Extracts high-value active tab context: selection, meta tags, headings, and clean readable text.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_TAB_CONTEXT') {
    try {
      // 1. Get selected text (highest priority user context)
      const selectedText = window.getSelection() ? window.getSelection().toString().trim() : '';

      // 2. Extract meta description
      const metaDesc = document.querySelector('meta[name="description"]')?.content
        || document.querySelector('meta[property="og:description"]')?.content
        || '';

      // 3. Extract major headings (structure)
      const headings = Array.from(document.querySelectorAll('h1, h2'))
        .map(h => h.innerText.trim())
        .filter(Boolean)
        .slice(0, 8);

      // 4. Extract readable body text (ignoring nav, header, footer, script, style)
      const clone = document.body.cloneNode(true);
      const elementsToRemove = clone.querySelectorAll('script, style, noscript, nav, header, footer, svg, iframe, form');
      elementsToRemove.forEach(el => el.remove());

      const cleanText = (clone.innerText || '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 3500);

      sendResponse({
        success: true,
        context: {
          url: window.location.href,
          title: document.title || 'Untitled Page',
          selectedText: selectedText,
          metaDescription: metaDesc,
          headings: headings,
          pageText: cleanText
        }
      });
    } catch (err) {
      sendResponse({
        success: false,
        error: err.message,
        context: {
          url: window.location.href,
          title: document.title || 'Untitled Page'
        }
      });
    }
  }
  return true;
});

