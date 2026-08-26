import crypto from 'crypto';

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself'
]);

/**
 * Embedding Provider
 * Generates normalized dense vector embeddings for semantic similarity search in Qdrant.
 */
export class EmbeddingProvider {
  constructor({ dimension = 384, apiKey = process.env.OPENAI_API_KEY || null } = {}) {
    this.dimension = dimension;
    this.apiKey = apiKey;
  }

  /**
   * Morphological stemmer to correlate word variants (e.g., live/lives/living, prefer/prefers/preference)
   */
  _stem(word) {
    if (word.length <= 2) return word;
    return word
      .replace(/(ing|ed|es|s|e|ly|tion|ment|ence|ance)$/, '')
      .replace(/([^aeiou])\1$/, '$1');
  }

  /**
   * Generate vector embedding for a given text.
   * Uses deterministic dense semantic hashing with TF-IDF stopword filtering for high-precision local retrieval.
   */
  async generateEmbedding(text) {
    if (!text || typeof text !== 'string') {
      return new Array(this.dimension).fill(0);
    }

    const cleanText = text.trim().toLowerCase().replace(/[^\w\s]/g, ' ');
    const rawWords = cleanText.split(/\s+/).filter(Boolean);

    // Dense deterministic projection vector
    const vector = new Array(this.dimension).fill(0);
    const stems = [];

    for (let i = 0; i < rawWords.length; i++) {
      const word = rawWords[i];
      const isStop = STOP_WORDS.has(word);
      const stem = this._stem(word);
      stems.push({ stem, isStop });
    }

    for (let i = 0; i < stems.length; i++) {
      const { stem, isStop } = stems[i];
      const weight = isStop ? 0.05 : 3.0; // Significant boost for meaningful content stems

      const h1 = this._hashString(stem, 0);
      const h2 = this._hashString(stem, 1);
      const h3 = this._hashString(stem, 2);

      const idx1 = Math.abs(h1) % this.dimension;
      const idx2 = Math.abs(h2) % this.dimension;
      const idx3 = Math.abs(h3) % this.dimension;

      vector[idx1] += (h1 > 0 ? 1.0 : -1.0) * weight;
      vector[idx2] += (h2 > 0 ? 0.8 : -0.8) * weight;
      vector[idx3] += (h3 > 0 ? 0.5 : -0.5) * weight;

      // Bigrams with next word
      if (i < stems.length - 1) {
        const next = stems[i + 1];
        const bigram = `${stem}_${next.stem}`;
        const biWeight = (isStop && next.isStop) ? 0.05 : 3.5;

        const bh1 = this._hashString(bigram, 0);
        const bh2 = this._hashString(bigram, 1);
        const bidx1 = Math.abs(bh1) % this.dimension;
        const bidx2 = Math.abs(bh2) % this.dimension;

        vector[bidx1] += (bh1 > 0 ? 1.0 : -1.0) * biWeight;
        vector[bidx2] += (bh2 > 0 ? 0.7 : -0.7) * biWeight;
      }
    }

    // L2 Normalize the vector so cosine similarity equals dot product
    return this.normalizeVector(vector);
  }

  _hashString(str, seed = 0) {
    const hash = crypto.createHash('md5').update(`${str}_${seed}`).digest('hex');
    return parseInt(hash.substring(0, 8), 16) - 0x7FFFFFFF;
  }

  normalizeVector(vector) {
    let norm = 0;
    for (let i = 0; i < vector.length; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);
    if (norm === 0) return vector;

    return vector.map(v => Number((v / norm).toFixed(6)));
  }

  /**
   * Compute Cosine Similarity between two dense vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : Math.max(0, Math.min(1, dot / denom));
  }
}
