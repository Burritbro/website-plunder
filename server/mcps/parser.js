/**
 * MCP: Parser
 *
 * Single Responsibility: Parse and rewrite HTML for local rendering
 *
 * This MCP is responsible for:
 * - Parsing HTML DOM structure
 * - Extracting asset URLs (CSS, images, fonts)
 * - Rewriting relative URLs to absolute URLs
 * - Stripping unsafe scripts and tracking code
 * - Preserving visible content and styling
 *
 * Design Decision: Uses cheerio (jQuery-like API) for robust HTML parsing
 * without the overhead of a headless browser. Cheerio is fast, reliable,
 * and perfect for server-side HTML manipulation.
 */

const cheerio = require('cheerio');
const { URL } = require('url');

class Parser {
  constructor() {
    // Tags to completely remove - tracking, analytics, unsafe scripts
    this.STRIP_TAGS = [
      'script',  // Remove all JavaScript
      'noscript', // Not needed without JS
      'iframe',  // Often contains tracking or external embeds
      'object',  // Flash and other plugins
      'embed'    // Similar to object
    ];

    // Dangerous attributes to remove
    this.STRIP_ATTRIBUTES = [
      'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
      'onchange', 'onsubmit', 'onfocus', 'onblur'
    ];
  }

  /**
   * Parse HTML and return a cheerio object for manipulation
   */
  parse(html) {
    return cheerio.load(html, {
      decodeEntities: true,
      normalizeWhitespace: false
    });
  }

  /**
   * Resolve relative URL to absolute URL
   * Design Decision: Convert all relative URLs to absolute to avoid
   * broken links when rendering locally
   */
  resolveUrl(url, baseUrl) {
    try {
      // Handle protocol-relative URLs (//example.com/image.png)
      if (url.startsWith('//')) {
        const baseUrlObj = new URL(baseUrl);
        return `${baseUrlObj.protocol}${url}`;
      }

      // Handle absolute URLs
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }

      // Handle data URLs (already inline)
      if (url.startsWith('data:')) {
        return url;
      }

      // Handle relative URLs
      return new URL(url, baseUrl).href;
    } catch (error) {
      console.error(`Failed to resolve URL ${url} against ${baseUrl}:`, error.message);
      return url; // Return original if resolution fails
    }
  }

  /**
   * Extract all asset URLs from parsed HTML
   * Returns: { images: [], stylesheets: [], fonts: [] }
   */
  extractAssets($, baseUrl) {
    const assets = {
      images: [],
      stylesheets: [],
      fonts: []
    };

    // Extract image sources
    $('img[src]').each((i, elem) => {
      const src = $(elem).attr('src');
      if (src && !src.startsWith('data:')) {
        const absoluteUrl = this.resolveUrl(src, baseUrl);
        assets.images.push({
          original: src,
          absolute: absoluteUrl,
          element: elem
        });
      }
    });

    // Extract background images from inline styles
    $('[style*="background"]').each((i, elem) => {
      const style = $(elem).attr('style');
      const urlMatches = style.match(/url\(['"]?([^'")\s]+)['"]?\)/g);
      if (urlMatches) {
        urlMatches.forEach(match => {
          const url = match.match(/url\(['"]?([^'")\s]+)['"]?\)/)[1];
          if (!url.startsWith('data:')) {
            assets.images.push({
              original: url,
              absolute: this.resolveUrl(url, baseUrl),
              inlineStyle: true,
              element: elem
            });
          }
        });
      }
    });

    // Extract external stylesheets
    $('link[rel="stylesheet"]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && !href.startsWith('data:')) {
        assets.stylesheets.push({
          original: href,
          absolute: this.resolveUrl(href, baseUrl),
          element: elem
        });
      }
    });

    // Extract inline styles with @import
    $('style').each((i, elem) => {
      const content = $(elem).html();
      const importMatches = content.match(/@import\s+(?:url\()?['"]?([^'")\s]+)['"]?\)?/g);
      if (importMatches) {
        importMatches.forEach(match => {
          const url = match.match(/['"]?([^'")\s]+)['"]?/)[1];
          if (!url.startsWith('data:')) {
            assets.stylesheets.push({
              original: url,
              absolute: this.resolveUrl(url, baseUrl),
              importRule: true
            });
          }
        });
      }
    });

    return assets;
  }

  /**
   * Strip unsafe elements and attributes
   * Design Decision: Remove all JavaScript and event handlers to create
   * a safe, static replica. Forms are disabled but kept for visual fidelity.
   */
  stripUnsafeContent($) {
    // Remove dangerous tags entirely
    this.STRIP_TAGS.forEach(tag => {
      $(tag).remove();
    });

    // Remove event handler attributes
    $('*').each((i, elem) => {
      this.STRIP_ATTRIBUTES.forEach(attr => {
        $(elem).removeAttr(attr);
      });
    });

    // Disable all forms (keep for visual, but prevent submission)
    $('form').each((i, elem) => {
      $(elem).attr('onsubmit', 'return false;');
      $(elem).removeAttr('action');
    });

    // Disable all input fields
    $('input, textarea, button').each((i, elem) => {
      $(elem).attr('disabled', 'disabled');
    });

    return $;
  }

  /**
   * Rewrite asset URLs in the HTML
   * Design Decision: Replace original URLs with data URLs or updated paths
   */
  rewriteAssets($, assetMap) {
    // Rewrite image sources
    $('img[src]').each((i, elem) => {
      const src = $(elem).attr('src');
      if (assetMap[src]) {
        $(elem).attr('src', assetMap[src]);
      }
    });

    // Rewrite background images in inline styles
    $('[style*="background"]').each((i, elem) => {
      let style = $(elem).attr('style');
      Object.keys(assetMap).forEach(originalUrl => {
        const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedUrl, 'g');
        style = style.replace(regex, assetMap[originalUrl]);
      });
      $(elem).attr('style', style);
    });

    // Rewrite stylesheet links - convert to inline styles
    $('link[rel="stylesheet"]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (assetMap[href]) {
        // Replace link tag with style tag containing the CSS
        const styleTag = `<style type="text/css">${assetMap[href]}</style>`;
        $(elem).replaceWith(styleTag);
      }
    });

    return $;
  }

  /**
   * Process CSS content to rewrite URLs within it
   */
  processCSS(css, baseUrl, assetMap) {
    let processedCSS = css;

    // Find all url() references in CSS
    const urlMatches = css.match(/url\(['"]?([^'")\s]+)['"]?\)/g);
    if (urlMatches) {
      urlMatches.forEach(match => {
        const url = match.match(/url\(['"]?([^'")\s]+)['"]?\)/)[1];
        if (!url.startsWith('data:')) {
          const absoluteUrl = this.resolveUrl(url, baseUrl);
          // If we have a data URL for this asset, use it
          if (assetMap[absoluteUrl]) {
            processedCSS = processedCSS.replace(
              new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
              assetMap[absoluteUrl]
            );
          } else if (assetMap[url]) {
            processedCSS = processedCSS.replace(
              new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
              assetMap[url]
            );
          }
        }
      });
    }

    return processedCSS;
  }

  /**
   * Add a banner to indicate this is a replica
   * Design Decision: Ethical transparency - make it clear this is a replica
   */
  addReplicaBanner($) {
    const banner = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: #f4a261;
        padding: 8px 16px;
        text-align: center;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        border-bottom: 2px solid #f4a261;
        z-index: 999999;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        ⚓ REPLICATED SITE • Original interactivity disabled • For preview purposes only ⚓
      </div>
      <div style="height: 36px;"></div>
    `;

    $('body').prepend(banner);
    return $;
  }

  /**
   * Generate final HTML from cheerio object
   */
  getHTML($) {
    return $.html();
  }
}

module.exports = new Parser();
