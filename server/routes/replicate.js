/**
 * Route: POST /replicate
 *
 * Orchestrates the three MCPs to replicate a website:
 * 1. Fetcher MCP - Downloads the page and assets
 * 2. Parser MCP - Parses HTML and extracts asset URLs
 * 3. Storage MCP - Manages assets and provides data URLs
 *
 * Request body: { url: string }
 * Response: { success: boolean, html: string, error?: string }
 */

const fetcher = require('../mcps/fetcher');
const parser = require('../mcps/parser');
const storage = require('../mcps/storage');

/**
 * Main replication logic
 * Design Decision: Orchestration happens here, MCPs remain focused on
 * their single responsibilities
 */
async function replicate(req, res) {
  const { url } = req.body;

  // Validate input
  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL is required'
    });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL format'
    });
  }

  // Create a session for this replication
  const sessionId = storage.generateSessionId();

  try {
    console.log(`[${sessionId}] Starting replication of: ${url}`);

    // STEP 1: Fetch the HTML page
    console.log(`[${sessionId}] Fetching HTML...`);
    const { html, finalUrl } = await fetcher.fetchHTML(url);

    // STEP 2: Parse HTML and extract assets
    console.log(`[${sessionId}] Parsing HTML...`);
    const $ = parser.parse(html);
    const assets = parser.extractAssets($, finalUrl);

    console.log(`[${sessionId}] Found ${assets.images.length} images, ${assets.stylesheets.length} stylesheets`);

    // STEP 3: Fetch all stylesheets
    console.log(`[${sessionId}] Fetching stylesheets...`);
    const stylesheetPromises = assets.stylesheets.map(async (sheet) => {
      const css = await fetcher.fetchCSS(sheet.absolute, finalUrl);
      if (css) {
        storage.storeAsset(sessionId, sheet.original, css);
        storage.storeAsset(sessionId, sheet.absolute, css);
      }
      return { url: sheet.absolute, success: !!css };
    });

    await Promise.all(stylesheetPromises);

    // STEP 4: Fetch all images (with concurrency limit to avoid overwhelming servers)
    console.log(`[${sessionId}] Fetching images...`);
    const CONCURRENCY = 5;
    const imageResults = [];

    for (let i = 0; i < assets.images.length; i += CONCURRENCY) {
      const batch = assets.images.slice(i, i + CONCURRENCY);
      const batchPromises = batch.map(async (img) => {
        const dataUrl = await fetcher.fetchImage(img.absolute, finalUrl);
        if (dataUrl) {
          storage.storeAsset(sessionId, img.original, dataUrl);
          storage.storeAsset(sessionId, img.absolute, dataUrl);
        }
        return { url: img.absolute, success: !!dataUrl };
      });

      const batchResults = await Promise.all(batchPromises);
      imageResults.push(...batchResults);
    }

    const successfulImages = imageResults.filter(r => r.success).length;
    console.log(`[${sessionId}] Successfully fetched ${successfulImages}/${assets.images.length} images`);

    // STEP 5: Get asset map and process CSS to replace URLs
    const assetMap = storage.getAssetMap(sessionId);

    // Process each stylesheet's CSS to rewrite URLs within it
    const processedAssetMap = { ...assetMap };
    assets.stylesheets.forEach(sheet => {
      const css = assetMap[sheet.original] || assetMap[sheet.absolute];
      if (css && typeof css === 'string') {
        // Process CSS to rewrite URLs if it contains any
        const processedCSS = css.includes('url(')
          ? parser.processCSS(css, finalUrl, assetMap)
          : css;
        processedAssetMap[sheet.original] = processedCSS;
        processedAssetMap[sheet.absolute] = processedCSS;
      }
    });

    // STEP 6: Rewrite HTML with new asset URLs
    console.log(`[${sessionId}] Rewriting HTML...`);
    parser.stripUnsafeContent($);
    parser.rewriteAssets($, processedAssetMap);
    parser.addReplicaBanner($);

    const replicatedHTML = parser.getHTML($);

    // STEP 7: Clean up session (we've embedded everything)
    storage.clearSession(sessionId);

    console.log(`[${sessionId}] Replication complete!`);

    // Return the replicated HTML
    return res.json({
      success: true,
      html: replicatedHTML,
      stats: {
        images: successfulImages,
        totalImages: assets.images.length,
        stylesheets: assets.stylesheets.length
      }
    });

  } catch (error) {
    console.error(`[${sessionId}] Replication failed:`, error.message);

    // Clean up on error
    storage.clearSession(sessionId);

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to replicate website'
    });
  }
}

module.exports = { replicate };
