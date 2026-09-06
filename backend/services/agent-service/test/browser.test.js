import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyBrowserAction } from '../src/browser/actionClassifier.js';

test('browser risk policy classifies safe actions', () => {
  assert.equal(classifyBrowserAction('openTab', { url: 'https://example.com' }).tier, 'safe');
  assert.equal(classifyBrowserAction('scrollPage', { direction: 'down' }).tier, 'safe');
  assert.equal(classifyBrowserAction('readPageContent', {}).tier, 'safe');
});

test('browser risk policy requires confirmation for ordinary mutations', () => {
  assert.equal(classifyBrowserAction('clickElement', { selector: '#save' }).tier, 'sensitive');
  assert.equal(classifyBrowserAction('fillForm', { selector: '#search', value: 'jarvis' }).requiresConfirmation, true);
});

test('browser risk policy blocks unsafe URLs and protected fields', () => {
  assert.equal(classifyBrowserAction('openTab', { url: 'javascript:alert(1)' }).tier, 'blocked');
  assert.equal(classifyBrowserAction('fillForm', { selector: '#password', value: 'secret' }).tier, 'blocked');
  assert.equal(classifyBrowserAction('clickElement', { selector: '[name=credit-card]' }).tier, 'blocked');
});

test('browser risk policy detects sensitive page context', () => {
  const result = classifyBrowserAction('clickElement', { selector: '#action' }, { title: 'Checkout' });
  assert.equal(result.tier, 'sensitive');
  assert.equal(result.requiresConfirmation, true);
});

test('browser risk policy blocks oversized inputs', () => {
  assert.equal(classifyBrowserAction('clickElement', { selector: 'a'.repeat(501) }).tier, 'blocked');
  assert.equal(classifyBrowserAction('fillForm', { selector: '#search', value: 'a'.repeat(2001) }).tier, 'blocked');
});
