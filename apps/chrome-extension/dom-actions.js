(function () {
  if (window.__JARVIS_DOM_ACTIONS_LOADED) return;
  window.__JARVIS_DOM_ACTIONS_LOADED = true;

  const MAX_SELECTOR_LENGTH = 500;
  const MAX_VALUE_LENGTH = 2000;
  const blocked = ['password', 'passwd', 'passcode', 'credit-card', 'card-number', 'cc-number', 'cvv', 'cvc', 'security-code', 'expiry', 'expiration', 'iban', 'routing-number', 'bank-account', 'payment', 'wallet', 'private-key', 'seed-phrase'];
  const isBlocked = (target) => blocked.some((value) => String(target || '').toLowerCase().includes(value));

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function findTargetElement(targetQuery, preferForm = false) {
    if (!targetQuery || typeof targetQuery !== 'string') return null;
    const query = targetQuery.trim();
    const lowerQuery = query.toLowerCase();

    // 1. Try direct CSS selector if it appears to be a selector
    if (/^[.#\[\w\-_:>+~="',\s]+$/.test(query) && !query.includes(' ')) {
      try {
        const directMatch = document.querySelector(query);
        if (directMatch && isVisible(directMatch)) return directMatch;
      } catch (e) {}
    }

    // 2. If looking for a form input (fillForm)
    if (preferForm) {
      // 2a. Match by label text
      const labels = Array.from(document.querySelectorAll('label'));
      for (const label of labels) {
        const labelText = (label.innerText || label.textContent || '').trim().toLowerCase();
        if (labelText && (labelText === lowerQuery || labelText.includes(lowerQuery))) {
          if (label.control && isVisible(label.control)) return label.control;
          if (label.htmlFor) {
            const targetEl = document.getElementById(label.htmlFor);
            if (targetEl && isVisible(targetEl)) return targetEl;
          }
          const nestedInput = label.querySelector('input, textarea, select');
          if (nestedInput && isVisible(nestedInput)) return nestedInput;
        }
      }

      // 2b. Match input by placeholder, name, id, aria-label
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'));
      // Exact attribute match
      for (const input of inputs) {
        if (!isVisible(input)) continue;
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
        const name = (input.getAttribute('name') || '').toLowerCase();
        const id = (input.id || '').toLowerCase();
        const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
        if (placeholder === lowerQuery || name === lowerQuery || id === lowerQuery || ariaLabel === lowerQuery) {
          return input;
        }
      }
      // Substring attribute match
      for (const input of inputs) {
        if (!isVisible(input)) continue;
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
        const name = (input.getAttribute('name') || '').toLowerCase();
        const id = (input.id || '').toLowerCase();
        const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
        if ((placeholder && placeholder.includes(lowerQuery)) || (name && name.includes(lowerQuery)) || (id && id.includes(lowerQuery)) || (ariaLabel && ariaLabel.includes(lowerQuery))) {
          return input;
        }
      }
    }

    // 3. Match clickable elements (buttons, links, inputs, roles)
    const interactiveCandidates = Array.from(document.querySelectorAll('button, a, [role="button"], [role="link"], [role="menuitem"], [role="tab"], input[type="button"], input[type="submit"], input[type="reset"]'));

    // 3a. Exact visible text match
    for (const el of interactiveCandidates) {
      if (!isVisible(el)) continue;
      const text = (el.innerText || el.textContent || '').trim().toLowerCase();
      if (text === lowerQuery) return el;
      const val = (el.getAttribute('value') || '').trim().toLowerCase();
      if (val === lowerQuery) return el;
      const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
      if (aria === lowerQuery) return el;
    }

    // 3b. Substring visible text match
    for (const el of interactiveCandidates) {
      if (!isVisible(el)) continue;
      const text = (el.innerText || el.textContent || '').trim().toLowerCase();
      if (text && text.includes(lowerQuery)) return el;
      const val = (el.getAttribute('value') || '').trim().toLowerCase();
      if (val && val.includes(lowerQuery)) return el;
      const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
      if (aria && aria.includes(lowerQuery)) return el;
    }

    // 3c. Match by ID, name, class or data-testid substring
    for (const el of interactiveCandidates) {
      if (!isVisible(el)) continue;
      const id = (el.id || '').toLowerCase();
      const testId = (el.getAttribute('data-testid') || '').toLowerCase();
      const name = (el.getAttribute('name') || '').toLowerCase();
      if (id.includes(lowerQuery) || testId.includes(lowerQuery) || name.includes(lowerQuery)) return el;
    }

    // 4. Fallback: querySelector if valid CSS
    try {
      const fallback = document.querySelector(query);
      if (fallback) return fallback;
    } catch (e) {}

    return null;
  }

  function execute(action) {
    const payload = action.payload || {};
    const targetQuery = payload.target || payload.selector || '';
    if (String(targetQuery).length > MAX_SELECTOR_LENGTH || String(payload.value || '').length > MAX_VALUE_LENGTH) {
      throw new Error('Action input is too long');
    }

    if (action.type === 'clickElement') {
      if (isBlocked(targetQuery)) throw new Error('Protected element is blocked');
      const element = findTargetElement(targetQuery, false);
      if (!element) throw new Error(`Could not find interactive element matching "${targetQuery}"`);

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();

      // Dispatch full simulated mouse interaction sequence for modern web frameworks
      const mouseEvents = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
      for (const evtName of mouseEvents) {
        element.dispatchEvent(new MouseEvent(evtName, { bubbles: true, cancelable: true, view: window }));
      }
      if (typeof element.click === 'function') {
        element.click();
      }
      return { message: `Element "${targetQuery}" clicked successfully` };
    }

    if (action.type === 'fillForm') {
      if (isBlocked(`${targetQuery} ${payload.value}`)) throw new Error('Protected field is blocked');
      const element = findTargetElement(targetQuery, true);
      if (!element) throw new Error(`Could not find form field matching "${targetQuery}"`);

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();

      const textValue = String(payload.value || '').slice(0, MAX_VALUE_LENGTH);

      // React / Vue / Angular synthetic event tracker bypass using prototype descriptor
      const prototype = element instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

      if (nativeSetter) {
        nativeSetter.call(element, textValue);
      } else {
        element.value = textValue;
      }

      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return { message: `Field "${targetQuery}" filled with value` };
    }

    if (action.type === 'scrollPage') {
      window.scrollBy({ top: payload.direction === 'up' ? -window.innerHeight * 0.8 : window.innerHeight * 0.8, behavior: 'smooth' });
      return { message: 'Page scrolled' };
    }

    if (action.type === 'readPageContent') {
      return { content: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 5000), title: document.title, url: location.href };
    }

    throw new Error('Unsupported DOM action');
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type !== 'EXECUTE_ACTION' || !message.action || message.action.type === 'openTab') return false;
    try { sendResponse({ ok: true, result: execute(message.action) }); }
    catch (error) { sendResponse({ ok: false, error: error.message }); }
    return true;
  });
})();
