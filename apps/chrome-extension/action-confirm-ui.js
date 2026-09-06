(function () {
  let current = null;
  let expiryTimer = null;
  const remove = () => { if (expiryTimer) clearInterval(expiryTimer); current?.remove(); current = null; expiryTimer = null; };

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== 'CONFIRM_REQUIRED') return;
    remove();
    const action = message.action;
    const root = document.createElement('div');
    root.id = 'jarvis-action-confirmation';
    const targetText = String(action.payload?.target || action.payload?.selector || '').slice(0, 120);
    const value = action.type === 'fillForm' ? `Target: ${targetText} (Value: ••••••••)` : `Target: ${targetText}`;
    const heading = document.createElement('strong');
    heading.textContent = 'Jarvis needs confirmation';
    const detail = document.createElement('p');
    detail.style.lineHeight = '1.4';
    const domain = (() => { try { return new URL(action.pageUrl || '').hostname; } catch { return 'current page'; } })();
    detail.textContent = `${action.type}\n${value}\nPage: ${domain}`;
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';
    buttons.innerHTML = '<button data-choice="cancel">Cancel</button><button data-choice="confirm">Allow</button>';
    root.append(heading, detail, buttons);
    const expiry = document.createElement('small');
    expiry.style.display = 'block';
    expiry.style.marginTop = '8px';
    root.insertBefore(expiry, buttons);
    root.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => { chrome.runtime.sendMessage({ type: button.dataset.choice === 'confirm' ? 'CONFIRM_ACTION' : 'CANCEL_ACTION', actionId: action.actionId }); remove(); }));
    document.documentElement.appendChild(root);
    current = root;
    const updateExpiry = () => {
      const remaining = Math.max(0, action.expiresAt - Date.now());
      expiry.textContent = `Expires in ${Math.ceil(remaining / 1000)}s`;
      if (!remaining) remove();
    };
    expiryTimer = setInterval(updateExpiry, 250);
    updateExpiry();
  });
})();
