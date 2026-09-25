import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import re
import sys
import os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3001
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Bounded Cache to prevent memory exhaustion / DoS
MAX_CACHE_ENTRIES = 500
cache = {}

def add_to_cache(key, value):
    if len(cache) >= MAX_CACHE_ENTRIES:
        # Evict first key
        first_key = next(iter(cache))
        del cache[first_key]
    cache[key] = value

class DiscHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Security Headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        super().end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        # --- YouTube Search Endpoint ---
        if parsed.path == '/api/search-yt':
            qs = urllib.parse.parse_qs(parsed.query)
            raw_q = qs.get('q', [''])[0].strip()
            
            # Input validation & sanitization
            if not raw_q:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"error": "Missing search query"}')
                return

            # Sanitize control characters and enforce max length to prevent abuse
            q = re.sub(r'[\x00-\x1f\x7f]', '', raw_q)[:120].strip()
            if not q:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"error": "Invalid search query"}')
                return

            if q in cache:
                vid = cache[q]
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'videoId': vid}).encode('utf-8'))
                return

            try:
                search_url = 'https://www.youtube.com/results?search_query=' + urllib.parse.quote(q)
                req = urllib.request.Request(search_url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9'
                })
                with urllib.request.urlopen(req, timeout=6) as resp:
                    html = resp.read().decode('utf-8', errors='ignore')
                    matches = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
                    video_id = None
                    for m in matches:
                        if len(m) == 11 and m not in ('', 'None'):
                            video_id = m
                            break

                    if video_id:
                        add_to_cache(q, video_id)
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps({'videoId': video_id}).encode('utf-8'))
                        return
                    else:
                        self.send_response(404)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(b'{"error": "No matching video found"}')
                        return
            except Exception:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"error": "Audio search request failed"}')
                return

        # --- Spotify Tracks Endpoint ---
        if parsed.path == '/api/spotify-tracks':
            qs = urllib.parse.parse_qs(parsed.query)
            sp_type = qs.get('type', [''])[0].strip().lower()
            sp_id   = qs.get('id',   [''])[0].strip()

            # Strict SSRF & Input Validation: type must be valid enum, id must be alphanumeric base62
            if not re.match(r'^(album|track|playlist|artist)$', sp_type) or not re.match(r'^[a-zA-Z0-9_-]{10,40}$', sp_id):
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"error": "Invalid Spotify entity type or id format"}')
                return

            cache_key = f'spotify:{sp_type}:{sp_id}'
            if cache_key in cache and cache[cache_key].get('tracks') and len(cache[cache_key]['tracks']) > 0:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(cache[cache_key]).encode('utf-8'))
                return

            try:
                embed_url = f'https://open.spotify.com/embed/{sp_type}/{sp_id}'
                req = urllib.request.Request(embed_url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9'
                })
                
                html = ''
                try:
                    with urllib.request.urlopen(req, timeout=8) as resp:
                        html = resp.read().decode('utf-8', errors='ignore')
                except Exception:
                    pass

                entity = {}
                data = {}
                if html:
                    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
                    if m:
                        try:
                            data = json.loads(m.group(1))
                            props = data.get('props') or {}
                            page_props = props.get('pageProps') or {}
                            state = page_props.get('state') or {}
                            state_data = state.get('data') or {}
                            entity = state_data.get('entity') or page_props.get('entity') or {}
                        except Exception:
                            pass

                # Safe cover extraction
                cover_url = ''
                ca = entity.get('coverArt')
                if isinstance(ca, dict):
                    sources = ca.get('sources')
                    if sources and isinstance(sources, list) and len(sources) > 0 and isinstance(sources[0], dict):
                        cover_url = str(sources[0].get('url', ''))
                
                if not cover_url:
                    imgs = entity.get('images')
                    if isinstance(imgs, list) and len(imgs) > 0 and isinstance(imgs[0], dict):
                        cover_url = str(imgs[0].get('url', ''))

                # Fallback to oEmbed for cover/title if missing
                if not cover_url or not entity.get('title'):
                    try:
                        oembed_url = f'https://open.spotify.com/oembed?url=https://open.spotify.com/{sp_type}/{sp_id}'
                        oreq = urllib.request.Request(oembed_url, headers={'User-Agent': 'Mozilla/5.0'})
                        with urllib.request.urlopen(oreq, timeout=5) as oresp:
                            odata = json.loads(oresp.read().decode('utf-8'))
                            if not cover_url and odata.get('thumbnail_url'):
                                cover_url = str(odata.get('thumbnail_url'))
                            if not entity.get('title') and odata.get('title'):
                                entity['title'] = str(odata.get('title'))
                    except Exception:
                        pass

                # Sanitize coverUrl (must be valid http/https URL)
                if cover_url and not (cover_url.startswith('https://') or cover_url.startswith('http://')):
                    cover_url = ''

                # 1. Primary: trackList array on entity
                raw_tracks = entity.get('trackList') or []
                if not isinstance(raw_tracks, list):
                    raw_tracks = []

                tracks = []
                for t in raw_tracks:
                    if isinstance(t, dict):
                        tracks.append({
                            'title':      str(t.get('title') or t.get('name') or ''),
                            'artist':     str(t.get('subtitle') or t.get('artist') or ''),
                            'durationMs': int(t.get('duration') or t.get('durationMs') or 0),
                            'spotifyUri': str(t.get('uri') or ''),
                            'isPlayable': bool(t.get('isPlayable', True))
                        })

                # 2. Secondary: deep recursive search in data if trackList was empty
                if not tracks and data:
                    def deep_find_tracks_inner(obj):
                        if isinstance(obj, dict):
                            if 'trackList' in obj and isinstance(obj['trackList'], list) and len(obj['trackList']) > 0:
                                res = []
                                for item in obj['trackList']:
                                    if isinstance(item, dict):
                                        res.append({
                                            'title': str(item.get('title') or item.get('name') or ''),
                                            'artist': str(item.get('subtitle') or item.get('artist') or ''),
                                            'durationMs': int(item.get('duration') or item.get('durationMs') or 0),
                                            'spotifyUri': str(item.get('uri') or ''),
                                            'isPlayable': bool(item.get('isPlayable', True))
                                        })
                                if res: return res
                            for k, v in obj.items():
                                r = deep_find_tracks_inner(v)
                                if r: return r
                        elif isinstance(obj, list):
                            for item in obj:
                                r = deep_find_tracks_inner(item)
                                if r: return r
                        return []
                    tracks = deep_find_tracks_inner(data)

                # 3. Tertiary: If single track
                if not tracks and (entity.get('title') or entity.get('name')):
                    tracks.append({
                        'title':      str(entity.get('title') or entity.get('name') or ''),
                        'artist':     str(entity.get('subtitle') or entity.get('artist') or ''),
                        'durationMs': int(entity.get('duration') or entity.get('durationMs') or 0),
                        'spotifyUri': str(entity.get('uri') or ''),
                        'isPlayable': bool(entity.get('isPlayable', True))
                    })

                result = {
                    'title':    str(entity.get('title') or entity.get('name') or 'Spotify Music'),
                    'artist':   str(entity.get('subtitle', '')),
                    'coverUrl': cover_url,
                    'tracks':   tracks
                }

                if tracks:
                    add_to_cache(cache_key, result)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode('utf-8'))
                return

            except Exception:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"error": "Failed to process Spotify tracks request"}')
                return

        return super().do_GET()


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == '__main__':
    with ReusableTCPServer(("", PORT), DiscHTTPRequestHandler) as httpd:
        print(f"[Disc Server] Serving Disc securely on http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
