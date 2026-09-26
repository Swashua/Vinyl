/**
 * Vinyl Showcase
 * - Clean home page (no persistent search bar).
 * - Clicking an empty album opens it to the left and pops up the Spotify search bar in the right tab.
 * - When loaded with songs: vinyl cover & disk on the left, song list on the right.
 */

(() => {
  'use strict';

  // --- Configuration ---
  const TOTAL_ALBUMS = 48;
  const TONES = ['slate', 'monochrome', 'obsidian', 'warm-charcoal', 'pure-matte', 'kraft-card'];

  // --- DOM Elements ---
  const viewport = document.getElementById('viewport');
  const carouselRing = document.getElementById('carouselRing');
  const stageBackdrop = document.getElementById('stageBackdrop');
  const inspectionStage = document.getElementById('inspectionStage');
  const stageContentWrap = document.getElementById('stageContentWrap');
  const stageVinylAnchor = document.getElementById('stageVinylAnchor');
  const stageEmptySearch = document.getElementById('stageEmptySearch');
  const stageAlbum = document.getElementById('stageAlbum');
  const stageDisc = document.getElementById('stageDisc');
  const discRotator = document.getElementById('discRotator');
  const stageJacketSurface = document.getElementById('stageJacketSurface');
  const stageDiscLabel = document.getElementById('stageDiscLabel');
  const stageMusicTab = document.getElementById('stageMusicTab');
  const stageTabToggle = document.getElementById('stageTabToggle');
  const musicAlbumTitle = document.getElementById('musicAlbumTitle');
  const stageCloseBtn = document.getElementById('stageCloseBtn');

  // Audio Playback & Native Player Elements
  const nativeAudioPlayer = document.getElementById('nativeAudioPlayer');
  const nowPlayingBadge = document.getElementById('nowPlayingBadge');
  const tracklistBadgeText = document.getElementById('tracklistBadgeText');
  const audioPlayToggleBtn = document.getElementById('audioPlayToggleBtn');
  const audioPlayBtnText = document.getElementById('audioPlayBtnText');

  // Native Spotify-Styled Player Elements
  const nativePlayerCard = document.getElementById('nativePlayerCard');
  const playerCoverThumb = document.getElementById('playerCoverThumb');
  const playerTrackTitle = document.getElementById('playerTrackTitle');
  const playerTrackArtist = document.getElementById('playerTrackArtist');
  const playerShuffleBtn = document.getElementById('playerShuffleBtn');
  const playerPrevBtn = document.getElementById('playerPrevBtn');
  const playerPlayBtn = document.getElementById('playerPlayBtn');
  const playerNextBtn = document.getElementById('playerNextBtn');
  const playbackProgressSection = document.getElementById('playbackProgressSection');
  const progressCurrentTime = document.getElementById('progressCurrentTime');
  const progressBarBg = document.getElementById('progressBarBg');
  const progressBarFill = document.getElementById('progressBarFill');
  const progressBarThumb = document.getElementById('progressBarThumb');
  const progressDurationTime = document.getElementById('progressDurationTime');
  const tracklistScrollArea = document.getElementById('tracklistScrollArea');

  // Thin Volume Slider Elements (Positioned right below the playback white line)
  const volumeSliderBar = document.getElementById('volumeSliderBar');
  const volumeSpeakerBtn = document.getElementById('volumeSpeakerBtn');
  const volumeSpeakerIcon = document.getElementById('volumeSpeakerIcon');
  const volumeTrackBg = document.getElementById('volumeTrackBg');
  const volumeTrackFill = document.getElementById('volumeTrackFill');
  const volumeThumb = document.getElementById('volumeThumb');
  const volumeTooltip = document.getElementById('volumeTooltip');

  // Save & Edit Action Buttons
  const saveAlbumBtn = document.getElementById('saveAlbumBtn');
  const saveBtnText = document.getElementById('saveBtnText');
  const editAlbumBtn = document.getElementById('editAlbumBtn');
  const inlineEditBar = document.getElementById('inlineEditBar');
  const inlineEditForm = document.getElementById('inlineEditForm');
  const inlineEditInput = document.getElementById('inlineEditInput');
  const inlineEditSubmitBtn = document.getElementById('inlineEditSubmitBtn');
  const inlineEditCancelBtn = document.getElementById('inlineEditCancelBtn');
  const clearAlbumBtn = document.getElementById('clearAlbumBtn');
  const inlineEditError = document.getElementById('inlineEditError');

  // Empty State Spotify Search Form
  const spotifyForm = document.getElementById('spotifyForm');
  const spotifyUrlInput = document.getElementById('spotifyUrlInput');
  const loadSpotifyBtn = document.getElementById('loadSpotifyBtn');
  const spotifyErrorMsg = document.getElementById('spotifyErrorMsg');

  // --- LocalStorage Persistence System ---
  // v2: wiped v1 stale iTunes data — Spotify only from here on
  const STORAGE_KEY = 'disc_saved_albums_v2';

  // Helper to upgrade any low-res / thumbnail Spotify image URL to full maximum resolution (640x640 HD)
  function upgradeSpotifyImageUrl(url) {
    if (!url || typeof url !== 'string') return url;
    let upgraded = url;
    // Spotify album/track covers: 64x64 (4851) & 300x300 (1e02) -> 640x640 (b273)
    upgraded = upgraded.replace(/ab67616d00004851/g, 'ab67616d0000b273');
    upgraded = upgraded.replace(/ab67616d00001e02/g, 'ab67616d0000b273');
    // Spotify artist images: 64x64 (f68d) & 300x300 (5174) -> 640x640 (e5eb)
    upgraded = upgraded.replace(/ab6761610000f68d/g, 'ab6761610000e5eb');
    upgraded = upgraded.replace(/ab67616100005174/g, 'ab6761610000e5eb');
    // Spotify playlist/user custom images: 300x300 (bebb) -> 640x640 (da84)
    upgraded = upgraded.replace(/ab67706c0000bebb/g, 'ab67706c0000da84');
    upgraded = upgraded.replace(/ab67706f00000002/g, 'ab67706f00000000');
    return upgraded;
  }

  function getSavedAlbums() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return {};
      const parsed = JSON.parse(data);
      for (const k of Object.keys(parsed)) {
        if (parsed[k] && parsed[k].coverUrl) {
          parsed[k].coverUrl = upgradeSpotifyImageUrl(parsed[k].coverUrl);
        }
      }
      return parsed;
    } catch (e) {
      console.warn('Could not read from localStorage', e);
      return {};
    }
  }

  function saveAlbumToStorage(index, albumData) {
    try {
      const saved = getSavedAlbums();
      saved[index] = albumData;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      return true;
    } catch (e) {
      console.warn('Could not write to localStorage', e);
      return false;
    }
  }

  function removeAlbumFromStorage(index) {
    try {
      const saved = getSavedAlbums();
      delete saved[index];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      return true;
    } catch (e) {
      console.warn('Could not remove from localStorage', e);
      return false;
    }
  }


  // --- State Variables ---
  let albums = [];
  let radius = 640;
  let currentRotation = 0;
  let angularVelocity = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let lastPointerX = 0;
  let lastPointerTime = 0;
  let hasDragged = false;
  let downTargetCard = null;
  let activeAlbum = null;
  let isTransitioning = false;
  let pointerHistory = [];

  // --- Initialize 3D Circle of Spines (Restores Saved Albums from Storage) ---
  function initCircle() {
    carouselRing.innerHTML = '';
    albums = [];

    updateRadius();

    const angleStep = 360 / TOTAL_ALBUMS;
    const savedAlbums = getSavedAlbums();

    for (let i = 0; i < TOTAL_ALBUMS; i++) {
      const tone = TONES[i % TONES.length];
      const theta = i * angleStep;

      const card = document.createElement('div');
      card.className = 'spine-card';
      card.dataset.index = i;
      card.dataset.tone = tone;

      card.style.transform = `rotateY(${theta}deg) translateZ(-${radius}px)`;

      card.innerHTML = `
        <div class="spine-face spine-front">
          <div class="spine-surface"></div>
          <div class="spine-fold-left"></div>
          <div class="spine-fold-right"></div>
          <div class="spine-light-sheen"></div>
        </div>
        <div class="spine-face spine-left"></div>
        <div class="spine-face spine-right"></div>
        <div class="spine-face spine-top">
          <div class="spine-slit"></div>
        </div>
        <div class="spine-face spine-bottom"></div>
        <div class="spine-shadow"></div>
      `;

      // Check if this spine has a saved record in localStorage
      const saved = savedAlbums[i];
      const customAlbum = (saved && (saved.coverUrl || saved.spotifyUrl || saved.id)) ? saved : null;

      if (customAlbum) {
        card.classList.add('has-saved-record');
        const frontSurface = card.querySelector('.spine-surface');
        if (frontSurface && customAlbum.coverUrl) {
          frontSurface.style.backgroundImage = `url('${customAlbum.coverUrl}')`;
        }
      }

      // Direct click listener fallback for immediate and reliable opening
      card.addEventListener('click', (e) => {
        if (activeAlbum || isTransitioning || hasDragged) return;
        openAlbum(i);
      });

      carouselRing.appendChild(card);
      albums.push({
        element: card,
        sheen: card.querySelector('.spine-light-sheen'),
        tone: tone,
        index: i,
        theta: theta,
        customAlbum: customAlbum,
        isSaved: !!customAlbum
      });
    }

    currentRotation = 0;
    angularVelocity = 0;

    // If there are saved albums, rotate so the first one faces front
    const firstSavedIdx = albums.findIndex(a => a.customAlbum);
    if (firstSavedIdx !== -1) {
      currentRotation = -albums[firstSavedIdx].theta;
    }

    updateLightingAndVisibility();
  }

  // --- Calculate Radius ---
  function updateRadius() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    radius = Math.max(560, Math.min(w * 0.52, h * 0.85, 750));

    if (albums.length > 0) {
      for (let i = 0; i < albums.length; i++) {
        const item = albums[i];
        item.element.style.transform = `rotateY(${item.theta}deg) translateZ(-${radius}px)`;
      }
    }
  }

  // --- Dynamic Lighting and Peripheral Culling ---
  function updateLightingAndVisibility() {
    for (let i = 0; i < albums.length; i++) {
      const item = albums[i];
      if (item === activeAlbum) continue;

      let relAngle = ((item.theta + currentRotation) % 360 + 540) % 360 - 180;
      const absAngle = Math.abs(relAngle);

      if (absAngle > 84) {
        item.element.style.display = 'none';
        item.element.style.opacity = '0';
        item.element.style.pointerEvents = 'none';
      } else {
        item.element.style.display = 'block';

        const rad = (relAngle * Math.PI) / 180;
        const cosAngle = Math.cos(rad);
        const brightness = 0.65 + 0.35 * cosAngle;
        const sheenOpacity = Math.pow(Math.max(0, cosAngle), 3) * 0.45;
        const edgeFade = absAngle > 66 ? Math.max(0, (84 - absAngle) / 18) : 1;

        item.element.style.opacity = edgeFade.toFixed(3);
        item.element.style.filter = `brightness(${brightness.toFixed(3)})`;
        item.element.style.pointerEvents = absAngle > 76 ? 'none' : 'auto';

        if (item.sheen) {
          item.sheen.style.opacity = sheenOpacity.toFixed(3);
        }
      }
    }
  }

  // --- Parse Spotify URL or URI ---
  function parseSpotifyUrl(url) {
    if (!url) return null;
    url = url.trim();

    // 1. Extract URL if text was copied with it (e.g. from mobile share sheet)
    const urlMatch = url.match(/https?:\/\/[^\s]+/i);
    const targetUrl = urlMatch ? urlMatch[0] : url;

    // 2. Matches /(intl-xx/)?(album|track|playlist|artist|episode|show)/ID
    const webMatch = targetUrl.match(/(?:intl-[a-z]{2,4}\/)?(album|track|playlist|artist|episode|show)\/([a-zA-Z0-9_-]{15,40})/i);
    if (webMatch) {
      const type = webMatch[1].toLowerCase();
      const id = webMatch[2];
      return { 
        type, 
        id, 
        cleanUrl: `https://open.spotify.com/${type}/${id}` 
      };
    }

    // 3. Matches spotify:(album|track|playlist|artist|episode|show):ID
    const uriMatch = targetUrl.match(/spotify:(album|track|playlist|artist|episode|show):([a-zA-Z0-9_-]{15,40})/i);
    if (uriMatch) {
      const type = uriMatch[1].toLowerCase();
      const id = uriMatch[2];
      return { 
        type, 
        id, 
        cleanUrl: `https://open.spotify.com/${type}/${id}` 
      };
    }

    // 4. Matches direct 22-char Spotify ID
    const rawMatch = targetUrl.match(/^[a-zA-Z0-9]{22}$/);
    if (rawMatch) {
      return { 
        type: 'track', 
        id: targetUrl, 
        cleanUrl: `https://open.spotify.com/track/${targetUrl}` 
      };
    }

    return null;
  }

  // --- Save Button Visual State ---
  function updateSaveButtonState(isSaved) {
    if (!saveAlbumBtn) return;
    if (isSaved) {
      saveAlbumBtn.classList.add('is-saved');
      saveBtnText.textContent = 'Saved ✓';
      saveAlbumBtn.title = 'Saved to shelf (stays after refreshing)';
    } else {
      saveAlbumBtn.classList.remove('is-saved');
      saveBtnText.textContent = 'Save';
      saveAlbumBtn.title = 'Save song to shelf (stays after refreshing)';
    }
  }

  // --- Load Spotify Album into the active vinyl ---
  async function loadSpotifyAlbumIntoActive(url, isInline = false) {
    if (!activeAlbum) return;

    const parsed = parseSpotifyUrl(url);
    if (!parsed) {
      const errMsg = 'Please enter a valid Spotify link (song, album, or playlist).';
      if (isInline) inlineEditError.textContent = errMsg;
      else spotifyErrorMsg.textContent = errMsg;
      return;
    }

    const cleanSpotifyUrl = parsed.cleanUrl || `https://open.spotify.com/${parsed.type}/${parsed.id}`;
    let albumData = null;

    if (isInline) {
      inlineEditError.textContent = '';
      inlineEditSubmitBtn.textContent = 'Updating...';
      inlineEditSubmitBtn.disabled = true;
    } else {
      spotifyErrorMsg.textContent = '';
      loadSpotifyBtn.textContent = 'Loading...';
      loadSpotifyBtn.disabled = true;
    }

    try {
      let data = null;

      // 1. Try backend/serverless endpoint first
      try {
        const res = await fetch(`/api/spotify-tracks?type=${parsed.type}&id=${parsed.id}`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json && !json.error && ((json.tracks && json.tracks.length > 0) || json.coverUrl || json.title)) {
            data = json;
          }
        }
      } catch (backendErr) {
        console.warn('Backend Spotify fetch error, falling back to direct oEmbed & iTunes/Deezer:', backendErr);
      }

      // 2. Client-side direct Spotify official public oEmbed API + iTunes/Deezer fallback
      if (!data || !data.tracks || data.tracks.length <= 1) {
        try {
          const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(cleanSpotifyUrl)}`;
          const oembedRes = await fetch(oembedUrl);
          if (oembedRes.ok) {
            const odata = await oembedRes.json();
            const oTitle = odata.title || (data && data.title) || '';
            const oArtist = odata.author_name || (data && data.artist) || '';
            const oCover = odata.thumbnail_url || (data && data.coverUrl) || '';

            // Query Deezer / iTunes for full authentic tracks
            const fullAlb = await fetchFullAlbumTracklist(oTitle, oArtist);
            if (fullAlb && fullAlb.tracks && fullAlb.tracks.length > 0) {
              data = {
                title: oTitle || fullAlb.title || 'Music Album',
                artist: oArtist || fullAlb.artist || '',
                coverUrl: fullAlb.coverUrl || oCover || '',
                tracks: fullAlb.tracks
              };
            } else {
              data = {
                title: oTitle || (data && data.title) || (parsed.type === 'playlist' ? 'Custom Playlist' : 'Spotify Music'),
                artist: oArtist || (data && data.artist) || '',
                coverUrl: oCover || (data && data.coverUrl) || '',
                tracks: (data && data.tracks && data.tracks.length > 0) ? data.tracks : [
                  {
                    number: 1,
                    title: oTitle || 'Track 1',
                    artist: oArtist || '',
                    durationMs: 210000,
                    durationStr: '3:30',
                    previewUrl: '',
                    spotifyUri: cleanSpotifyUrl,
                    isPlayable: true
                  }
                ]
              };
            }
          }
        } catch (oembedErr) {
          console.warn('Spotify oEmbed fetch error:', oembedErr);
        }
      }

      if (!data) {
        throw new Error('Could not fetch Spotify link. Please ensure it is a valid, public Spotify URL.');
      }

      albumData = {
        title: data.title || (parsed.type === 'playlist' ? 'Custom Playlist' : 'Spotify Music'),
        artist: data.artist || '',
        coverUrl: upgradeSpotifyImageUrl(data.coverUrl || ''),
        spotifyUrl: cleanSpotifyUrl,
        type: parsed.type,
        id: parsed.id,
        tracks: data.tracks || []
      };

      // Save to active album & persist to localStorage so song stays after refresh
      activeAlbum.customAlbum = albumData;
      activeAlbum.isSaved = true;
      saveAlbumToStorage(activeAlbum.index, albumData);

      // Update the spine in the circle with the album artwork
      const frontSurface = activeAlbum.element.querySelector('.spine-surface');
      if (frontSurface && albumData.coverUrl) {
        frontSurface.style.backgroundImage = `url('${albumData.coverUrl}')`;
      }
      activeAlbum.element.classList.add('has-saved-record');

      // Update Save button state
      updateSaveButtonState(true);

      // 1. Update artwork on jacket & disc label
      if (albumData.coverUrl) {
        stageJacketSurface.style.backgroundImage = `url('${albumData.coverUrl}')`;
        stageDiscLabel.style.backgroundImage = `url('${albumData.coverUrl}')`;
      }
      musicAlbumTitle.textContent = albumData.title || 'Unknown Playlist';

      // 2. Load and render native player with exact playlist tracks
      loadAndRenderNativeAlbum(albumData);

      // 3. Switch stage content wrap from mode-empty to mode-loaded!
      stageContentWrap.className = 'stage-content-wrap mode-loaded';
      stageAlbum.classList.add('is-open');

      if (isInline) {
        inlineEditBar.classList.remove('is-open');
      }

      // 4. Smooth physical animation: vinyl moves smoothly into place!
      updateStageAlbumPosition(true);

    } catch (err) {
      console.error('Failed to load Spotify album:', err);
      const errMsg = 'Could not load link from Spotify. Check URL.';
      if (isInline) {
        inlineEditError.textContent = errMsg;
      } else {
        spotifyErrorMsg.textContent = errMsg;
      }
    } finally {
      if (isInline) {
        inlineEditSubmitBtn.textContent = 'Update';
        inlineEditSubmitBtn.disabled = false;
      } else {
        loadSpotifyBtn.textContent = 'Load Album';
        loadSpotifyBtn.disabled = false;
      }
    }
  }

  // --- Render Album Artwork and Tracklist ---
  function renderAlbumView(albumData) {
    if (albumData && albumData.coverUrl) {
      // Custom cover on jacket and vinyl disc label
      stageJacketSurface.style.backgroundImage = `url('${albumData.coverUrl}')`;
      stageDiscLabel.style.backgroundImage = `url('${albumData.coverUrl}')`;
      stageAlbum.classList.add('is-open');

      // Set Song List state on the right
      stageContentWrap.className = 'stage-content-wrap mode-loaded';
      musicAlbumTitle.textContent = albumData.title || 'Unknown Album';

      // Load native Spotify-styled player, audio, and background color!
      loadAndRenderNativeAlbum(albumData);
    } else {
      // Empty blank album state: clean centered layout
      stageJacketSurface.style.backgroundImage = 'none';
      stageDiscLabel.style.backgroundImage = 'none';

      stageContentWrap.className = 'stage-content-wrap mode-empty';
      spotifyUrlInput.value = '';
      spotifyErrorMsg.textContent = '';

      resetNativePlayer();
    }
  }

  // --- Calculate Screen Coordinates for Stage Album (Pixel-Perfect Center / Split) ---
  function getStageAlbumTargetRect(collapsed) {
    const isCentered = collapsed || (stageContentWrap && stageContentWrap.classList.contains('mode-empty'));
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isMobile = w <= 680;

    let targetLeft, targetTop, stageSize;

    if (isMobile) {
      // Mobile calculation: scale proportionally to phone viewport so vinyl is crisp, large, and centered!
      const mobileSize = isCentered
        ? Math.min(w * 0.78, h * 0.42, 310)
        : Math.min(w * 0.68, h * 0.36, 260);

      stageSize = Math.max(220, Math.round(mobileSize));
      targetLeft = Math.round((w - stageSize) / 2);
      targetTop = isCentered
        ? Math.round(Math.max(50, (h - stageSize) / 2 - 25))
        : Math.round(Math.max(45, (h - stageSize) / 2 - 40));
    } else {
      const cssVarName = isCentered ? '--stage-size-center' : '--stage-size-split';
      const computedVal = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(cssVarName));
      stageSize = computedVal || (isCentered ? 760 : 490);

      if (isCentered) {
        // Centered Mode: Large size, vinyl disc centered over the cover, center jacket directly in viewport
        targetLeft = (w - stageSize) / 2;
        targetTop = (h - stageSize) / 2;
      } else {
        // Split 50/50 Loaded Mode: Compact size, visual span (jacket + pulled disc) centered in the LEFT 50%
        const halfW = w / 2;
        const totalVisualSpan = stageSize * 1.48;
        targetLeft = Math.max(28, (halfW - totalVisualSpan) / 2);
        targetTop = (h - stageSize) / 2;
      }
    }

    return {
      left: Math.round(targetLeft),
      top: Math.round(targetTop),
      size: Math.round(stageSize)
    };
  }

  function updateStageAlbumPosition(animate = true) {
    if (!activeAlbum || !stageAlbum || stageAlbum.style.display === 'none') return;

    const isCollapsed = stageContentWrap ? stageContentWrap.classList.contains('is-tab-collapsed') : false;
    const target = getStageAlbumTargetRect(isCollapsed);

    if (animate) {
      stageAlbum.style.transition = `
        left 0.72s cubic-bezier(0.16, 1, 0.3, 1),
        top 0.72s cubic-bezier(0.16, 1, 0.3, 1),
        width 0.72s cubic-bezier(0.16, 1, 0.3, 1),
        height 0.72s cubic-bezier(0.16, 1, 0.3, 1),
        transform 0.72s cubic-bezier(0.16, 1, 0.3, 1)
      `;
    } else {
      stageAlbum.style.transition = 'none';
    }

    stageAlbum.style.left = `${target.left}px`;
    stageAlbum.style.top = `${target.top}px`;
    stageAlbum.style.width = `${target.size}px`;
    stageAlbum.style.height = `${target.size}px`;
  }

  // --- Collapse / Expand Music Tab Drawer & Center / Split Vinyl Album ---
  function setMusicTabCollapsed(collapsed, animate = true) {
    if (!activeAlbum || !stageContentWrap || !stageContentWrap.classList.contains('mode-loaded')) return;

    stageContentWrap.classList.toggle('is-tab-collapsed', collapsed);
    if (stageAlbum) {
      stageAlbum.classList.toggle('is-disc-over-cover', collapsed);
    }

    if (stageTabToggle) {
      stageTabToggle.title = collapsed ? 'Show tracklist & player' : 'Hide tracklist (center vinyl)';
      stageTabToggle.setAttribute('aria-expanded', String(!collapsed));
      stageTabToggle.classList.toggle('is-collapsed', collapsed);
    }

    updateStageAlbumPosition(animate);
  }

  // --- Swiping & Dragging Event Handlers (Real Velocity-Based Physics) ---
  function onPointerDown(e) {
    if (activeAlbum || isTransitioning) return;

    downTargetCard = e.target.closest('.spine-card');
    isDragging = true;
    hasDragged = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    lastPointerX = e.clientX;
    lastPointerTime = performance.now();
    pointerHistory = [{ x: e.clientX, time: lastPointerTime }];
    angularVelocity = 0; // Touching stops ongoing spin immediately
  }

  function onPointerMove(e) {
    if (!isDragging) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    if (!hasDragged && Math.hypot(dx, dy) > 8) {
      hasDragged = true;
      try {
        viewport.setPointerCapture(e.pointerId);
      } catch (_) {}
    }

    if (!hasDragged) return;

    const now = performance.now();
    const stepDx = e.clientX - lastPointerX;

    // Follow pointer directly during drag (1:1 physical feel: drag left moves albums left, drag right moves albums right)
    const degDelta = (stepDx / window.innerWidth) * 140;
    currentRotation -= degDelta;

    // Keep rolling history of positions over last 100ms for accurate release impulse
    pointerHistory.push({ x: e.clientX, time: now });
    while (pointerHistory.length > 0 && (now - pointerHistory[0].time) > 100) {
      pointerHistory.shift();
    }

    lastPointerX = e.clientX;
    lastPointerTime = now;
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;

    if (viewport.hasPointerCapture && viewport.hasPointerCapture(e.pointerId)) {
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    const dist = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);
    if (!hasDragged && dist < 12 && downTargetCard) {
      const idx = parseInt(downTargetCard.dataset.index, 10);
      if (!isNaN(idx) && !activeAlbum && !isTransitioning) {
        openAlbum(idx);
      }
    }

    downTargetCard = null;

    // --- Basic Physics: Velocity derived from swipe speed (v = dx / dt) ---
    const now = performance.now();
    while (pointerHistory.length > 0 && (now - pointerHistory[0].time) > 100) {
      pointerHistory.shift();
    }

    if (hasDragged && pointerHistory.length >= 2) {
      const pFirst = pointerHistory[0];
      const pLast = pointerHistory[pointerHistory.length - 1];
      const dt = Math.max(pLast.time - pFirst.time, 14); // elapsed ms
      const dx = pLast.x - pFirst.x;                     // pixel displacement

      // Velocity in pixels per millisecond
      const pxPerMs = dx / dt;

      // Map to angular velocity (swiping left flings left, swiping right flings right)
      const calculatedVel = (pxPerMs * 16.67 / window.innerWidth) * 180;

      // Inverted so physical momentum matches the direction of the swipe
      angularVelocity = Math.max(Math.min(-calculatedVel, 48), -48);
    } else {
      angularVelocity = 0;
    }

    pointerHistory = [];
  }

  // --- Physics Loop for 360° Circular Rotation with Inertia ---
  function updatePhysics() {
    if (!activeAlbum) {
      if (!isDragging) {
        currentRotation += angularVelocity;
        // Smooth physical coasting friction (0.965 = realistic rotational drag)
        angularVelocity *= 0.965;

        if (Math.abs(angularVelocity) < 0.008) {
          angularVelocity = 0;
        }
      }

      carouselRing.style.transform = `rotateY(${currentRotation}deg)`;
      updateLightingAndVisibility();
    }

    requestAnimationFrame(updatePhysics);
  }

  // --- Wheel / Trackpad Circular Rotation ---
  function onWheel(e) {
    if (activeAlbum || isTransitioning) return;
    e.preventDefault();

    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    angularVelocity += delta * 0.025;
    angularVelocity = Math.max(Math.min(angularVelocity, 30), -30);
  }

  // --- Keyboard Navigation ---
  function onKeyDown(e) {
    if (e.key === 'Escape' && activeAlbum) {
      closeAlbum();
    } else if (!activeAlbum && !isTransitioning) {
      if (e.key === 'ArrowRight') {
        angularVelocity -= 2.2;
      } else if (e.key === 'ArrowLeft') {
        angularVelocity += 2.2;
      }
    }
  }

  // --- Open Album: Centered if empty (with search bar already showing), Split if loaded ---
  function openAlbum(index) {
    const item = albums[index];
    if (!item) return;

    activeAlbum = item;
    isTransitioning = true;

    const isLoaded = !!item.customAlbum;

    // 1. Render custom or blank album
    renderAlbumView(item.customAlbum);

    if (isLoaded) {
      updateSaveButtonState(true);
      inlineEditBar.classList.remove('is-open');
    } else {
      updateSaveButtonState(false);
      // Empty album spine tone atmospheric lighting
      const toneColors = {
        'slate': [42, 54, 76],
        'monochrome': [48, 50, 58],
        'obsidian': [30, 32, 44],
        'warm-charcoal': [62, 46, 42],
        'pure-matte': [38, 42, 56],
        'kraft-card': [64, 52, 38]
      };
      const [tr, tg, tb] = toneColors[item.tone] || [35, 43, 62];
      setSceneBackgroundColor(tr, tg, tb, 0.42);

      // Auto-focus the immediately visible Spotify search input
      setTimeout(() => {
        spotifyUrlInput.focus();
      }, 320);
    }

    // 2. Initial micro-pull step on spine
    item.element.style.transform = `rotateY(${item.theta}deg) translateZ(-${radius - 40}px)`;

    // 3. Measure starting position
    const startRect = item.element.getBoundingClientRect();

    // 4. Configure stage element
    stageAlbum.className = 'stage-album';
    stageAlbum.dataset.tone = item.tone;
    stageAlbum.classList.remove('is-expanded', 'is-open');

    const isMobile = window.innerWidth <= 680;
    const initialCollapsed = isMobile && isLoaded;

    stageContentWrap.classList.toggle('is-tab-collapsed', initialCollapsed);
    if (stageAlbum) {
      stageAlbum.classList.toggle('is-disc-over-cover', initialCollapsed);
    }
    if (stageTabToggle) {
      stageTabToggle.classList.toggle('is-collapsed', initialCollapsed);
      stageTabToggle.classList.remove('is-playing');
      stageTabToggle.setAttribute('aria-expanded', String(!initialCollapsed));
      stageTabToggle.title = initialCollapsed ? 'Show tracklist & player' : 'Hide tracklist (center vinyl)';
    }

    // Place stage album over clicked spine
    stageAlbum.style.display = 'block';
    stageAlbum.style.pointerEvents = 'auto';
    stageAlbum.style.transition = 'none';
    stageAlbum.style.left = `${startRect.left}px`;
    stageAlbum.style.top = `${startRect.top}px`;
    stageAlbum.style.width = `${startRect.width}px`;
    stageAlbum.style.height = `${startRect.height}px`;
    stageAlbum.style.transform = 'translate3d(0, -6px, 35px) rotateY(6deg)';
    stageAlbum.style.opacity = '1';

    // Hide original spine in the circle
    item.element.classList.add('is-hidden');

    // Activate stage overlay
    stageBackdrop.classList.add('is-active');
    inspectionStage.classList.add('is-active');

    // Force layout reflow
    void stageAlbum.offsetWidth;

    // 5. Target position: Get exact calculated target
    const target = getStageAlbumTargetRect(initialCollapsed);

    // 6. Smooth physical spring curve into place
    stageAlbum.style.transition = `
      left 0.65s cubic-bezier(0.16, 1, 0.3, 1),
      top 0.65s cubic-bezier(0.16, 1, 0.3, 1),
      width 0.65s cubic-bezier(0.16, 1, 0.3, 1),
      height 0.65s cubic-bezier(0.16, 1, 0.3, 1),
      transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)
    `;

    stageAlbum.style.left = `${target.left}px`;
    stageAlbum.style.top = `${target.top}px`;
    stageAlbum.style.width = `${target.size}px`;
    stageAlbum.style.height = `${target.size}px`;
    stageAlbum.classList.add('is-expanded');
    stageAlbum.style.transform = 'translate3d(0, 0, 180px) rotateY(0deg) scale(1)';

    // 7. Slide vinyl disc out smoothly (at rest until play is pressed)
    setTimeout(() => {
      stageAlbum.classList.add('is-open');
      setVinylSpinning(false);
    }, 220);

    setTimeout(() => {
      isTransitioning = false;
    }, 650);
  }

  // --- Close Album: Swiftly retract vinyl & return to shelf in circle ---
  function closeAlbum() {
    if (!activeAlbum || isTransitioning) return;

    isTransitioning = true;
    const item = activeAlbum;

    // CRITICAL: Disable pointer events on stageAlbum immediately so clicks never get swallowed!
    stageAlbum.style.pointerEvents = 'none';

    // 1. Retract disc, pause audio, stop spinning and close inline edit
    stageAlbum.classList.remove('is-open', 'is-disc-over-cover');
    setVinylSpinning(false);
    inlineEditBar.classList.remove('is-open');
    stageContentWrap.classList.remove('is-tab-collapsed');
    if (stageTabToggle) {
      stageTabToggle.classList.remove('is-collapsed', 'is-playing');
    }

    resetNativePlayer();
    resetSceneBackgroundColor();

    // 2. Hide backdrop and stage
    stageBackdrop.classList.remove('is-active');
    inspectionStage.classList.remove('is-active');

    // 3. Return to exact circle shelf slot
    setTimeout(() => {
      const destRect = item.element.getBoundingClientRect();

      stageAlbum.classList.remove('is-expanded');

      stageAlbum.style.transition = `
        left 0.38s cubic-bezier(0.2, 0.9, 0.2, 1),
        top 0.38s cubic-bezier(0.2, 0.9, 0.2, 1),
        width 0.38s cubic-bezier(0.2, 0.9, 0.2, 1),
        height 0.38s cubic-bezier(0.2, 0.9, 0.2, 1),
        transform 0.38s cubic-bezier(0.2, 0.9, 0.2, 1),
        opacity 0.25s ease 0.12s
      `;

      stageAlbum.style.left = `${destRect.left}px`;
      stageAlbum.style.top = `${destRect.top}px`;
      stageAlbum.style.width = `${destRect.width}px`;
      stageAlbum.style.height = `${destRect.height}px`;
      stageAlbum.style.transform = 'translate3d(0, 0, 0) scale(1)';
      stageAlbum.style.opacity = '0';

      // 4. Restore original spine on the shelf & completely unblock future clicks
      setTimeout(() => {
        item.element.style.transform = `rotateY(${item.theta}deg) translateZ(-${radius}px)`;
        item.element.classList.remove('is-hidden');

        // Move stageAlbum completely out of the interactive layer
        stageAlbum.style.transition = 'none';
        stageAlbum.style.display = 'none';
        stageAlbum.style.pointerEvents = 'none';
        stageAlbum.style.left = '-9999px';
        stageAlbum.style.top = '-9999px';
        stageAlbum.style.opacity = '0';

        activeAlbum = null;
        isTransitioning = false;
        updateLightingAndVisibility();
      }, 380);
    }, 100);
  }

  // --- Form Submit: Load Spotify URL for the active empty album ---
  spotifyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = spotifyUrlInput.value.trim();
    if (url) {
      loadSpotifyAlbumIntoActive(url, false);
    }
  });

  // --- Save Button: Persist album so it stays even after refreshing ---
  saveAlbumBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!activeAlbum || !activeAlbum.customAlbum) return;

    saveAlbumToStorage(activeAlbum.index, activeAlbum.customAlbum);
    activeAlbum.isSaved = true;
    updateSaveButtonState(true);

    // Update spine on shelf
    const frontSurface = activeAlbum.element.querySelector('.spine-surface');
    if (frontSurface && activeAlbum.customAlbum.coverUrl) {
      frontSurface.style.backgroundImage = `url('${activeAlbum.customAlbum.coverUrl}')`;
    }
    activeAlbum.element.classList.add('has-saved-record');

    // Bounce feedback
    saveAlbumBtn.style.transform = 'scale(1.08)';
    setTimeout(() => {
      saveAlbumBtn.style.transform = '';
    }, 160);
  });

  // --- Edit Button: Toggle inline bar to change song/album ---
  editAlbumBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!activeAlbum) return;

    const isOpen = inlineEditBar.classList.toggle('is-open');
    if (isOpen) {
      inlineEditInput.value = (activeAlbum.customAlbum && activeAlbum.customAlbum.spotifyUrl) ? activeAlbum.customAlbum.spotifyUrl : '';
      inlineEditError.textContent = '';
      setTimeout(() => inlineEditInput.focus(), 120);
    }
  });

  inlineEditCancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    inlineEditBar.classList.remove('is-open');
    inlineEditError.textContent = '';
  });

  inlineEditForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newUrl = inlineEditInput.value.trim();
    if (newUrl) {
      loadSpotifyAlbumIntoActive(newUrl, true);
    }
  });

  // --- Clear Album Button: Remove album and make it empty again ---
  clearAlbumBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!activeAlbum) return;

    removeAlbumFromStorage(activeAlbum.index);
    activeAlbum.customAlbum = null;
    activeAlbum.isSaved = false;

    // Reset spine card in shelf
    const frontSurface = activeAlbum.element.querySelector('.spine-surface');
    if (frontSurface) {
      frontSurface.style.backgroundImage = 'none';
    }
    activeAlbum.element.classList.remove('has-saved-record');

    // Switch back to empty centered view
    renderAlbumView(null);
    updateSaveButtonState(false);
    inlineEditBar.classList.remove('is-open');

    // Restore empty tone color
    const toneColors = {
      'slate': [42, 54, 76],
      'monochrome': [48, 50, 58],
      'obsidian': [30, 32, 44],
      'warm-charcoal': [62, 46, 42],
      'pure-matte': [38, 42, 56],
      'kraft-card': [64, 52, 38]
    };
    const [tr, tg, tb] = toneColors[activeAlbum.tone] || [35, 43, 62];
    setSceneBackgroundColor(tr, tg, tb, 0.42);

    // Center vinyl smoothly
    updateStageAlbumPosition(true);

    setTimeout(() => {
      spotifyUrlInput.focus();
    }, 320);
  });

  // --- Navigation & Inspection Listeners ---
  viewport.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  viewport.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKeyDown);

  // Return button click
  stageCloseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAlbum();
  });

  // Clicking directly on album: if empty -> focus search, if loaded -> toggle play/pause!
  stageAlbum.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!activeAlbum || isTransitioning) return;

    const isMobile = window.innerWidth <= 680;
    const isDrawerOpen = stageContentWrap && stageContentWrap.classList.contains('mode-loaded') && !stageContentWrap.classList.contains('is-tab-collapsed');

    // On mobile, if drawer is open, tapping the vinyl collapses the drawer
    if (isMobile && isDrawerOpen) {
      setMusicTabCollapsed(true, true);
      return;
    }

    if (!activeAlbum.customAlbum) {
      spotifyUrlInput.focus();
    } else {
      togglePlayPause();
    }
  });

  // Mobile swipe-to-close gesture on music drawer
  let drawerTouchStartX = 0;
  let drawerTouchStartY = 0;
  const musicDrawerEl = document.getElementById('stageMusicDrawer');
  if (musicDrawerEl) {
    musicDrawerEl.addEventListener('touchstart', (e) => {
      drawerTouchStartX = e.touches[0].clientX;
      drawerTouchStartY = e.touches[0].clientY;
    }, { passive: true });

    musicDrawerEl.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const dx = touchEndX - drawerTouchStartX;
      const dy = touchEndY - drawerTouchStartY;
      // If swiped right by at least 45px and predominantly horizontal:
      if (dx > 45 && Math.abs(dx) > Math.abs(dy)) {
        setMusicTabCollapsed(true, true);
      }
    }, { passive: true });
  }

  // Clicking away from the album returns it to the shelf!
  inspectionStage.addEventListener('click', (e) => {
    if (!activeAlbum || isTransitioning) return;

    const clickedAlbum = e.target.closest('#stageAlbum');
    const clickedSearch = e.target.closest('#stageEmptySearch');
    const clickedMusicTab = e.target.closest('#stageMusicTab');
    const clickedTabToggle = e.target.closest('#stageTabToggle');
    const clickedCloseBtn = e.target.closest('#stageCloseBtn');

    if (clickedCloseBtn) return;

    const isMobile = window.innerWidth <= 680;
    const isDrawerOpen = stageContentWrap && stageContentWrap.classList.contains('mode-loaded') && !stageContentWrap.classList.contains('is-tab-collapsed');

    // On mobile, if the tracklist drawer is open and the user taps the vinyl or background, smoothly collapse the drawer!
    if (isMobile && isDrawerOpen && !clickedMusicTab && !clickedTabToggle) {
      setMusicTabCollapsed(true, true);
      return;
    }

    if (clickedAlbum) {
      if (!activeAlbum.customAlbum) {
        spotifyUrlInput.focus();
      }
      return;
    }

    if (clickedSearch || clickedMusicTab || clickedTabToggle || e.target.closest('#stageMusicDrawer')) {
      return;
    }

    // Clicked outside / away from the album -> goes back into its shelf!
    closeAlbum();
  });

  stageBackdrop.addEventListener('click', closeAlbum);

  window.addEventListener('resize', () => {
    updateRadius();
    updateLightingAndVisibility();
    if (activeAlbum && !isTransitioning) {
      updateStageAlbumPosition(false);
    }
  });

  // ==========================================================================
  // Dynamic Background Color Extraction & Atmospheric Scene Lighting
  // ==========================================================================

  const albumColorCache = new Map();

  // Extract the most vibrant and dominant aesthetic color from album artwork
  function extractDominantColor(imgUrl) {
    if (!imgUrl) return Promise.resolve([35, 43, 62]);
    if (albumColorCache.has(imgUrl)) {
      return Promise.resolve(albumColorCache.get(imgUrl));
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const timer = setTimeout(() => {
        resolve([35, 43, 62]);
      }, 2500);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          const size = 36;
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(img, 0, 0, size, size);

          const imgData = ctx.getImageData(0, 0, size, size).data;
          const buckets = new Map();

          // Quantize and score colors by frequency and saturation
          for (let i = 0; i < imgData.length; i += 16) {
            const r = imgData[i];
            const g = imgData[i + 1];
            const b = imgData[i + 2];
            const a = imgData[i + 3];
            if (a < 128) continue;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const lum = (max + min) / (2 * 255);
            const sat = max === 0 ? 0 : (max - min) / max;

            // Filter out muddy black and blinding white
            if (lum < 0.08 || lum > 0.93) continue;

            // Quantize to color clusters of 20
            const qr = Math.min(255, Math.round(r / 20) * 20);
            const qg = Math.min(255, Math.round(g / 20) * 20);
            const qb = Math.min(255, Math.round(b / 20) * 20);
            const key = `${qr},${qg},${qb}`;

            // Score: higher saturation and aesthetic luminance get boosted
            const weight = (1 + sat * 3.5) * (1 - Math.abs(lum - 0.45));
            const existing = buckets.get(key) || { count: 0, r: qr, g: qg, b: qb, weight: 0 };
            existing.count += 1;
            existing.weight += weight;
            buckets.set(key, existing);
          }

          if (buckets.size > 0) {
            const sorted = Array.from(buckets.values()).sort((a, b) => b.weight - a.weight);
            const best = sorted[0];
            const result = [best.r, best.g, best.b];
            albumColorCache.set(imgUrl, result);
            return resolve(result);
          }
        } catch (err) {
          console.warn('Canvas color extraction error:', err);
        }
        resolve([35, 43, 62]);
      };

      img.onerror = () => {
        clearTimeout(timer);
        resolve([35, 43, 62]);
      };

      img.src = imgUrl;
    });
  }

  // Smoothly tint the scene background, ambient glow, and colored vinyl disc to match the album
  function setSceneBackgroundColor(r, g, b, opacity = 0.58) {
    document.documentElement.style.setProperty('--album-r', r);
    document.documentElement.style.setProperty('--album-g', g);
    document.documentElement.style.setProperty('--album-b', b);
    document.documentElement.style.setProperty('--disc-r', r);
    document.documentElement.style.setProperty('--disc-g', g);
    document.documentElement.style.setProperty('--disc-b', b);
    document.documentElement.style.setProperty('--album-glow-opacity', opacity);

    if (stageBackdrop) {
      stageBackdrop.style.background = `radial-gradient(
        circle at 50% 50%,
        rgba(${r}, ${g}, ${b}, 0.65) 0%,
        rgba(${r}, ${g}, ${b}, 0.28) 48%,
        rgba(6, 7, 10, 0.94) 100%
      )`;
    }
    const ambientGlow = document.querySelector('.ambient-glow');
    if (ambientGlow) {
      ambientGlow.style.background = `radial-gradient(
        circle at 50% 45%,
        rgba(${r}, ${g}, ${b}, ${opacity}) 0%,
        rgba(${r}, ${g}, ${b}, ${opacity * 0.4}) 42%,
        rgba(7, 8, 11, 0.98) 78%
      )`;
    }
    const spotlight = document.querySelector('.spotlight');
    if (spotlight) {
      spotlight.style.background = `radial-gradient(
        ellipse at 50% 0%,
        rgba(${r}, ${g}, ${b}, 0.45) 0%,
        rgba(255, 255, 255, 0.05) 30%,
        transparent 68%
      )`;
    }
    document.body.style.backgroundColor = `rgb(${Math.round(r * 0.12)}, ${Math.round(g * 0.12)}, ${Math.round(b * 0.12)})`;
  }

  function resetSceneBackgroundColor() {
    document.documentElement.style.setProperty('--disc-r', 18);
    document.documentElement.style.setProperty('--disc-g', 19);
    document.documentElement.style.setProperty('--disc-b', 26);
    setSceneBackgroundColor(35, 43, 62, 0.38);
    document.body.style.backgroundColor = 'var(--bg-color)';
    if (stageBackdrop) stageBackdrop.style.background = '';
    const ambientGlow = document.querySelector('.ambient-glow');
    if (ambientGlow) ambientGlow.style.background = '';
    const spotlight = document.querySelector('.spotlight');
    if (spotlight) spotlight.style.background = '';
  }

  // ==========================================================================
  // Native Spotify-Styled Player Engine & Real-Time Audio & Volume Control
  // ==========================================================================

  let activeAlbumTracks = [];
  let currentTrackIdx = 0;
  const VOLUME_STORAGE_KEY = 'disc_player_volume';
  let currentVolume = parseFloat(localStorage.getItem(VOLUME_STORAGE_KEY) || '75');
  let preMuteVolume = 75;
  let isFullSongPlaying = false;
  let isShuffle = false;

  // Background YouTube Audio Engine (Full-Song Streaming with zero video UI)
  let ytPlayer = null;
  let ytPlayerReady = false;
  let ytCurrentVideoId = null;
  let ytProgressTimer = null;

  function initYtPlayer() {
    if (typeof YT !== 'undefined' && YT.Player) {
      createYtPlayerInstance();
    } else {
      const prevOnReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function() {
        if (typeof prevOnReady === 'function') prevOnReady();
        createYtPlayerInstance();
      };
    }
  }

  function createYtPlayerInstance() {
    if (ytPlayer) return;
    const hostEl = document.getElementById('ytPlayer');
    if (!hostEl) return;
    try {
      ytPlayer = new YT.Player('ytPlayer', {
        height: '100%',
        width: '100%',
        playerVars: {
          'autoplay': 0,
          'controls': 0,
          'disablekb': 1,
          'fs': 0,
          'modestbranding': 1,
          'playsinline': 1,
          'rel': 0,
          'origin': window.location.origin
        },
        events: {
          'onReady': onYtPlayerReady,
          'onStateChange': onYtPlayerStateChange,
          'onError': (e) => {
            console.warn('YouTube Audio Player error:', e);
            const curTrack = activeAlbumTracks[currentTrackIdx];
            if (curTrack) {
              curTrack.videoId = null;
              ytCurrentVideoId = null;
              if (curTrack.previewUrl && nativeAudioPlayer) {
                nativeAudioPlayer.src = curTrack.previewUrl;
                nativeAudioPlayer.currentTime = 0;
                nativeAudioPlayer.play().catch(() => {});
              }
            }
          }
        }
      });
    } catch (e) {
      console.warn('Could not initialize YT.Player:', e);
    }
  }

  function onYtPlayerReady() {
    ytPlayerReady = true;
    if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
      ytPlayer.setVolume(currentVolume);
    }
  }

  function onYtPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
      isFullSongPlaying = true;
      updateAudioPlaybackUI(true);
      setVinylSpinning(true);
      startProgressTracking();
    } else if (event.data === YT.PlayerState.PAUSED) {
      isFullSongPlaying = false;
      updateAudioPlaybackUI(false);
      setVinylSpinning(false);
      stopProgressTracking();
    } else if (event.data === YT.PlayerState.BUFFERING) {
      setVinylSpinning(true);
      if (tracklistBadgeText && activeAlbumTracks[currentTrackIdx]) {
        tracklistBadgeText.textContent = `Buffering: ${activeAlbumTracks[currentTrackIdx].title}...`;
      }
    } else if (event.data === YT.PlayerState.ENDED) {
      isFullSongPlaying = false;
      stopProgressTracking();
      if (activeAlbumTracks.length > 1) {
        const nextIdx = getNextTrackIndex();
        selectTrack(nextIdx, true);
      } else {
        updateAudioPlaybackUI(false);
        setVinylSpinning(false);
      }
    }
  }

  function startProgressTracking() {
    stopProgressTracking();
    ytProgressTimer = setInterval(() => {
      if (!ytPlayer || !ytPlayerReady || !isFullSongPlaying) return;
      try {
        const cur = ytPlayer.getCurrentTime() || 0;
        const dur = ytPlayer.getDuration() || (activeAlbumTracks[currentTrackIdx]?.durationMs / 1000) || 0;
        if (dur > 0) {
          const percent = Math.min(100, (cur / dur) * 100);
          if (progressBarFill) progressBarFill.style.width = `${percent}%`;
          if (progressBarThumb) progressBarThumb.style.left = `${percent}%`;

          const curM = Math.floor(cur / 60);
          const curS = String(Math.floor(cur % 60)).padStart(2, '0');
          if (progressCurrentTime) progressCurrentTime.textContent = `${curM}:${curS}`;

          const rem = Math.max(0, dur - cur);
          const remM = Math.floor(rem / 60);
          const remS = String(Math.floor(rem % 60)).padStart(2, '0');
          if (progressDurationTime) progressDurationTime.textContent = `-${remM}:${remS}`;
        }
      } catch (_) {}
    }, 250);
  }

  function stopProgressTracking() {
    if (ytProgressTimer) {
      clearInterval(ytProgressTimer);
      ytProgressTimer = null;
    }
  }

  async function fetchFullTrackVideoId(track) {
    if (track.videoId) return track.videoId;

    const cleanArtist = (track.artist || '').replace(/Various Artists/i, '').trim();
    const cleanTitle = (track.title || '')
      .replace(/\(feat\..*?\)/gi, '')
      .replace(/\[feat\..*?\]/gi, '')
      .replace(/\(explicit\)/gi, '')
      .replace(/\(remastered.*?\)/gi, '')
      .trim();

    const query = `${cleanArtist} ${cleanTitle} audio`.trim() || `${cleanTitle} audio`;

    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(`/api/search-yt?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        if (data && data.videoId) {
          track.videoId = data.videoId;
          return data.videoId;
        }
      }
    } catch (e) {
      console.warn('Search-yt query error:', e);
    }
    return null;
  }

  let audioCtx = null;
  function initWebAudio() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    } catch (e) {
      console.warn('AudioContext resume error:', e);
    }
  }

  function playKnurlTick() {
    try {
      initWebAudio();
      if (!audioCtx || audioCtx.state === 'suspended') return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1750, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(360, audioCtx.currentTime + 0.012);
      gain.gain.setValueAtTime(0.035, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.012);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.013);
    } catch (_) {}
  }

  function getNextTrackIndex() {
    if (activeAlbumTracks.length <= 1) return 0;
    if (isShuffle) {
      let randIdx = Math.floor(Math.random() * activeAlbumTracks.length);
      if (randIdx === currentTrackIdx && activeAlbumTracks.length > 1) {
        randIdx = (randIdx + 1 + Math.floor(Math.random() * (activeAlbumTracks.length - 1))) % activeAlbumTracks.length;
      }
      return randIdx;
    }
    return (currentTrackIdx + 1) % activeAlbumTracks.length;
  }

  function getPrevTrackIndex() {
    if (activeAlbumTracks.length <= 1) return 0;
    if (isShuffle) {
      let randIdx = Math.floor(Math.random() * activeAlbumTracks.length);
      if (randIdx === currentTrackIdx && activeAlbumTracks.length > 1) {
        randIdx = (randIdx + 1 + Math.floor(Math.random() * (activeAlbumTracks.length - 1))) % activeAlbumTracks.length;
      }
      return randIdx;
    }
    return (currentTrackIdx - 1 + activeAlbumTracks.length) % activeAlbumTracks.length;
  }

  // Format milliseconds into MM:SS string
  function formatDuration(ms) {
    if (!ms || isNaN(ms)) return '3:30';
    const totalSecs = Math.round(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = String(totalSecs % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  // Helper to resolve full album tracklist from Deezer / iTunes API when needed
  async function fetchFullAlbumTracklist(albumTitle, artistName) {
    const q = `${albumTitle} ${artistName}`.trim();
    if (!q) return null;

    // 1. Try Deezer API
    try {
      const res = await fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.data) && data.data.length > 0) {
          const alb = data.data[0];
          const albRes = await fetch(`https://api.deezer.com/album/${alb.id}`);
          if (albRes.ok) {
            const albData = await albRes.json();
            if (albData.tracks && Array.isArray(albData.tracks.data) && albData.tracks.data.length > 0) {
              return {
                coverUrl: albData.cover_xl || alb.cover_xl || '',
                tracks: albData.tracks.data.map((t, idx) => ({
                  number: t.track_position || (idx + 1),
                  title: t.title,
                  artist: t.artist?.name || alb.artist?.name || artistName,
                  durationMs: Number(t.duration || 0) * 1000,
                  durationStr: formatDuration(Number(t.duration || 0) * 1000),
                  previewUrl: t.preview || '',
                  isPlayable: true
                }))
              };
            }
          }
        }
      }
    } catch (_) {}

    // 2. Fallback: iTunes API
    try {
      const itRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=1`);
      if (itRes.ok) {
        const itData = await itRes.json();
        if (Array.isArray(itData.results) && itData.results.length > 0) {
          const col = itData.results[0];
          const lkRes = await fetch(`https://itunes.apple.com/lookup?id=${col.collectionId}&entity=song`);
          if (lkRes.ok) {
            const lkData = await lkRes.json();
            const songs = (lkData.results || []).filter(r => r.wrapperType === 'track');
            if (songs.length > 0) {
              return {
                coverUrl: (col.artworkUrl100 || '').replace('100x100bb.jpg', '1400x1400bb.jpg'),
                tracks: songs.map((s, idx) => ({
                  number: s.trackNumber || (idx + 1),
                  title: s.trackName,
                  artist: s.artistName || artistName,
                  durationMs: Number(s.trackTimeMillis || 0),
                  durationStr: formatDuration(Number(s.trackTimeMillis || 0)),
                  previewUrl: s.previewUrl || '',
                  isPlayable: true
                }))
              };
            }
          }
        }
      }
    } catch (_) {}

    return null;
  }

  // Vinyl Rotation Control: spins when audio is playing, stops when paused
  function setVinylSpinning(spinning) {
    if (!discRotator) return;
    discRotator.style.animationPlayState = spinning ? 'running' : 'paused';
    discRotator.classList.toggle('is-spinning', spinning);
    if (stageDisc) {
      stageDisc.classList.toggle('is-spinning', spinning);
    }
    if (stageAlbum) {
      stageAlbum.classList.toggle('is-spinning', spinning);
    }
    if (stageTabToggle) {
      stageTabToggle.classList.toggle('is-playing', spinning);
    }
  }

  // Security Sanitizer to prevent Stored / Reflected DOM XSS
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Render album artwork, tracklist, and set dynamic scene color
  async function loadAndRenderNativeAlbum(albumData) {
    if (!albumData) return;

    // 1. Dynamic background color matching the album!
    if (albumData.coverUrl) {
      extractDominantColor(albumData.coverUrl).then(([r, g, b]) => {
        setSceneBackgroundColor(r, g, b, 0.58);
      });
    }

    // 2. Render cover thumb in player hero row
    if (playerCoverThumb && albumData.coverUrl) {
      playerCoverThumb.style.backgroundImage = `url('${albumData.coverUrl}')`;
    }

    // 3. Fetch tracks strictly from Spotify / Deezer / iTunes
    let tracks = [];

    // If tracks are already attached on albumData (e.g. from immediate paste), use them directly!
    if (albumData.tracks && Array.isArray(albumData.tracks) && albumData.tracks.length > 1) {
      tracks = albumData.tracks.map((t, idx) => ({
        id:          t.spotifyUri || t.id || idx,
        number:      t.number || (idx + 1),
        title:       t.title,
        artist:      t.artist || albumData.artist || '',
        album:       albumData.title,
        durationMs:  t.durationMs || 0,
        durationStr: t.durationStr || formatDuration(t.durationMs || 0),
        previewUrl:  t.previewUrl || ''
      }));
    } else {
      let spotifyType = albumData.type || 'album';
      let spotifyId   = albumData.id;

      if (albumData.spotifyUrl) {
        const reParsed = parseSpotifyUrl(albumData.spotifyUrl);
        if (reParsed) {
          spotifyType = reParsed.type;
          spotifyId   = reParsed.id;
        }
      }

      if (tracklistScrollArea) {
        tracklistScrollArea.innerHTML = '<div style="padding:32px 16px; text-align:center; color:rgba(255,255,255,0.6); font-size:14px; letter-spacing:0.5px;">Loading album tracklist...</div>';
      }

      if (spotifyId) {
        try {
          const res = await fetch(
            `/api/spotify-tracks?type=${spotifyType}&id=${spotifyId}`,
            { cache: 'no-store' }
          );
          if (res.ok) {
            const spotifyData = await res.json();
            if (spotifyData.tracks && spotifyData.tracks.length > 0) {
              if (spotifyData.coverUrl && spotifyData.coverUrl !== albumData.coverUrl) {
                albumData.coverUrl = spotifyData.coverUrl;
                if (playerCoverThumb) {
                  playerCoverThumb.style.backgroundImage = `url('${spotifyData.coverUrl}')`;
                }
                extractDominantColor(spotifyData.coverUrl).then(([r, g, b]) => {
                  setSceneBackgroundColor(r, g, b, 0.58);
                });
              }
              tracks = spotifyData.tracks.map((t, idx) => ({
                id:          t.spotifyUri || idx,
                number:      t.number || (idx + 1),
                title:       t.title,
                artist:      t.artist || albumData.artist || '',
                album:       albumData.title,
                durationMs:  t.durationMs || 0,
                durationStr: t.durationStr || formatDuration(t.durationMs || 0),
                previewUrl:  t.previewUrl || ''
              }));
            }
          }
        } catch (err) {
          console.warn('[Disc] Spotify track fetch error:', err);
        }
      }

      // If still empty or only 1 generic track for an album, query Deezer/iTunes
      if (tracks.length <= 1 && albumData.title) {
        try {
          const resolved = await fetchFullAlbumTracklist(albumData.title, albumData.artist || '');
          if (resolved && resolved.tracks && resolved.tracks.length > 0) {
            tracks = resolved.tracks.map((t, idx) => ({
              id:          idx,
              number:      t.number || (idx + 1),
              title:       t.title,
              artist:      t.artist || albumData.artist || '',
              album:       albumData.title,
              durationMs:  t.durationMs || 0,
              durationStr: t.durationStr || formatDuration(t.durationMs || 0),
              previewUrl:  t.previewUrl || ''
            }));
            if (resolved.coverUrl && !albumData.coverUrl) {
              albumData.coverUrl = resolved.coverUrl;
              if (playerCoverThumb) playerCoverThumb.style.backgroundImage = `url('${resolved.coverUrl}')`;
              extractDominantColor(resolved.coverUrl).then(([r, g, b]) => {
                setSceneBackgroundColor(r, g, b, 0.58);
              });
            }
          }
        } catch (_) {}
      }

      // Direct oEmbed fallback if tracks array is still empty
      if (tracks.length === 0 && albumData.spotifyUrl) {
        try {
          const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(albumData.spotifyUrl)}`);
          if (oembedRes.ok) {
            const odata = await oembedRes.json();
            if (odata.thumbnail_url && !albumData.coverUrl) {
              albumData.coverUrl = odata.thumbnail_url;
              if (playerCoverThumb) {
                playerCoverThumb.style.backgroundImage = `url('${odata.thumbnail_url}')`;
              }
              extractDominantColor(odata.thumbnail_url).then(([r, g, b]) => {
                setSceneBackgroundColor(r, g, b, 0.58);
              });
            }
            tracks = [{
              id: albumData.spotifyUrl,
              number: 1,
              title: odata.title || albumData.title || 'Track 1',
              artist: odata.author_name || albumData.artist || '',
              album: albumData.title,
              durationMs: 210000,
              durationStr: '3:30',
              previewUrl: ''
            }];
          }
        } catch (_) {}
      }
    }

    if (tracks.length > 0) {
      activeAlbumTracks = tracks;
      currentTrackIdx = 0;
      renderTracklist(tracks);
      selectTrack(0, false);
    } else {
      activeAlbumTracks = [];
      if (tracklistScrollArea) {
        tracklistScrollArea.innerHTML = '<div style="padding:32px 16px; text-align:center; color:rgba(255,255,255,0.5); font-size:14px;">No tracks found. Please make sure the playlist is public on Spotify.</div>';
      }
    }
  }

  function renderTracklist(tracks) {
    if (!tracklistScrollArea) return;
    tracklistScrollArea.innerHTML = '';

    tracks.forEach((track, idx) => {
      const row = document.createElement('div');
      const isPlaying = (idx === currentTrackIdx && isFullSongPlaying);
      row.className = `track-row ${idx === currentTrackIdx ? 'is-active' : ''}`;
      row.dataset.idx = idx;

      const safeNumber = escapeHTML(track.number);
      const safeTitle = escapeHTML(track.title);
      const safeArtist = escapeHTML(track.artist);
      const safeDuration = escapeHTML(track.durationStr);

      row.innerHTML = `
        <div class="track-num">
          <span class="num-text" style="${isPlaying ? 'display:none;' : 'display:inline;'}">${safeNumber}</span>
          <div class="track-playing-equalizer" style="${isPlaying ? 'display:inline-flex;' : 'display:none;'}">
            <span></span><span></span><span></span>
          </div>
        </div>
        <div class="track-info-col">
          <div class="track-row-title">${safeTitle}</div>
          <div class="track-row-artist">${safeArtist}</div>
        </div>
        <div class="track-row-duration">${safeDuration}</div>
      `;

      row.addEventListener('click', (e) => {
        e.stopPropagation();
        if (idx === currentTrackIdx) {
          togglePlayPause();
        } else {
          selectTrack(idx, true);
        }
      });

      tracklistScrollArea.appendChild(row);
    });
  }

  // Helper to safely play/cue track in YouTube Player at the beginning (0:00)
  const loadAndPlayYt = (vid, autoPlay = true) => {
    if (!ytPlayer || typeof ytPlayer.loadVideoById !== 'function') return false;
    try {
      ytCurrentVideoId = vid;
      if (autoPlay) {
        ytPlayer.loadVideoById({
          videoId: vid,
          startSeconds: 0
        });
        if (typeof ytPlayer.seekTo === 'function') {
          ytPlayer.seekTo(0, true);
        }
        ytPlayer.playVideo();
        isFullSongPlaying = true;
        updateAudioPlaybackUI(true);
        setVinylSpinning(true);
        startProgressTracking();
        const curTrack = activeAlbumTracks[currentTrackIdx];
        if (tracklistBadgeText && curTrack) {
          tracklistBadgeText.textContent = `Playing: ${curTrack.title}`;
        }
      } else {
        ytPlayer.cueVideoById({
          videoId: vid,
          startSeconds: 0
        });
        updateAudioPlaybackUI(false);
      }
      return true;
    } catch (err) {
      console.warn('Error loading video in YT Player:', err);
      return false;
    }
  };

  async function selectTrack(idx, autoPlay = true) {
    if (!activeAlbumTracks[idx]) return;
    currentTrackIdx = idx;
    const track = activeAlbumTracks[idx];

    if (playerTrackTitle) playerTrackTitle.textContent = track.title;
    if (playerTrackArtist) playerTrackArtist.textContent = track.artist;
    if (progressCurrentTime) progressCurrentTime.textContent = '0:00';
    if (progressBarFill) progressBarFill.style.width = '0%';
    if (progressBarThumb) progressBarThumb.style.left = '0%';
    if (progressDurationTime) progressDurationTime.textContent = `-${track.durationStr || '0:00'}`;

    // Update active highlight in tracklist
    const rows = tracklistScrollArea ? tracklistScrollArea.querySelectorAll('.track-row') : [];
    rows.forEach((r, i) => {
      const isActive = (i === idx);
      r.classList.toggle('is-active', isActive);
      const eq = r.querySelector('.track-playing-equalizer');
      const num = r.querySelector('.num-text');
      if (eq && num) {
        const playingNow = isActive && isFullSongPlaying;
        eq.style.display = playingNow ? 'inline-flex' : 'none';
        num.style.display = playingNow ? 'none' : 'inline';
      }
    });

    if (autoPlay && tracklistBadgeText) {
      tracklistBadgeText.textContent = `Playing: ${track.title}`;
    }

    // Immediately glide the tracklist to the side with smooth animation when pressing play!
    if (autoPlay && stageContentWrap && stageContentWrap.classList.contains('mode-loaded')) {
      if (!stageContentWrap.classList.contains('is-tab-collapsed')) {
        setMusicTabCollapsed(true, true);
      }
    }

    initYtPlayer();

    // 1. If video ID is already known and player ready -> play immediately at 0:00!
    let videoId = track.videoId || null;
    if (videoId && ytPlayer && ytPlayerReady) {
      if (loadAndPlayYt(videoId, autoPlay)) {
        if (nativeAudioPlayer && !nativeAudioPlayer.paused) {
          nativeAudioPlayer.pause();
        }
        // Pre-fetch next track videoId in background for zero-delay auto-advance
        const nextTrack = activeAlbumTracks[(idx + 1) % activeAlbumTracks.length];
        if (nextTrack && !nextTrack.videoId) {
          fetchFullTrackVideoId(nextTrack).catch(() => {});
        }
        return;
      }
    }

    // 2. If track has direct previewUrl, start playing it immediately so user gets music with 0ms delay!
    if (track.previewUrl && autoPlay && nativeAudioPlayer) {
      try {
        nativeAudioPlayer.src = track.previewUrl;
        nativeAudioPlayer.currentTime = 0;
        nativeAudioPlayer.play().then(() => {
          isFullSongPlaying = true;
          updateAudioPlaybackUI(true);
          setVinylSpinning(true);
        }).catch(() => {});
      } catch (_) {}
    }

    if (autoPlay) {
      isFullSongPlaying = true;
      updateAudioPlaybackUI(true);
      setVinylSpinning(true);
    }

    // 3. Resolve YouTube video ID for this song (Full song audio)
    if (!videoId) {
      videoId = await fetchFullTrackVideoId(track);
    }

    if (videoId) {
      if (ytPlayer && ytPlayerReady) {
        if (loadAndPlayYt(videoId, autoPlay)) {
          if (nativeAudioPlayer && !nativeAudioPlayer.paused) {
            nativeAudioPlayer.pause();
          }
          const nextTrack = activeAlbumTracks[(idx + 1) % activeAlbumTracks.length];
          if (nextTrack && !nextTrack.videoId) {
            fetchFullTrackVideoId(nextTrack).catch(() => {});
          }
          return;
        }
      } else {
        // YT iframe is initializing, poll briefly for ready state
        let waited = 0;
        const readyChecker = setInterval(() => {
          waited += 60;
          if (ytPlayer && ytPlayerReady) {
            clearInterval(readyChecker);
            loadAndPlayYt(videoId, autoPlay);
            if (nativeAudioPlayer && !nativeAudioPlayer.paused) {
              nativeAudioPlayer.pause();
            }
          } else if (waited >= 3500) {
            clearInterval(readyChecker);
          }
        }, 60);
        return;
      }
    }

    // 4. Fallback: if YouTube search didn't resolve and no previewUrl yet, fetch from iTunes
    if (!track.previewUrl && track.title) {
      try {
        const searchQ = `${track.artist} ${track.title}`.trim();
        const itRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQ)}&entity=song&limit=1`);
        if (itRes.ok) {
          const itData = await itRes.json();
          if (itData.results && itData.results.length > 0 && itData.results[0].previewUrl) {
            track.previewUrl = itData.results[0].previewUrl;
            if (currentTrackIdx === idx && autoPlay && nativeAudioPlayer) {
              nativeAudioPlayer.src = track.previewUrl;
              nativeAudioPlayer.currentTime = 0;
              nativeAudioPlayer.play().then(() => {
                isFullSongPlaying = true;
                updateAudioPlaybackUI(true);
                setVinylSpinning(true);
              }).catch(() => {});
            }
          }
        }
      } catch (_) {}
    }
  }

  function updateAudioPlaybackUI(isPlaying) {
    if (playerPlayBtn) {
      const iconPlay = playerPlayBtn.querySelector('.icon-play');
      const iconPause = playerPlayBtn.querySelector('.icon-pause');
      if (iconPlay && iconPause) {
        iconPlay.style.display = isPlaying ? 'none' : 'block';
        iconPause.style.display = isPlaying ? 'block' : 'none';
      }
    }

    if (audioPlayToggleBtn) {
      audioPlayToggleBtn.classList.toggle('is-playing', isPlaying);
      const playIcon = audioPlayToggleBtn.querySelector('.play-icon');
      const pauseIcon = audioPlayToggleBtn.querySelector('.pause-icon');
      if (playIcon && pauseIcon) {
        playIcon.style.display = isPlaying ? 'none' : 'block';
        pauseIcon.style.display = isPlaying ? 'block' : 'none';
      }
      if (audioPlayBtnText) {
        audioPlayBtnText.textContent = isPlaying ? 'Pause' : 'Play';
      }
    }

    if (nowPlayingBadge) nowPlayingBadge.classList.toggle('is-playing', isPlaying);
    if (tracklistBadgeText) {
      tracklistBadgeText.textContent = isPlaying 
        ? (activeAlbumTracks[currentTrackIdx] ? `Playing: ${activeAlbumTracks[currentTrackIdx].title}` : 'Now Playing') 
        : 'Tracklist';
    }

    const activeRow = tracklistScrollArea ? tracklistScrollArea.querySelector('.track-row.is-active') : null;
    if (activeRow) {
      const eq = activeRow.querySelector('.track-playing-equalizer');
      const num = activeRow.querySelector('.num-text');
      if (eq && num) {
        eq.style.display = isPlaying ? 'inline-flex' : 'none';
        num.style.display = isPlaying ? 'none' : 'inline';
      }
    }

    setVinylSpinning(isPlaying);

    // Smoothly glide the tracks list to the side immediately when pressing play!
    if (isPlaying && stageContentWrap && stageContentWrap.classList.contains('mode-loaded')) {
      if (!stageContentWrap.classList.contains('is-tab-collapsed')) {
        setMusicTabCollapsed(true, true);
      }
    }
  }

  function resetNativePlayer() {
    if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
      try { ytPlayer.stopVideo(); } catch (_) {}
    }
    ytCurrentVideoId = null;
    isFullSongPlaying = false;
    stopProgressTracking();

    if (nativeAudioPlayer) {
      nativeAudioPlayer.pause();
      nativeAudioPlayer.src = '';
    }
    setVinylSpinning(false);
    if (playerCoverThumb) playerCoverThumb.style.backgroundImage = 'none';
    if (playerTrackTitle) playerTrackTitle.textContent = 'Select a track';
    if (playerTrackArtist) playerTrackArtist.textContent = 'Artist';
    if (progressCurrentTime) progressCurrentTime.textContent = '0:00';
    if (progressDurationTime) progressDurationTime.textContent = '-0:00';
    if (progressBarFill) progressBarFill.style.width = '0%';
    if (progressBarThumb) progressBarThumb.style.left = '0%';
    if (tracklistScrollArea) tracklistScrollArea.innerHTML = '';
    activeAlbumTracks = [];
    currentTrackIdx = 0;
    updateAudioPlaybackUI(false);
  }

  // --- Play/Pause Toggle Helper (Instant Pause & Resume) ---
  async function togglePlayPause() {
    initWebAudio();

    if (activeAlbumTracks.length === 0) return;

    // 1. If currently playing -> Pause immediately!
    if (isFullSongPlaying) {
      isFullSongPlaying = false;
      if (ytPlayer && ytPlayerReady && typeof ytPlayer.pauseVideo === 'function') {
        try { ytPlayer.pauseVideo(); } catch (_) {}
      }
      if (nativeAudioPlayer && !nativeAudioPlayer.paused) {
        try { nativeAudioPlayer.pause(); } catch (_) {}
      }
      stopProgressTracking();
      setVinylSpinning(false);
      updateAudioPlaybackUI(false);
      return;
    }

    // Immediately glide the tracks list to the side when resuming or pressing play!
    if (stageContentWrap && stageContentWrap.classList.contains('mode-loaded')) {
      if (!stageContentWrap.classList.contains('is-tab-collapsed')) {
        setMusicTabCollapsed(true, true);
      }
    }

    // 2. If paused and track is already loaded in YouTube player -> Resume from exact timestamp!
    if (ytCurrentVideoId && ytPlayer && ytPlayerReady && typeof ytPlayer.playVideo === 'function') {
      try {
        ytPlayer.playVideo();
        isFullSongPlaying = true;
        setVinylSpinning(true);
        updateAudioPlaybackUI(true);
        startProgressTracking();
        return;
      } catch (err) {
        console.warn('Error resuming YT player, restarting track:', err);
      }
    }

    // 3. If native audio element has a src loaded -> resume it
    if (nativeAudioPlayer && nativeAudioPlayer.src && nativeAudioPlayer.paused) {
      try {
        await nativeAudioPlayer.play();
        isFullSongPlaying = true;
        setVinylSpinning(true);
        updateAudioPlaybackUI(true);
        return;
      } catch (_) {}
    }

    // 4. Otherwise, select and load current track starting from 0:00
    selectTrack(currentTrackIdx, true);
  }

  if (playerPlayBtn) {
    playerPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlayPause();
    });
  }

  if (audioPlayToggleBtn) {
    audioPlayToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlayPause();
    });
  }

  if (stageTabToggle) {
    stageTabToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isCollapsed = stageContentWrap.classList.contains('is-tab-collapsed');
      setMusicTabCollapsed(!isCollapsed, true);
    });
  }

  if (playerShuffleBtn) {
    playerShuffleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isShuffle = !isShuffle;
      playerShuffleBtn.classList.toggle('is-active', isShuffle);
      playerShuffleBtn.title = isShuffle ? 'Shuffle is ON' : 'Shuffle playback';
      
      if (isShuffle && !isFullSongPlaying && activeAlbumTracks.length > 0) {
        const randIdx = getNextTrackIndex();
        selectTrack(randIdx, true);
      }
    });
  }

  if (playerPrevBtn) {
    playerPrevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeAlbumTracks.length === 0) return;
      const prevIdx = getPrevTrackIndex();
      selectTrack(prevIdx, true);
    });
  }

  if (playerNextBtn) {
    playerNextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeAlbumTracks.length === 0) return;
      const nextIdx = getNextTrackIndex();
      selectTrack(nextIdx, true);
    });
  }

  if (nativeAudioPlayer) {
    nativeAudioPlayer.addEventListener('timeupdate', () => {
      if (!nativeAudioPlayer.duration || isFullSongPlaying) return;
      const cur = nativeAudioPlayer.currentTime || 0;
      const dur = nativeAudioPlayer.duration || (activeAlbumTracks[currentTrackIdx]?.durationMs / 1000) || 0;
      if (dur > 0) {
        const percent = Math.min(100, (cur / dur) * 100);
        if (progressBarFill) progressBarFill.style.width = `${percent}%`;
        if (progressBarThumb) progressBarThumb.style.left = `${percent}%`;

        const curM = Math.floor(cur / 60);
        const curS = String(Math.floor(cur % 60)).padStart(2, '0');
        if (progressCurrentTime) progressCurrentTime.textContent = `${curM}:${curS}`;

        const rem = Math.max(0, dur - cur);
        const remM = Math.floor(rem / 60);
        const remS = String(Math.floor(rem % 60)).padStart(2, '0');
        if (progressDurationTime) progressDurationTime.textContent = `-${remM}:${remS}`;
      }
    });

    nativeAudioPlayer.addEventListener('play', () => {
      if (!isFullSongPlaying) {
        isFullSongPlaying = true;
        updateAudioPlaybackUI(true);
      }
    });
    nativeAudioPlayer.addEventListener('pause', () => {
      if (!ytPlayer || !ytPlayerReady || !isFullSongPlaying) {
        isFullSongPlaying = false;
        updateAudioPlaybackUI(false);
      }
    });
    nativeAudioPlayer.addEventListener('ended', () => {
      if (!ytPlayer || !ytPlayerReady || !isFullSongPlaying) {
        if (activeAlbumTracks.length > 1) {
          const nextIdx = getNextTrackIndex();
          selectTrack(nextIdx, true);
        } else {
          isFullSongPlaying = false;
          updateAudioPlaybackUI(false);
          setVinylSpinning(false);
        }
      }
    });
  }

  if (progressBarBg) {
    progressBarBg.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = progressBarBg.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

      if (ytPlayer && ytPlayerReady && isFullSongPlaying) {
        const dur = ytPlayer.getDuration() || (activeAlbumTracks[currentTrackIdx]?.durationMs / 1000) || 0;
        if (dur > 0) {
          ytPlayer.seekTo(percent * dur, true);
          return;
        }
      }

      if (nativeAudioPlayer && nativeAudioPlayer.duration) {
        nativeAudioPlayer.currentTime = percent * nativeAudioPlayer.duration;
      }
    });
  }

  // ==========================================================================
  // Working Real-Time Volume Scroller (Audibly changes music in user's ears!)
  // ==========================================================================

  function updateVolumeSpeakerIcon(vol) {
    if (!volumeSpeakerIcon) return;
    if (vol === 0) {
      volumeSpeakerIcon.innerHTML = `
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
      `;
      if (volumeSpeakerBtn) volumeSpeakerBtn.title = 'Unmute';
    } else if (vol < 50) {
      volumeSpeakerIcon.innerHTML = `
        <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
      `;
      if (volumeSpeakerBtn) volumeSpeakerBtn.title = 'Mute';
    } else {
      volumeSpeakerIcon.innerHTML = `
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
      `;
      if (volumeSpeakerBtn) volumeSpeakerBtn.title = 'Mute';
    }
  }

  function setVolume(vol, playSound = false) {
    vol = Math.max(0, Math.min(100, Math.round(vol)));
    currentVolume = vol;
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, vol);
    } catch (_) {}

    if (volumeTrackFill) volumeTrackFill.style.width = `${vol}%`;
    if (volumeThumb) volumeThumb.style.left = `${vol}%`;
    if (volumeTooltip) {
      volumeTooltip.style.left = `${vol}%`;
      volumeTooltip.textContent = `${vol}%`;
    }

    // 1. YouTube Background Player Volume
    if (ytPlayer && ytPlayerReady && typeof ytPlayer.setVolume === 'function') {
      try {
        ytPlayer.setVolume(vol);
      } catch (_) {}
    }

    // 2. Audible Real-Time HTML5 Audio Element Volume Control
    if (nativeAudioPlayer) {
      nativeAudioPlayer.volume = vol / 100;
    }

    updateVolumeSpeakerIcon(vol);

    if (playSound) {
      playKnurlTick();
    }
  }

  function handleVolumeBarInput(e, playSound = false) {
    if (e.target.closest('#volumeSpeakerBtn')) return;
    const track = volumeTrackBg || volumeSliderBar;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(percent * 100, playSound);
  }

  let isDraggingVolume = false;
  let lastTickVolume = currentVolume;

  if (volumeSliderBar) {
    volumeSliderBar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('#volumeSpeakerBtn')) return;
      e.stopPropagation();
      initWebAudio();
      isDraggingVolume = true;
      volumeSliderBar.classList.add('is-dragging');
      lastTickVolume = currentVolume;
      handleVolumeBarInput(e, true);
      try {
        volumeSliderBar.setPointerCapture(e.pointerId);
      } catch (_) {}
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDraggingVolume) return;
      handleVolumeBarInput(e, false);
      if (Math.abs(currentVolume - lastTickVolume) >= 3) {
        lastTickVolume = currentVolume;
        playKnurlTick();
      }
    });

    function endVolumeDrag(e) {
      if (!isDraggingVolume) return;
      isDraggingVolume = false;
      volumeSliderBar.classList.remove('is-dragging');
      try {
        volumeSliderBar.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    window.addEventListener('pointerup', endVolumeDrag);
    window.addEventListener('pointercancel', endVolumeDrag);

    volumeSliderBar.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      initWebAudio();
      const dir = (e.deltaY < 0 || e.deltaX > 0) ? 1 : -1;
      const step = e.shiftKey ? 6 : 3;
      setVolume(currentVolume + (dir * step), true);
    }, { passive: false });
  }

  if (playbackProgressSection) {
    playbackProgressSection.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      initWebAudio();
      const dir = (e.deltaY < 0 || e.deltaX > 0) ? 1 : -1;
      const step = e.shiftKey ? 6 : 3;
      setVolume(currentVolume + (dir * step), true);
    }, { passive: false });
  }

  if (volumeSpeakerBtn) {
    volumeSpeakerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentVolume > 0) {
        preMuteVolume = currentVolume;
        setVolume(0, true);
      } else {
        setVolume(preMuteVolume || 75, true);
      }
    });
  }

  // ==========================================================================
  // Cosmic Universe: Steady Starfield & Shooting Stars Engine
  // ==========================================================================
  function initCosmos() {
    const canvas = document.getElementById('cosmosCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars = [];
    let meteors = [];

    // Star Spectral Colors (Calm, natural cosmic points of light)
    const starColors = [
      '#ffffff', // Diamond White
      '#f0f4ff', // Crisp Starlight
      '#dbeafe', // Ice Blue
      '#fef3c7', // Warm Amber
      '#f3e8ff', // Cosmic Violet
      '#c7d2fe'  // Soft Indigo
    ];

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createStarfield();
    }

    function createStarfield() {
      stars = [];
      const starCount = Math.floor((width * height) / 3600) + 180;

      for (let i = 0; i < starCount; i++) {
        const isCluster = Math.random() < 0.18;
        const isBright = Math.random() < 0.12;
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: isBright ? (Math.random() * 0.9 + 1.1) : (isCluster ? (Math.random() * 0.6 + 0.6) : (Math.random() * 0.45 + 0.35)),
          alpha: isBright ? (Math.random() * 0.25 + 0.72) : (Math.random() * 0.45 + 0.32),
          color: starColors[Math.floor(Math.random() * starColors.length)],
          depth: Math.random() * 0.35 + 0.45
        });
      }
    }

    function spawnMeteor() {
      const startX = Math.random() * width * 0.8 + width * 0.1;
      const startY = Math.random() * height * 0.35;
      const length = Math.random() * 150 + 110;
      const angle = (Math.PI / 4) + (Math.random() * 0.26 - 0.13);
      const speed = Math.random() * 7 + 12;

      meteors.push({
        x: startX,
        y: startY,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        length: length,
        life: 1.0,
        decay: Math.random() * 0.015 + 0.012
      });
    }

    let lastMeteorTime = performance.now();
    let meteorInterval = Math.random() * 8000 + 8000;

    function render(now) {
      ctx.clearRect(0, 0, width, height);

      // Continuous, infinite parallax shift (no modulo reset, totally seamless)
      const rot = (typeof currentRotation === 'number') ? currentRotation : 0;
      const rotShift = rot * 1.1;

      // 1. Draw Steady Stars (No blinking, calm constant starlight, infinite seamless wrapping)
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        // Wrap continuously across canvas width
        let rawX = s.x + rotShift * s.depth;
        let drawX = ((rawX % width) + width) % width;

        // Star Core
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.arc(drawX, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();

        // Subtle stationary halo on larger stars
        if (s.r > 1.2) {
          ctx.fillStyle = s.color;
          ctx.globalAlpha = s.alpha * 0.22;
          ctx.beginPath();
          ctx.arc(drawX, s.y, s.r * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Draw Meteors / Shooting Stars
      if (now - lastMeteorTime > meteorInterval) {
        spawnMeteor();
        lastMeteorTime = now;
        meteorInterval = Math.random() * 9000 + 7000;
      }

      for (let m = meteors.length - 1; m >= 0; m--) {
        const met = meteors[m];
        met.x += met.dx;
        met.y += met.dy;
        met.life -= met.decay;

        if (met.life <= 0 || met.x > width + 200 || met.y > height + 200) {
          meteors.splice(m, 1);
          continue;
        }

        const tailX = met.x - (met.dx / Math.hypot(met.dx, met.dy)) * met.length;
        const tailY = met.y - (met.dy / Math.hypot(met.dx, met.dy)) * met.length;

        const mGrad = ctx.createLinearGradient(tailX, tailY, met.x, met.y);
        mGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        mGrad.addColorStop(0.7, 'rgba(180, 230, 255, 0.45)');
        mGrad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');

        ctx.strokeStyle = mGrad;
        ctx.lineWidth = 1.7;
        ctx.globalAlpha = met.life;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(met.x, met.y);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = met.life;
        ctx.beginPath();
        ctx.arc(met.x, met.y, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(render);
    }

    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(render);
  }

  // --- Bootstrap ---
  initCosmos();
  initCircle();
  initYtPlayer();
  requestAnimationFrame(updatePhysics);
})();

