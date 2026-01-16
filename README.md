# ⚓ Website Plunder

A focused web application that replicates public websites as they appear to users — including layout, text content, images, and basic styling — rendered locally in your browser.

## 🎯 What It Does

Given a public website URL, Website Plunder:
- Fetches the HTML page
- Downloads all visible images and stylesheets
- Rewrites asset URLs for local rendering
- Removes JavaScript and unsafe content
- Produces a faithful static replica

**What it does NOT do:**
- Execute JavaScript from the target site
- Handle authentication or private pages
- Replicate dynamic functionality
- Crawl multiple pages

## 🏗️ Architecture

The application follows a clean, modular architecture using **Model Context Protocol (MCP)** modules:

```
┌─────────────────────────────────────────┐
│         POST /replicate                 │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │  Orchestration │
       └───────┬────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐  ┌──▼───┐  ┌──▼─────┐
│Fetcher│  │Parser│  │Storage │
│  MCP  │  │ MCP  │  │  MCP   │
└───────┘  └──────┘  └────────┘
```

### MCP Components

**1. Fetcher MCP** (`server/mcps/fetcher.js`)
- **Responsibility:** All HTTP requests
- Fetches HTML, CSS, images, and other assets
- Applies timeouts and size limits
- Respects robots.txt
- Handles network errors gracefully

**2. Parser MCP** (`server/mcps/parser.js`)
- **Responsibility:** HTML parsing and rewriting
- Parses DOM structure with Cheerio
- Extracts asset URLs (images, stylesheets)
- Converts relative URLs to absolute
- Strips unsafe scripts and event handlers
- Rewrites asset references to use data URLs

**3. Storage MCP** (`server/mcps/storage.js`)
- **Responsibility:** Asset lifecycle management
- Stores assets in memory using data URLs
- Manages session-based storage
- Auto-cleanup of old sessions
- Provides asset map for URL rewriting

### Why These Design Decisions?

**MCP Pattern:** Each module has a single, clear responsibility, making the code:
- Easy to understand and maintain
- Simple to test in isolation
- Straightforward to replace or enhance

**Data URLs:** Assets are converted to base64 data URLs because:
- Eliminates CORS issues
- Simplifies asset management (no filesystem)
- Creates self-contained HTML output
- Perfect for local-first tool

**Cheerio for Parsing:** Instead of a headless browser:
- Much faster and lighter weight
- Sufficient for static replication
- Reliable jQuery-like API
- No browser dependencies

**In-Memory Storage:** For this local tool:
- Fast and simple
- No filesystem permissions needed
- Auto-cleanup prevents leaks
- Scalable enough for single-user local use

## 🚀 Quick Start

### Prerequisites

- Node.js 14.x or higher
- npm or yarn

### Installation

```bash
# Clone or navigate to the repository
cd website-plunder

# Install dependencies
npm install

# Start the server
npm start
```

The application will be available at `http://localhost:3000`

### Usage

1. Open your browser to `http://localhost:3000`
2. Enter a public website URL (e.g., `https://example.com`)
3. Click "⚓ Set Sail"
4. Wait for the replication to complete
5. View the replica in your browser or download the HTML

## 📁 Project Structure

```
website-plunder/
├── server/
│   ├── index.js              # Express server entry point
│   ├── mcps/
│   │   ├── fetcher.js        # MCP: HTTP fetching
│   │   ├── parser.js         # MCP: HTML parsing & rewriting
│   │   └── storage.js        # MCP: Asset storage
│   └── routes/
│       └── replicate.js      # POST /replicate endpoint
├── public/
│   ├── index.html            # Frontend UI
│   ├── styles.css            # Pirate theme CSS
│   └── app.js                # Frontend JavaScript
├── package.json
└── README.md
```

## 🎨 Frontend Features

- **Pirate Theme:** Dark navy background with gold accents
- **Simple Interface:** One input field, one button
- **Real-time Status:** Progress updates during replication
- **Preview Modal:** View replicas in an iframe
- **Download:** Save replicated HTML to disk
- **Error Handling:** Clear error messages for common issues

## ⚙️ Configuration

### Environment Variables

```bash
PORT=3000  # Server port (default: 3000)
```

### Limits (in `server/mcps/fetcher.js`)

```javascript
MAX_HTML_SIZE: 10MB     // Maximum HTML page size
MAX_ASSET_SIZE: 5MB     // Maximum individual asset size
TIMEOUT: 15000          // Request timeout (15 seconds)
```

## 🚧 Known Limitations

1. **JavaScript Execution:** The replica is static. Interactive features won't work.

2. **Single Page Only:** Does not crawl or replicate linked pages.

3. **Large Sites:** Sites with hundreds of images may take time or hit size limits.

4. **Dynamic Content:** Content loaded by JavaScript won't appear in the replica.

5. **Authentication:** Cannot replicate pages requiring login.

6. **Some Modern CSS:** Complex CSS features may not render perfectly.

7. **Fonts:** External fonts may not load if CORS-protected.

8. **robots.txt:** Sites that block bots in robots.txt will be rejected.

## 🔒 Ethical Usage

This tool is for:
- Creating offline backups of public sites you own
- Educational purposes and web development learning
- Archiving public content with permission

This tool is NOT for:
- Bypassing authentication or paywalls
- Copying content without permission
- Violating terms of service
- Commercial content theft

**Always respect:**
- Copyright and intellectual property
- robots.txt directives
- Rate limits and server resources
- Legal and ethical boundaries

## 🐛 Troubleshooting

### "Blocked by robots.txt"
The site explicitly disallows automated access. Respect this.

### "Request timeout"
The site is slow or down. Try again or choose a different site.

### "Failed to fetch HTML"
Check your internet connection and ensure the URL is correct.

### Missing Images
Some images may fail to load due to:
- Size limits (>5MB)
- Access restrictions
- Network errors

These failures are non-fatal and won't stop the replication.

## 📝 API Reference

### POST /replicate

Replicate a website.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "html": "<html>...</html>",
  "stats": {
    "images": 15,
    "totalImages": 20,
    "stylesheets": 3
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message here"
}
```

## 🛠️ Development

### Running in Development Mode

```bash
npm run dev
```

### Code Style

- Clear, descriptive variable names
- Comments explain "why", not "what"
- Each MCP has a single responsibility
- Prefer simplicity over cleverness

### Adding Features

1. Identify which MCP should handle the feature
2. If no existing MCP fits, consider if it's truly needed
3. Keep changes minimal and focused
4. Test with various websites

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please:
- Keep changes focused and simple
- Maintain the single-responsibility principle
- Add comments for complex logic
- Test with multiple websites

## ⚓ Anchors Aweigh!

Built with simplicity, reliability, and fidelity in mind.

*"The best code is code you don't have to write."*
