/**
 * Qdrant Vector Client
 * Connects to Qdrant REST API on port 6333 with automatic collection setup and fallback in-memory store.
 */
export class QdrantClient {
  constructor({
    host = process.env.QDRANT_HOST || 'localhost',
    port = parseInt(process.env.QDRANT_PORT) || 6333,
    collectionName = 'jarvis_memories',
    vectorDimension = 384
  } = {}) {
    this.baseUrl = `http://${host}:${port}`;
    this.collectionName = collectionName;
    this.vectorDimension = vectorDimension;
    this.isInitialized = false;

    // In-memory fallback points store
    this.localStore = new Map();
  }

  async initialize() {
    try {
      const res = await fetch(`${this.baseUrl}/collections/${this.collectionName}`, {
        method: 'GET'
      });

      if (res.status === 404) {
        console.log(`[QdrantClient] Collection "${this.collectionName}" not found. Creating...`);
        const createRes = await fetch(`${this.baseUrl}/collections/${this.collectionName}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vectors: {
              size: this.vectorDimension,
              distance: 'Cosine'
            }
          })
        });

        if (createRes.ok) {
          console.log(`[QdrantClient] Collection "${this.collectionName}" created successfully.`);
        }
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn(`[QdrantClient] Qdrant unavailable at ${this.baseUrl} (${err.message}). Using resilient local vector fallback.`);
      this.isInitialized = false;
    }
  }

  /**
   * Upsert a point into Qdrant
   */
  async upsertPoint({ id, vector, payload }) {
    // Always sync to local store for reliability
    this.localStore.set(id, { id, vector, payload });

    try {
      const res = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: [
            {
              id,
              vector,
              payload
            }
          ]
        })
      });

      return res.ok;
    } catch (err) {
      // Local fallback stores the point
      return true;
    }
  }

  /**
   * Search for nearest vectors in Qdrant
   */
  async search({ vector, limit = 5, userId = null }) {
    try {
      const filter = userId
        ? {
            must: [
              {
                key: 'userId',
                match: { value: userId }
              }
            ]
          }
        : undefined;

      const res = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vector,
          limit,
          with_payload: true,
          filter
        })
      });

      if (res.ok) {
        const data = await res.json();
        return (data.result || []).map(hit => ({
          id: hit.id,
          score: hit.score,
          payload: hit.payload || {}
        }));
      }
    } catch (err) {
      // Fallback to local cosine similarity search
    }

    return this._localSearch(vector, limit, userId);
  }

  _localSearch(queryVector, limit, userId) {
    const results = [];

    for (const item of this.localStore.values()) {
      if (userId && item.payload?.userId && item.payload.userId !== userId) {
        continue;
      }

      // Compute dot product (since vectors are L2-normalized)
      let score = 0;
      for (let i = 0; i < queryVector.length; i++) {
        score += queryVector[i] * item.vector[i];
      }

      results.push({
        id: item.id,
        score: Math.max(0, Math.min(1, score)),
        payload: item.payload
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Delete a point by ID
   */
  async deletePoint(id) {
    this.localStore.delete(id);
    try {
      await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: [id] })
      });
      return true;
    } catch (err) {
      return true;
    }
  }
}
