# Usage Examples

## Getting Started

### 1. Start the Server

```bash
npm start
```

You should see:
```
⚓ ═══════════════════════════════════════════════════ ⚓
   🏴‍☠️  WEBSITE PLUNDER - Ready to Set Sail!  🏴‍☠️
⚓ ═══════════════════════════════════════════════════ ⚓

   ⚓ Server running on: http://localhost:3000
   ⚓ Ready to plunder websites!
```

### 2. Open the Web Interface

Navigate to: `http://localhost:3000`

### 3. Replicate a Website

**Good URLs to try:**
- `https://example.com` - Simple, fast, perfect for testing
- `https://info.cern.ch` - Historic first website
- `http://motherfuckingwebsite.com` - Ultra-minimal site

**What to expect:**
1. Enter a URL in the input field
2. Click "⚓ Set Sail"
3. Watch the status messages:
   - "Preparing to plunder the site..."
   - "Fetching website content..."
4. When complete, you'll see stats about images and stylesheets
5. Click "👁️ View Replica" to preview
6. Click "💾 Download HTML" to save the file

## Using the API Directly

You can also use the API programmatically:

### cURL Example

```bash
curl -X POST http://localhost:3000/replicate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' \
  | jq -r '.html' > replica.html
```

### JavaScript/Node.js Example

```javascript
const axios = require('axios');
const fs = require('fs');

async function replicateSite(url) {
  const response = await axios.post('http://localhost:3000/replicate', {
    url: url
  });

  if (response.data.success) {
    fs.writeFileSync('replica.html', response.data.html);
    console.log('Replica saved!');
    console.log('Stats:', response.data.stats);
  } else {
    console.error('Error:', response.data.error);
  }
}

replicateSite('https://example.com');
```

### Python Example

```python
import requests

def replicate_site(url):
    response = requests.post('http://localhost:3000/replicate', json={
        'url': url
    })

    data = response.json()

    if data['success']:
        with open('replica.html', 'w', encoding='utf-8') as f:
            f.write(data['html'])
        print('Replica saved!')
        print('Stats:', data['stats'])
    else:
        print('Error:', data['error'])

replicate_site('https://example.com')
```

## Common Scenarios

### Scenario 1: Creating an Offline Backup

```bash
# Replicate your blog
curl -X POST http://localhost:3000/replicate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://myblog.com"}' \
  | jq -r '.html' > myblog-backup.html

# Open in browser
open myblog-backup.html
```

### Scenario 2: Comparing Site Versions

```bash
# Replicate site today
curl -X POST http://localhost:3000/replicate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' \
  | jq -r '.html' > site-$(date +%Y%m%d).html

# Replicate again tomorrow and compare
diff site-20250115.html site-20250116.html
```

### Scenario 3: Batch Replication

```bash
#!/bin/bash
# replicate-batch.sh

URLS=(
  "https://example.com"
  "https://example.org"
  "https://example.net"
)

for url in "${URLS[@]}"; do
  echo "Replicating $url..."

  # Extract domain name
  domain=$(echo $url | sed 's/https\?:\/\///' | sed 's/\/.*//')

  # Replicate
  curl -X POST http://localhost:3000/replicate \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"$url\"}" \
    | jq -r '.html' > "replica-${domain}.html"

  echo "Saved to replica-${domain}.html"
  sleep 2  # Be nice to servers
done
```

## Troubleshooting Common Issues

### Issue: "Blocked by robots.txt"

**Cause:** The site explicitly disallows bots.

**Solution:** Respect this. Don't replicate sites that block you.

### Issue: Images are missing

**Cause:**
- Images are larger than 5MB
- Images are behind authentication
- Network timeout

**Solution:** The replica will still be created with broken image links. This is expected behavior for large or protected images.

### Issue: Site looks different

**Possible causes:**
1. **JavaScript-rendered content:** We only capture the initial HTML
2. **Complex CSS:** Some modern CSS features may not work perfectly
3. **External fonts:** May not load due to CORS
4. **Dynamic content:** Content loaded after page load won't appear

**Solution:** This tool is for static replication. For perfect copies, use a screenshot tool instead.

### Issue: Request timeout

**Cause:** Site is slow or down.

**Solution:**
1. Try again later
2. Check your internet connection
3. Verify the URL is correct

## Best Practices

### 1. Start Small

Test with simple sites like `example.com` before trying complex sites.

### 2. Be Respectful

- Don't hammer servers with rapid requests
- Respect robots.txt
- Don't replicate private or paid content

### 3. Check the Output

Always preview replicas before assuming they're perfect. Some sites may not replicate well.

### 4. Use for the Right Purpose

Good:
- Archiving your own content
- Creating offline references
- Learning web development

Bad:
- Stealing content
- Bypassing paywalls
- Commercial use without permission

## Advanced: Customizing Limits

Edit `server/mcps/fetcher.js` to change limits:

```javascript
this.MAX_HTML_SIZE = 10 * 1024 * 1024; // 10MB for HTML
this.MAX_ASSET_SIZE = 5 * 1024 * 1024;  // 5MB for images/CSS
this.TIMEOUT = 15000; // 15 seconds
```

Restart the server after making changes:
```bash
npm start
```

## Need Help?

- Read the main README.md
- Check the code comments in the MCP files
- Open an issue on GitHub
- Remember: This is a simple tool by design!
