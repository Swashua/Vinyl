/**
 * Vercel Serverless Function: YouTube Audio Search
 */

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawQ = String(req.query.q || '').trim();
  const q = rawQ.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 120).trim();

  if (!q) {
    return res.status(400).json({ error: 'Missing or invalid search query' });
  }

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'YouTube search request failed' });
    }

    const html = await response.text();
    let videoId = null;

    // 1. Look for videoRenderer first (accurate search result)
    const vrMatches = html.matchAll(/"videoRenderer":\s*\{\s*"videoId":\s*"([a-zA-Z0-9_-]{11})"/g);
    for (const match of vrMatches) {
      if (match[1] && match[1].length === 11) {
        videoId = match[1];
        break;
      }
    }

    // 2. Fallback to general videoId
    if (!videoId) {
      const matches = html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
      for (const match of matches) {
        if (match[1] && match[1].length === 11) {
          videoId = match[1];
          break;
        }
      }
    }

    if (videoId) {
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
      return res.status(200).json({ videoId });
    } else {
      return res.status(404).json({ error: 'No matching video found' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to execute audio search' });
  }
};
