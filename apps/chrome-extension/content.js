/**
 * Jarvis Extension Content Script — Full DOM Agent Bridge v2
 *
 * Handles two message types from the background service worker:
 *   1. GET_TAB_CONTEXT  — returns page metadata, headings, and clean body text
 *   2. EXECUTE_ACTION   — performs DOM actions (click, fill, scroll, read)
 *
 * The DOM action logic is inlined here so this single script works on every
 * page without relying on a separate file injection round-trip.
 */

(function () {
  // ── Guard: prevent double-registration on script re-injection ─────────────
  if (window.__JARVIS_CONTENT_BRIDGE_LOADED) return;
  window.__JARVIS_CONTENT_BRIDGE_LOADED = true;

  // ── Safety limits ──────────────────────────────────────────────────────────
  const MAX_SELECTOR_LENGTH = 500;
  const MAX_VALUE_LENGTH = 2000;

  /** Fields that must never be filled by automation for safety. */
  const BLOCKED_FIELD_KEYWORDS = [
    'password', 'passwd', 'passcode',
    'credit-card', 'card-number', 'cc-number',
    'cvv', 'cvc', 'security-code',
    'expiry', 'expiration',
    'iban', 'routing-number', 'bank-account',
    'payment', 'wallet',
    'private-key', 'seed-phrase'
  ];
  const isBlocked = (target) =>
    BLOCKED_FIELD_KEYWORDS.some((kw) => String(target || '').toLowerCase().includes(kw));

  // ── DOM helpers ────────────────────────────────────────────────────────────

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  /**
   * Multi-strategy element finder.
   * @param {string} query       - Text, CSS selector, aria-label, placeholder, name, or ID
   * @param {boolean} preferForm - If true, prioritise <input>/<textarea>/<select> matching
   */
  function findTargetElement(query, preferForm = false) {
    if (!query || typeof query !== 'string') return null;
    const q = query.trim();
    const lq = q.toLowerCase();

    // Strategy 1: Direct CSS selector (only if it looks like a selector, not natural language)
    if (/^[.#\[\w\-_:>"'+~="',\s]+$/.test(q) && !q.includes(' ')) {
      try {
        const el = document.querySelector(q);
        if (el && isVisible(el)) return el;
      } catch (_) {}
    }

    // Strategy 2: Form fields (for fillForm action)
    if (preferForm) {
      // 2a. Match by <label> text
      for (const label of document.querySelectorAll('label')) {
        const labelText = (label.innerText || label.textContent || '').trim().toLowerCase();
        if (!labelText) continue;
        if (labelText === lq || labelText.includes(lq)) {
          if (label.control && isVisible(label.control)) return label.control;
          if (label.htmlFor) {
            const target = document.getElementById(label.htmlFor);
            if (target && isVisible(target)) return target;
          }
          const nested = label.querySelector('input, textarea, select');
          if (nested && isVisible(nested)) return nested;
        }
      }

      // 2b. Match input by placeholder / name / id / aria-label — exact then partial
      const inputs = Array.from(document.querySelectorAll(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'
      ));
      for (const pass of ['exact', 'partial']) {
        for (const input of inputs) {
          if (!isVisible(input)) continue;
          const attrs = [
            (input.getAttribute('placeholder') || '').toLowerCase(),
            (input.getAttribute('name') || '').toLowerCase(),
            (input.id || '').toLowerCase(),
            (input.getAttribute('aria-label') || '').toLowerCase(),
          ];
          const matches = pass === 'exact'
            ? attrs.some((a) => a === lq)
            : attrs.some((a) => a && a.includes(lq));
          if (matches) return input;
        }
      }
    }

    // Strategy 3: Clickable elements (buttons, links, roles) — exact text then partial
    const clickables = Array.from(document.querySelectorAll(
      'button, a, [role="button"], [role="link"], [role="menuitem"], [role="tab"], ' +
      'input[type="button"], input[type="submit"], input[type="reset"]'
    ));

    for (const pass of ['exact', 'partial']) {
      for (const el of clickables) {
        if (!isVisible(el)) continue;
        const text  = (el.innerText || el.textContent || '').trim().toLowerCase();
        const val   = (el.getAttribute('value') || '').trim().toLowerCase();
        const aria  = (el.getAttribute('aria-label') || '').trim().toLowerCase();
        const title = (el.getAttribute('title') || '').trim().toLowerCase();
        const attrs = [text, val, aria, title];
        const matches = pass === 'exact'
          ? attrs.some((a) => a === lq)
          : attrs.some((a) => a && a.includes(lq));
        if (matches) return el;
      }
    }

    // Strategy 4: Attribute match (id, name, data-testid)
    for (const el of clickables) {
      if (!isVisible(el)) continue;
      const id     = (el.id || '').toLowerCase();
      const testId = (el.getAttribute('data-testid') || '').toLowerCase();
      const name   = (el.getAttribute('name') || '').toLowerCase();
      if (id.includes(lq) || testId.includes(lq) || name.includes(lq)) return el;
    }

    // Strategy 5: Last-resort querySelector
    try {
      const fallback = document.querySelector(q);
      if (fallback) return fallback;
    } catch (_) {}

    return null;
  }

  // ── Action executor ────────────────────────────────────────────────────────

  function executeAction(action) {
    const payload     = action.payload || {};
    const targetQuery = String(payload.target || payload.selector || '');

    if (targetQuery.length > MAX_SELECTOR_LENGTH) throw new Error('Target selector too long');
    if (String(payload.value || '').length > MAX_VALUE_LENGTH) throw new Error('Value too long');

    // ── clickElement ────────────────────────────────────────────────────────
    if (action.type === 'clickElement') {
      if (isBlocked(targetQuery)) throw new Error('Protected element — cannot click');
      const el = findTargetElement(targetQuery, false);
      if (!el) throw new Error(`Could not find element matching "${targetQuery}"`);

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();

      // Fire the full synthetic event sequence so SPA frameworks react properly
      for (const evtName of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
        el.dispatchEvent(new MouseEvent(evtName, { bubbles: true, cancelable: true, view: window }));
      }
      if (typeof el.click === 'function') el.click();

      return { message: `Clicked "${targetQuery}" successfully` };
    }

    // ── fillForm ────────────────────────────────────────────────────────────
    if (action.type === 'fillForm') {
      if (isBlocked(`${targetQuery} ${payload.value}`)) throw new Error('Protected field — cannot fill');
      const el = findTargetElement(targetQuery, true);
      if (!el) throw new Error(`Could not find form field matching "${targetQuery}"`);

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();

      const textValue = String(payload.value || '').slice(0, MAX_VALUE_LENGTH);

      // Bypass React/Vue/Angular's synthetic value tracker via native prototype setter
      const proto = el instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

      if (nativeSetter) {
        nativeSetter.call(el, textValue);
      } else {
        el.value = textValue;
      }

      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      return { message: `Filled "${targetQuery}" with the provided value` };
    }

    // ── scrollPage ──────────────────────────────────────────────────────────
    if (action.type === 'scrollPage') {
      const direction = payload.direction === 'up' ? -1 : 1;
      window.scrollBy({ top: direction * window.innerHeight * 0.8, behavior: 'smooth' });
      return { message: `Page scrolled ${payload.direction || 'down'}` };
    }

    // ── readPageContent ─────────────────────────────────────────────────────
    if (action.type === 'readPageContent') {
      const clone = document.body?.cloneNode(true);
      if (clone) {
        clone.querySelectorAll('script, style, noscript, svg, iframe').forEach((el) => el.remove());
      }
      return {
        title: document.title,
        url: location.href,
        content: (clone?.innerText || document.body?.innerText || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 5000)
      };
    }

    throw new Error(`Unsupported action type: "${action.type}"`);
  }

  // ── Message listener ───────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {

    // ── GET_TAB_CONTEXT ─────────────────────────────────────────────────────
    if (request.type === 'GET_TAB_CONTEXT') {
      try {
        const selectedText = window.getSelection()?.toString().trim() || '';
        const metaDesc =
          document.querySelector('meta[name="description"]')?.content ||
          document.querySelector('meta[property="og:description"]')?.content || '';

        const headings = Array.from(document.querySelectorAll('h1, h2'))
          .map((h) => h.innerText.trim())
          .filter(Boolean)
          .slice(0, 8);

        const clone = document.body.cloneNode(true);
        clone.querySelectorAll('script, style, noscript, nav, header, footer, svg, iframe, form')
          .forEach((el) => el.remove());

        const cleanText = (clone.innerText || '')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 3500);

        sendResponse({
          success: true,
          context: {
            url: window.location.href,
            title: document.title || 'Untitled Page',
            selectedText,
            metaDescription: metaDesc,
            headings,
            pageText: cleanText
          }
        });
      } catch (err) {
        sendResponse({
          success: false,
          error: err.message,
          context: { url: window.location.href, title: document.title || 'Untitled Page' }
        });
      }
      return true;
    }

    // ── EXECUTE_ACTION ──────────────────────────────────────────────────────
    if (request.type === 'EXECUTE_ACTION' && request.action) {
      // openTab is handled in background.js — ignore it here
      if (request.action.type === 'openTab') return false;

      try {
        const result = executeAction(request.action);
        sendResponse({ ok: true, result });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
      return true; // Keep channel open for async sendResponse
    }

    return false;
  });

})();
