/**
 * MCP: Fetcher
 *
 * Single Responsibility: Handle all HTTP requests for web content
 *
 * This MCP is responsible for:
 * - Fetching HTML pages
 * - Fetching CSS stylesheets
 * - Fetching images
 * - Applying timeouts and size limits
 * - Handling network errors gracefully
 *
 * Design Decision: Uses axios for robust HTTP handling with built-in
 * timeout and response type configuration. Limits response sizes to
 * prevent memory issues with large assets.
 */

const axios = require('axios');
const https = require('https');
const RobotsParser = require('robots-parser');

class Fetcher {
  constructor() {
    // Configuration: Reasonable limits for a local tool
    this.MAX_HTML_SIZE = 10 * 1024 * 1024; // 10MB for HTML
    this.MAX_ASSET_SIZE = 5 * 1024 * 1024;  // 5MB for CSS/images
    this.TIMEOUT = 15000; // 15 seconds

    // User agent identifies us as a replication tool
    this.USER_AGENT = 'Mozilla/5.0 (compatible; WebsitePlunder/1.0; +https://github.com/yourorg/website-plunder)';

    // HTTPS agent that allows self-signed certificates
    // WARNING: This bypasses SSL verification. Only use with sites you trust.
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
  }

  /**
   * Check robots.txt before fetching
   * Design Decision: Respect robots.txt as a best practice
   */
  async checkRobots(url) {
    try {
      const urlObj = new URL(url);
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

      const response = await axios.get(robotsUrl, {
        timeout: 5000,
        validateStatus: (status) => status < 500, // Accept 404
        httpsAgent: this.httpsAgent
      });

      if (response.status === 200) {
        const robots = RobotsParser(robotsUrl, response.data);
        return robots.isAllowed(url, this.USER_AGENT);
      }

      // No robots.txt means we can proceed
      return true;
    } catch (error) {
      // If we can't fetch robots.txt, proceed cautiously
      return true;
    }
  }

  /**
   * Fetch HTML page
   */
  async fetchHTML(url) {
    try {
      // Check robots.txt first
      const allowed = await this.checkRobots(url);
      if (!allowed) {
        throw new Error('Blocked by robots.txt');
      }

      const response = await axios.get(url, {
        timeout: this.TIMEOUT,
        maxContentLength: this.MAX_HTML_SIZE,
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        responseType: 'text',
        httpsAgent: this.httpsAgent
      });

      return {
        html: response.data,
        finalUrl: response.request.res.responseUrl || url,
        contentType: response.headers['content-type']
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - site took too long to respond');
      }
      if (error.response?.status === 404) {
        throw new Error('Page not found (404)');
      }
      if (error.response?.status === 403) {
        throw new Error('Access forbidden (403)');
      }
      throw new Error(`Failed to fetch HTML: ${error.message}`);
    }
  }

  /**
   * Fetch CSS stylesheet
   */
  async fetchCSS(url, refererUrl) {
    try {
      const response = await axios.get(url, {
        timeout: this.TIMEOUT,
        maxContentLength: this.MAX_ASSET_SIZE,
        headers: {
          'User-Agent': this.USER_AGENT,
          'Referer': refererUrl,
          'Accept': 'text/css,*/*;q=0.1'
        },
        responseType: 'text',
        httpsAgent: this.httpsAgent
      });

      return response.data;
    } catch (error) {
      console.error(`Failed to fetch CSS from ${url}:`, error.message);
      return null; // Fail gracefully - missing CSS is non-fatal
    }
  }

  /**
   * Fetch image and return as base64 data URL
   * Design Decision: Convert images to data URLs to avoid CORS issues
   * and simplify asset management
   */
  async fetchImage(url, refererUrl) {
    try {
      const response = await axios.get(url, {
        timeout: this.TIMEOUT,
        maxContentLength: this.MAX_ASSET_SIZE,
        headers: {
          'User-Agent': this.USER_AGENT,
          'Referer': refererUrl
        },
        responseType: 'arraybuffer',
        httpsAgent: this.httpsAgent
      });

      const contentType = response.headers['content-type'] || 'image/png';
      const base64 = Buffer.from(response.data).toString('base64');

      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      console.error(`Failed to fetch image from ${url}:`, error.message);
      return null; // Fail gracefully - missing images are non-fatal
    }
  }

  /**
   * Fetch generic asset (for fonts, etc.)
   */
  async fetchAsset(url, refererUrl) {
    try {
      const response = await axios.get(url, {
        timeout: this.TIMEOUT,
        maxContentLength: this.MAX_ASSET_SIZE,
        headers: {
          'User-Agent': this.USER_AGENT,
          'Referer': refererUrl
        },
        responseType: 'arraybuffer',
        httpsAgent: this.httpsAgent
      });

      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const base64 = Buffer.from(response.data).toString('base64');

      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      console.error(`Failed to fetch asset from ${url}:`, error.message);
      return null;
    }
  }
}

module.exports = new Fetcher();
