/**
 * Vercel Serverless Function: Spotify Tracklist & Metadata Fetcher
 */

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { type, id } = req.query;

  const spType = String(type || '').trim().toLowerCase();
  const spId = String(id || '').trim();

  if (!/^(album|track|playlist|artist|episode|show)$/.test(spType) || !/^[a-zA-Z0-9_-]{10,40}$/.test(spId)) {
    return res.status(400).json({ error: 'Invalid Spotify link format' });
  }

  try {
    const embedUrl = `https://open.spotify.com/embed/${spType}/${spId}`;
    let html = '';
    
    try {
      const response = await fetch(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      if (response.ok) {
        html = await response.text();
      }
    } catch (_) {}

    let entity = {};
    let data = {};

    if (html) {
      const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
      if (match) {
        try {
          data = JSON.parse(match[1]);
          const props = data.props || {};
          const pageProps = props.pageProps || {};
          const state = pageProps.state || {};
          const stateData = state.data || {};
          entity = stateData.entity || pageProps.entity || {};
        } catch (_) {}
      }
    }

    // Cover Art extraction
    let coverUrl = '';
    const ca = entity.coverArt;
    if (ca && ca.sources && Array.isArray(ca.sources) && ca.sources.length > 0) {
      coverUrl = ca.sources[0].url || '';
    }
    if (!coverUrl && entity.images && Array.isArray(entity.images) && entity.images.length > 0) {
      coverUrl = entity.images[0].url || '';
    }

    // Fallback to official oEmbed for metadata
    if (!coverUrl || !entity.title) {
      try {
        const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/${spType}/${spId}`;
        const oembedRes = await fetch(oembedUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (oembedRes.ok) {
          const odata = await oembedRes.json();
          if (!coverUrl && odata.thumbnail_url) coverUrl = odata.thumbnail_url;
          if (!entity.title && odata.title) entity.title = odata.title;
          if (!entity.subtitle && odata.author_name) entity.subtitle = odata.author_name;
        }
      } catch (_) {}
    }

    // Parse tracklist
    const rawTracks = Array.isArray(entity.trackList) ? entity.trackList : [];
    let tracks = rawTracks.map(t => ({
      title: String(t.title || t.name || ''),
      artist: String(t.subtitle || t.artist || entity.subtitle || ''),
      durationMs: Number(t.duration || t.durationMs || 0),
      spotifyUri: String(t.uri || `https://open.spotify.com/${spType}/${spId}`),
      isPlayable: Boolean(t.isPlayable !== false)
    })).filter(t => t.title.length > 0);

    // Deep search in data if trackList was not directly found
    if (tracks.length === 0 && data) {
      function deepFindTracks(obj) {
        if (obj && typeof obj === 'object') {
          if (Array.isArray(obj.trackList) && obj.trackList.length > 0) {
            return obj.trackList.map(item => ({
              title: String(item.title || item.name || ''),
              artist: String(item.subtitle || item.artist || entity.subtitle || ''),
              durationMs: Number(item.duration || item.durationMs || 0),
              spotifyUri: String(item.uri || `https://open.spotify.com/${spType}/${spId}`),
              isPlayable: Boolean(item.isPlayable !== false)
            })).filter(t => t.title.length > 0);
          }
          for (const key of Object.keys(obj)) {
            const res = deepFindTracks(obj[key]);
            if (res && res.length > 0) return res;
          }
        }
        return [];
      }
      tracks = deepFindTracks(data);
    }

    // If single track or entity
    if (tracks.length === 0 && (entity.title || entity.name)) {
      tracks.push({
        title: String(entity.title || entity.name || 'Track 1'),
        artist: String(entity.subtitle || entity.artist || ''),
        durationMs: Number(entity.duration || entity.durationMs || 210000),
        spotifyUri: `https://open.spotify.com/${spType}/${spId}`,
        isPlayable: true
      });
    }

    const result = {
      title: String(entity.title || entity.name || 'Spotify Music'),
      artist: String(entity.subtitle || entity.artist || ''),
      coverUrl: coverUrl,
      tracks: tracks
    };

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
    return res.status(200).json(result);

  } catch (err) {
    // If anything throws, return basic fallback instead of 500
    try {
      const oembedRes = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/${spType}/${spId}`);
      if (oembedRes.ok) {
        const odata = await oembedRes.json();
        return res.status(200).json({
          title: odata.title || 'Spotify Music',
          artist: odata.author_name || '',
          coverUrl: odata.thumbnail_url || '',
          tracks: [{
            title: odata.title || 'Track 1',
            artist: odata.author_name || '',
            durationMs: 210000,
            spotifyUri: `https://open.spotify.com/${spType}/${spId}`,
            isPlayable: true
          }]
        });
      }
    } catch (_) {}
    return res.status(500).json({ error: 'Failed to process Spotify request' });
  }
};
