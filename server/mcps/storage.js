/**
 * MCP: Storage
 *
 * Single Responsibility: Manage temporary asset storage
 *
 * This MCP is responsible for:
 * - Storing fetched assets in memory
 * - Converting assets to data URLs for inline serving
 * - Managing asset lifecycle (cleanup)
 * - Providing asset retrieval
 *
 * Design Decision: Uses in-memory storage with data URLs for simplicity.
 * This avoids filesystem I/O and CORS issues. Memory is cleared periodically
 * to prevent leaks. For a production tool, this could be replaced with a
 * proper cache or CDN, but for local use, in-memory is perfect.
 */

class Storage {
  constructor() {
    // In-memory asset store
    // Structure: { sessionId: { assetUrl: dataUrl } }
    this.store = new Map();

    // Auto-cleanup old sessions after 1 hour
    this.CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
    this.startCleanupTimer();
  }

  /**
   * Generate a unique session ID for each replication request
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store an asset (already as data URL from fetcher)
   */
  storeAsset(sessionId, originalUrl, dataUrl) {
    if (!this.store.has(sessionId)) {
      this.store.set(sessionId, new Map());
    }

    const sessionStore = this.store.get(sessionId);
    sessionStore.set(originalUrl, dataUrl);
  }

  /**
   * Get all assets for a session as a map
   * Returns: { originalUrl: dataUrl, ... }
   */
  getAssetMap(sessionId) {
    if (!this.store.has(sessionId)) {
      return {};
    }

    const sessionStore = this.store.get(sessionId);
    const assetMap = {};

    sessionStore.forEach((dataUrl, originalUrl) => {
      assetMap[originalUrl] = dataUrl;
    });

    return assetMap;
  }

  /**
   * Clean up a specific session
   */
  clearSession(sessionId) {
    if (this.store.has(sessionId)) {
      this.store.delete(sessionId);
    }
  }

  /**
   * Periodic cleanup of old sessions
   * Design Decision: Prevent memory leaks by removing old sessions
   */
  startCleanupTimer() {
    setInterval(() => {
      const now = Date.now();

      // Extract timestamp from session IDs and remove old ones
      this.store.forEach((value, sessionId) => {
        try {
          const timestamp = parseInt(sessionId.split('_')[1]);
          const age = now - timestamp;

          if (age > this.CLEANUP_INTERVAL) {
            this.store.delete(sessionId);
            console.log(`Cleaned up old session: ${sessionId}`);
          }
        } catch (error) {
          // If we can't parse the timestamp, remove it to be safe
          this.store.delete(sessionId);
        }
      });
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Get current storage stats (for debugging)
   */
  getStats() {
    let totalAssets = 0;
    this.store.forEach(sessionStore => {
      totalAssets += sessionStore.size;
    });

    return {
      sessions: this.store.size,
      totalAssets: totalAssets
    };
  }
}

module.exports = new Storage();
