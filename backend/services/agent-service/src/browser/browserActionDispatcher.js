import crypto from 'node:crypto';
import Redis from 'ioredis';

const ACTION_TTL_MS = 45_000;
const channelFor = (userId, suffix) => `jarvis:browser:user:${userId}:${suffix}`;
const sanitizePayload = (payload = {}) => Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, /value|token|password|secret|key/i.test(key) ? '[REDACTED]' : String(value).slice(0, 200)]));

export class BrowserActionDispatcher {
  constructor({ redisUrl = process.env.REDIS_URL || 'redis://localhost:6379' } = {}) {
    this.redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false, retryStrategy: () => null });
    this.subscriber = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false, retryStrategy: () => null });
    this.pending = new Map();
    this.subscriber.on('message', (channel, raw) => this.#resolve(channel, raw));
    this.redis.on('error', (error) => console.warn('[BrowserActionDispatcher] Redis unavailable:', error.message));
  }

  async #connect() {
    if (this.redis.status === 'wait') await this.redis.connect();
    if (this.subscriber.status === 'wait') await this.subscriber.connect();
  }

  #resolve(channel, raw) {
    let message;
    try { message = JSON.parse(raw); } catch { return; }
    const pending = this.pending.get(message.actionId);
    if (!pending || pending.userId !== message.userId || channel !== channelFor(message.userId, 'responses')) return;
    clearTimeout(pending.timer);
    this.pending.delete(message.actionId);
    if (message.type === 'CONFIRM') {
      const resultPromise = this.#waitForResult(pending.action);
      this.#audit(pending.action, 'confirmed');
      this.#publish(pending.action, 'EXECUTE_ACTION').catch(pending.reject);
      resultPromise.then(pending.resolve, pending.reject);
    } else if (message.type === 'ACTION_RESULT') {
      const ok = message.ok === true;
      this.#audit(pending.action, ok ? 'completed' : 'failed', message.error);
      pending.resolve({ ok, status: ok ? 'completed' : 'failed', result: message.result, message: message.error || (ok ? 'Browser action completed' : 'Browser action failed') });
    } else {
      const timedOut = message.type === 'ACTION_TIMEOUT';
      this.#audit(pending.action, timedOut ? 'timeout' : message.type === 'CANCEL' ? 'cancelled' : 'rejected', message.reason);
      pending.resolve({ ok: false, status: timedOut ? 'timeout' : message.type === 'CANCEL' ? 'cancelled' : 'rejected', message: message.reason || (timedOut ? 'Extension disconnected' : 'Action was not approved') });
    }
  }

  async #publish(action, type) {
    await this.#connect();
    await this.redis.publish(channelFor(action.userId, 'actions'), JSON.stringify({ type, action }));
  }

  async #waitForResult(action) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(action.actionId); this.#audit(action, 'timeout', 'No response before expiry'); resolve({ ok: false, status: 'timeout', message: 'Browser action timed out' }); }, ACTION_TTL_MS);
      this.pending.set(action.actionId, { userId: action.userId, action, resolve, reject, timer });
    });
  }

  async dispatch({ userId, deviceId = '', tabId, pageUrl = '', conversationId = '', type, payload, classification }) {
    if (classification.tier === 'blocked') return { ok: false, status: 'blocked', message: classification.reason };
    if (!userId) return { ok: false, status: 'rejected', message: 'Authenticated user is required' };
    const action = { actionId: crypto.randomUUID(), userId, deviceId, tabId, pageUrl, conversationId, type, payload, risk: classification.tier, requiresConfirmation: classification.requiresConfirmation, expiresAt: Date.now() + ACTION_TTL_MS };
    await this.#audit(action, classification.requiresConfirmation ? 'pending_confirmation' : 'dispatched');
    await this.#connect();
    await this.subscriber.subscribe(channelFor(userId, 'responses'));
    if (classification.requiresConfirmation) {
      const resultPromise = this.#waitForResult(action);
      await this.#publish(action, 'CONFIRM_REQUIRED');
      return resultPromise;
    }
    const resultPromise = this.#waitForResult(action);
    await this.#publish(action, 'EXECUTE_ACTION');
    return resultPromise;
  }

  async #audit(action, status, failureReason = '') {
    try {
      const { prisma } = await import('../lib/prisma.js');
      const completed = ['cancelled', 'rejected', 'timeout', 'completed', 'failed'].includes(status);
      await prisma.browserAction.create({ data: { actionId: action.actionId, userId: action.userId, deviceId: action.deviceId || null, tabId: action.tabId || null, conversationId: action.conversationId || null, actionType: action.type, riskTier: action.risk, payloadSummary: sanitizePayload(action.payload), status, failureReason: failureReason || null, expiresAt: new Date(action.expiresAt), completedAt: completed ? new Date() : null } }).catch(async () => {
        await prisma.browserAction.update({ where: { actionId: action.actionId }, data: { status, failureReason: failureReason || null, completedAt: completed ? new Date() : null } });
      });
    } catch (error) {
      console.warn('[BrowserActionDispatcher] Audit write failed:', error.message);
    }
  }
}
