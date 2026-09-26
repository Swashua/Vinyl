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
        first_key = next(iter(cache))
        del cache[first_key]
    cache[key] = value

def upgrade_spotify_image_url(url):
    if not url or not isinstance(url, str):
        return url
    url = re.sub(r'ab67616d00004851', 'ab67616d0000b273', url)
    url = re.sub(r'ab67616d00001e02', 'ab67616d0000b273', url)
    url = re.sub(r'ab6761610000f68d', 'ab6761610000e5eb', url)
    url = re.sub(r'ab67616100005174', 'ab6761610000e5eb', url)
    url = re.sub(r'ab67706c0000bebb', 'ab67706c0000da84', url)
    url = re.sub(r'ab67706f00000002', 'ab67706f00000000', url)
    return url

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
            
            if not raw_q:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"error": "Missing search query"}')
                return

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
                    
                    # 1. Look for videoRenderer IDs
                    matches = re.findall(r'"videoRenderer":\s*\{\s*"videoId":\s*"([a-zA-Z0-9_-]{11})"', html)
                    if not matches:
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

            if not re.match(r'^(album|track|playlist|artist|episode|show)$', sp_type) or not re.match(r'^[a-zA-Z0-9_-]{10,40}$', sp_id):
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
                title = ''
                artist = ''
                cover_url = ''
                tracks = []

                # 1. Try Spotify Embed HTML (especially for playlists)
                embed_url = f'https://open.spotify.com/embed/{sp_type}/{sp_id}'
                req = urllib.request.Request(embed_url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9'
                })
                
                try:
                    with urllib.request.urlopen(req, timeout=6) as resp:
                        html = resp.read().decode('utf-8', errors='ignore')
                        
                        # Spotify.Entity
                        m_ent = re.search(r'Spotify\.Entity\s*=\s*({.+?});\s*</script>', html, re.DOTALL)
                        if m_ent:
                            try:
                                ent = json.loads(m_ent.group(1))
                                title = ent.get('name') or ent.get('title') or ''
                                if isinstance(ent.get('artists'), list):
                                    artist = ', '.join([a.get('name', '') for a in ent.get('artists', []) if a.get('name')])
                                else:
                                    artist = ent.get('subtitle', '')
                                
                                ca = ent.get('cover_art')
                                if isinstance(ca, dict) and isinstance(ca.get('sources'), list) and len(ca['sources']) > 0:
                                    cover_url = str(ca['sources'][0].get('url', ''))

                                if isinstance(ent.get('trackList'), list) and len(ent['trackList']) > 0:
                                    for idx, t in enumerate(ent['trackList']):
                                        t_title = t.get('name') or t.get('title') or f'Track {idx+1}'
                                        t_art = artist
                                        if isinstance(t.get('artists'), list):
                                            t_art = ', '.join([a.get('name', '') for a in t['artists'] if a.get('name')]) or artist
                                        tracks.append({
                                            'number': t.get('track_number') or (idx + 1),
                                            'title': str(t_title),
                                            'artist': str(t_art),
                                            'durationMs': int(t.get('duration') or 0),
                                            'previewUrl': str(t.get('audio_preview_url') or ''),
                                            'spotifyUri': str(t.get('uri') or f'https://open.spotify.com/track/{t.get("id", "")}'),
                                            'isPlayable': True
                                        })
                            except Exception:
                                pass

                        # __NEXT_DATA__
                        if not tracks:
                            m_next = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.+?)</script>', html, re.DOTALL)
                            if m_next:
                                try:
                                    nd = json.loads(m_next.group(1))
                                    props = nd.get('props', {}).get('pageProps', {})
                                    ent = props.get('state', {}).get('data', {}).get('entity') or props.get('entity') or {}
                                    if not title: title = ent.get('name') or ent.get('title') or ''
                                    if not artist:
                                        if isinstance(ent.get('artists'), list):
                                            artist = ', '.join([a.get('name', '') for a in ent.get('artists', []) if a.get('name')])
                                        else:
                                            artist = ent.get('subtitle', '')
                                    if not cover_url and isinstance(ent.get('coverArt', {}).get('sources'), list) and len(ent['coverArt']['sources']) > 0:
                                        cover_url = ent['coverArt']['sources'][0].get('url', '')

                                    if isinstance(ent.get('trackList'), list) and len(ent['trackList']) > 0:
                                        for idx, t in enumerate(ent['trackList']):
                                            tracks.append({
                                                'number': t.get('track_number') or (idx + 1),
                                                'title': str(t.get('name') or t.get('title') or f'Track {idx+1}'),
                                                'artist': str(t.get('subtitle') or t.get('artist') or artist),
                                                'durationMs': int(t.get('duration') or 0),
                                                'previewUrl': str(t.get('audio_preview_url') or ''),
                                                'spotifyUri': str(t.get('uri') or ''),
                                                'isPlayable': True
                                            })
                                except Exception:
                                    pass
                except Exception:
                    pass

                # 2. Try oEmbed for title / artist
                if not title or not artist or not cover_url:
                    try:
                        oembed_url = f'https://open.spotify.com/oembed?url=https://open.spotify.com/{sp_type}/{sp_id}'
                        oreq = urllib.request.Request(oembed_url, headers={'User-Agent': 'Mozilla/5.0'})
                        with urllib.request.urlopen(oreq, timeout=4) as oresp:
                            odata = json.loads(oresp.read().decode('utf-8'))
                            if not title and odata.get('title'): title = odata['title']
                            if not artist and odata.get('author_name'): artist = odata['author_name']
                            if not cover_url and odata.get('thumbnail_url'): cover_url = odata['thumbnail_url']
                    except Exception:
                        pass

                # 3. For Albums or when tracklist is incomplete, resolve exact tracks via Deezer / iTunes API
                if (sp_type == 'album' or len(tracks) <= 1) and (title or artist):
                    query = f"{title} {artist}".strip()
                    # Deezer API
                    try:
                        dz_url = f"https://api.deezer.com/search/album?q={urllib.parse.quote(query)}"
                        dz_req = urllib.request.Request(dz_url, headers={'User-Agent': 'Mozilla/5.0'})
                        with urllib.request.urlopen(dz_req, timeout=4) as dz_resp:
                            dz_data = json.loads(dz_resp.read().decode('utf-8'))
                            albums = dz_data.get('data', [])
                            if albums:
                                alb = albums[0]
                                alb_id = alb.get('id')
                                if not cover_url and alb.get('cover_xl'): cover_url = alb['cover_xl']

                                dz_alb_url = f"https://api.deezer.com/album/{alb_id}"
                                with urllib.request.urlopen(urllib.request.Request(dz_alb_url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=4) as full_resp:
                                    full_alb = json.loads(full_resp.read().decode('utf-8'))
                                    dz_tracks = full_alb.get('tracks', {}).get('data', [])
                                    if dz_tracks:
                                        tracks = []
                                        for idx, t in enumerate(dz_tracks):
                                            tracks.append({
                                                'number': t.get('track_position') or (idx + 1),
                                                'title': str(t.get('title', f'Track {idx+1}')),
                                                'artist': str(t.get('artist', {}).get('name', alb.get('artist', {}).get('name', artist))),
                                                'durationMs': int((t.get('duration', 0)) * 1000),
                                                'previewUrl': str(t.get('preview', '')),
                                                'spotifyUri': str(t.get('link', f'https://open.spotify.com/album/{sp_id}')),
                                                'isPlayable': True
                                            })
                                        if not cover_url:
                                            cover_url = full_alb.get('cover_xl') or full_alb.get('cover_big') or cover_url
                    except Exception:
                        pass

                    # iTunes API fallback
                    if not tracks:
                        try:
                            it_url = f"https://itunes.apple.com/search?term={urllib.parse.quote(query)}&entity=album&limit=1"
                            with urllib.request.urlopen(urllib.request.Request(it_url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=4) as it_resp:
                                it_data = json.loads(it_resp.read().decode('utf-8'))
                                results = it_data.get('results', [])
                                if results:
                                    col_id = results[0].get('collectionId')
                                    if not cover_url and results[0].get('artworkUrl100'):
                                        cover_url = results[0]['artworkUrl100'].replace('100x100bb.jpg', '1400x1400bb.jpg')
                                    lk_url = f"https://itunes.apple.com/lookup?id={col_id}&entity=song"
                                    with urllib.request.urlopen(urllib.request.Request(lk_url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=4) as lk_resp:
                                        lk_data = json.loads(lk_resp.read().decode('utf-8'))
                                        songs = [r for r in lk_data.get('results', []) if r.get('wrapperType') == 'track']
                                        if songs:
                                            tracks = []
                                            for idx, s in enumerate(songs):
                                                tracks.append({
                                                    'number': s.get('trackNumber') or (idx + 1),
                                                    'title': str(s.get('trackName', f'Track {idx+1}')),
                                                    'artist': str(s.get('artistName', artist)),
                                                    'durationMs': int(s.get('trackTimeMillis', 0)),
                                                    'previewUrl': str(s.get('previewUrl', '')),
                                                    'spotifyUri': str(s.get('trackViewUrl', f'https://open.spotify.com/album/{sp_id}')),
                                                    'isPlayable': True
                                                })
                        except Exception:
                            pass

                # 4. For single track requests
                if spType == 'track' and not tracks and (title or artist):
                    query = f"{title} {artist}".strip()
                    try:
                        dz_trk_url = f"https://api.deezer.com/search/track?q={urllib.parse.quote(query)}"
                        with urllib.request.urlopen(urllib.request.Request(dz_trk_url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=4) as dz_tr_resp:
                            dz_tr_data = json.loads(dz_tr_resp.read().decode('utf-8'))
                            tr_list = dz_tr_data.get('data', [])
                            if tr_list:
                                t = tr_list[0]
                                tracks = [{
                                    'number': 1,
                                    'title': str(t.get('title') or title),
                                    'artist': str(t.get('artist', {}).get('name') or artist),
                                    'durationMs': int(t.get('duration', 0) * 1000),
                                    'previewUrl': str(t.get('preview', '')),
                                    'spotifyUri': f'https://open.spotify.com/track/{sp_id}',
                                    'isPlayable': True
                                }]
                                if not cover_url and t.get('album'):
                                    cover_url = t['album'].get('cover_xl') or t['album'].get('cover_big') or cover_url
                    except Exception:
                        pass

                if not tracks:
                    tracks = [{
                        'number': 1,
                        'title': title or 'Track 1',
                        'artist': artist or 'Artist',
                        'durationMs': 210000,
                        'previewUrl': '',
                        'spotifyUri': f'https://open.spotify.com/{sp_type}/{sp_id}',
                        'isPlayable': True
                    }]

                cover_url = upgrade_spotify_image_url(cover_url)

                result = {
                    'title':    title or 'Spotify Music',
                    'artist':   artist or '',
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

            except Exception as err:
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
