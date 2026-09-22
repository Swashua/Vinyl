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

cache = {}

class DiscHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/search-yt':
            qs = urllib.parse.parse_qs(parsed.query)
            q = qs.get('q', [''])[0].strip()
            if not q:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"error": "Missing search query"}')
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
                    # Look for videoId patterns in YouTube search results
                    matches = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
                    video_id = None
                    for m in matches:
                        # Exclude common channel or playlist id collisions if any
                        if len(m) == 11 and m not in ('', 'None'):
                            video_id = m
                            break

                    if video_id:
                        cache[q] = video_id
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
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
                return

        if parsed.path == '/api/spotify-tracks':
            qs = urllib.parse.parse_qs(parsed.query)
            sp_type = qs.get('type', [''])[0].strip()
            sp_id   = qs.get('id',   [''])[0].strip()

            if not sp_type or not sp_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"error": "Missing type or id"}')
                return

            cache_key = f'spotify:{sp_type}:{sp_id}'
            if cache_key in cache:
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
                with urllib.request.urlopen(req, timeout=10) as resp:
                    html = resp.read().decode('utf-8', errors='ignore')

                m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
                if not m:
                    self.send_response(404)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(b'{"error": "Could not parse Spotify data"}')
                    return

                data   = json.loads(m.group(1))
                entity = (data.get('props', {})
                              .get('pageProps', {})
                              .get('state', {})
                              .get('data', {})
                              .get('entity', {}))

                raw_tracks = entity.get('trackList', [])
                tracks = []
                for t in raw_tracks:
                    tracks.append({
                        'title':      t.get('title', ''),
                        'artist':     t.get('subtitle', ''),
                        'durationMs': t.get('duration', 0),
                        'spotifyUri': t.get('uri', ''),
                        'isPlayable': t.get('isPlayable', True)
                    })

                # If it's a single track, trackList is empty in embed __NEXT_DATA__, so use entity itself
                if not tracks and (entity.get('title') or entity.get('name')):
                    tracks.append({
                        'title':      entity.get('title') or entity.get('name') or '',
                        'artist':     entity.get('subtitle', ''),
                        'durationMs': entity.get('duration', 0),
                        'spotifyUri': entity.get('uri', ''),
                        'isPlayable': entity.get('isPlayable', True)
                    })

                cover_sources = entity.get('coverArt', {}).get('sources', [])
                cover_url = cover_sources[0].get('url', '') if cover_sources else ''

                result = {
                    'title':    entity.get('title') or entity.get('name') or '',
                    'artist':   entity.get('subtitle', ''),
                    'coverUrl': cover_url,
                    'tracks':   tracks
                }

                cache[cache_key] = result
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode('utf-8'))
                return

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
                return

        return super().do_GET()



class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == '__main__':
    with ReusableTCPServer(("", PORT), DiscHTTPRequestHandler) as httpd:
        print(f"[Disc Server] Serving Disc with full song audio on http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
