import { classifyBrowserAction } from '../../browser/actionClassifier.js';
import { BrowserActionDispatcher } from '../../browser/browserActionDispatcher.js';

const dispatcher = new BrowserActionDispatcher();
const browserTool = (name, description, parameters, type, payloadFor) => ({
  name, description, parameters,
  async handler(args, context) {
    const payload = payloadFor(args);
    const classification = classifyBrowserAction(type, payload, context.browserContext);
    return dispatcher.dispatch({
      userId: context.userId,
      deviceId: context.deviceId,
      tabId: context.tabId,
      pageUrl: context.browserContext?.url,
      conversationId: context.conversationId,
      type,
      payload,
      classification
    });
  }
});

export const browserTools = [
  browserTool(
    'openTab',
    'Open a valid HTTP or HTTPS URL in a new browser tab.',
    {
      type: 'object',
      properties: { url: { type: 'string', description: 'The absolute URL to open (e.g. https://www.google.com)' } },
      required: ['url']
    },
    'openTab',
    ({ url }) => ({ url })
  ),
  browserTool(
    'clickElement',
    'Click an interactive button, link, or element on the active tab. Pass the visible text (e.g. "Sign Up", "Submit", "Search"), aria-label, or CSS selector.',
    {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'The visible label, text, placeholder, or CSS selector of the button/link to click (e.g. "Sign Up", "Search", "Login")'
        },
        selector: {
          type: 'string',
          description: 'Alternative CSS selector if target is not used'
        }
      }
    },
    'clickElement',
    ({ target, selector }) => ({ target: target || selector || '', selector: selector || target || '' })
  ),
  browserTool(
    'fillForm',
    'Fill a form field, search bar, or textarea on the active page. Pass the label, placeholder, name, or selector, and the text value to enter.',
    {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'The field name, placeholder, label, or CSS selector (e.g. "Email", "Search", "Search YouTube", "First Name")'
        },
        selector: {
          type: 'string',
          description: 'Alternative CSS selector if target is not used'
        },
        value: {
          type: 'string',
          description: 'The text value to enter into the field'
        }
      },
      required: ['value']
    },
    'fillForm',
    ({ target, selector, value }) => ({ target: target || selector || '', selector: selector || target || '', value: String(value || '') })
  ),
  browserTool(
    'scrollPage',
    'Scroll the active page up or down.',
    {
      type: 'object',
      properties: { direction: { type: 'string', enum: ['up', 'down'], description: 'Scroll direction' } },
      required: ['direction']
    },
    'scrollPage',
    ({ direction }) => ({ direction })
  ),
  browserTool(
    'readPageContent',
    'Read text content, title, and current URL from the active browser page.',
    { type: 'object', properties: {} },
    'readPageContent',
    () => ({})
  )
];
