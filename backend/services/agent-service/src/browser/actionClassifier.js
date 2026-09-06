const BLOCKED_PATTERNS = [
  'password', 'passwd', 'passcode', 'credit-card', 'card-number', 'cc-number',
  'cvv', 'cvc', 'security-code', 'expiry', 'expiration', 'iban',
  'routing-number', 'bank-account', 'payment-pin', 'private-key', 'seed-phrase'
];

const SENSITIVE_WORDS = ['submit', 'login', 'checkout', 'delete', 'send', 'publish', 'purchase', 'buy', 'confirm', 'save'];
const MAX_SELECTOR_LENGTH = 500;
const MAX_VALUE_LENGTH = 2000;
const textOf = (value) => String(value ?? '').toLowerCase();

export function classifyBrowserAction(type, payload = {}, context = {}) {
  const target = payload.target || payload.selector || '';
  if (String(target).length > MAX_SELECTOR_LENGTH || String(payload.value || '').length > MAX_VALUE_LENGTH) {
    return { tier: 'blocked', requiresConfirmation: false, reason: 'Browser action input exceeds the allowed length' };
  }
  const subject = [type, target, payload.value, payload.url, context?.title, context?.pageText]
    .map(textOf).join(' ');

  if (BLOCKED_PATTERNS.some((pattern) => subject.includes(pattern))) {
    return { tier: 'blocked', requiresConfirmation: false, reason: 'Protected credential or payment field detected' };
  }

  if (type === 'openTab' && !/^https?:\/\//i.test(String(payload.url || ''))) {
    return { tier: 'blocked', requiresConfirmation: false, reason: 'Only HTTP(S) URLs are allowed' };
  }

  if (type === 'openTab' || type === 'scrollPage' || type === 'readPageContent') {
    return { tier: 'safe', requiresConfirmation: false, reason: 'Low-risk browser action' };
  }

  if (type === 'clickElement' || type === 'fillForm' || SENSITIVE_WORDS.some((word) => subject.includes(word))) {
    const isVoiceAuthorized = payload.confirmed === true || payload.voiceAuthorized === true;
    return {
      tier: 'sensitive',
      requiresConfirmation: !isVoiceAuthorized,
      reason: 'Action can change page state'
    };
  }

  return { tier: 'blocked', requiresConfirmation: false, reason: 'Unknown browser action' };
}

export { BLOCKED_PATTERNS };
