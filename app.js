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
  const musicAlbumTitle = document.getElementById('musicAlbumTitle');
  const musicPlayerFrame = document.getElementById('musicPlayerFrame');
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

  // Thin Volume Slider Elements (Positioned right below the playback white line)
  const volumeSliderBar = document.getElementById('volumeSliderBar');
  const volumeSpeakerBtn = document.getElementById('volumeSpeakerBtn');
  const volumeSpeakerIcon = document.getElementById('volumeSpeakerIcon');
  const volumeTrackBg = document.getElementById('volumeTrackBg');
  const volumeTrackFill = document.getElementById('volumeTrackFill');
  const volumeThumb = document.getElementById('volumeThumb');
  const volumeTooltip = document.getElementById('volumeTooltip');

  // --- LocalStorage Persistence System ---
  // v2: wiped v1 stale iTunes data — Spotify only from here on
  const STORAGE_KEY = 'disc_saved_albums_v2';

  function getSavedAlbums() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
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
      const customAlbum = (saved && saved.coverUrl) ? saved : null;

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

    const webMatch = url.match(/(album|track|playlist)\/([a-zA-Z0-9]+)/);
    if (webMatch) {
      return { type: webMatch[1], id: webMatch[2] };
    }

    const uriMatch = url.match(/spotify:(album|track|playlist):([a-zA-Z0-9]+)/);
    if (uriMatch) {
      return { type: uriMatch[1], id: uriMatch[2] };
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
      const errMsg = 'Please enter a valid Spotify link (album or playlist).';
      if (isInline) inlineEditError.textContent = errMsg;
      else spotifyErrorMsg.textContent = errMsg;
      return;
    }

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
      // 1. Directly fetch playlist or album details from backend
      const res = await fetch(`/api/spotify-tracks?type=${parsed.type}&id=${parsed.id}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Could not fetch Spotify playlist. Please ensure it is public.');
      }

      const data = await res.json();
      if (!data || (data.error && (!data.tracks || data.tracks.length === 0))) {
        throw new Error(data.error || 'No tracks found in this Spotify link.');
      }

      albumData = {
        title: data.title || (parsed.type === 'playlist' ? 'Custom Playlist' : 'Spotify Music'),
        artist: data.artist || '',
        coverUrl: data.coverUrl || '',
        spotifyUrl: url,
        type: parsed.type,
        id: parsed.id
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

      // 4. Force reflow so stageVinylAnchor is in its loaded left-column position
      void stageVinylAnchor.offsetWidth;
      const leftAnchorRect = stageVinylAnchor.getBoundingClientRect();

      // 5. Smooth physical animation: vinyl moves from center to the left!
      stageAlbum.style.transition = `
        left 0.75s cubic-bezier(0.16, 1, 0.3, 1),
        top 0.75s cubic-bezier(0.16, 1, 0.3, 1),
        width 0.75s cubic-bezier(0.16, 1, 0.3, 1),
        height 0.75s cubic-bezier(0.16, 1, 0.3, 1),
        transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)
      `;
      stageAlbum.style.left = `${leftAnchorRect.left}px`;
      stageAlbum.style.top = `${leftAnchorRect.top}px`;
      stageAlbum.style.width = `${leftAnchorRect.height}px`;
      stageAlbum.style.height = `${leftAnchorRect.height}px`;

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

    // 5. Target position: Read from stageVinylAnchor (Center if empty / Left if loaded)
    const anchorRect = stageVinylAnchor.getBoundingClientRect();

    // 6. Smooth physical spring curve into place
    stageAlbum.style.transition = `
      left 0.65s cubic-bezier(0.16, 1, 0.3, 1),
      top 0.65s cubic-bezier(0.16, 1, 0.3, 1),
      width 0.65s cubic-bezier(0.16, 1, 0.3, 1),
      height 0.65s cubic-bezier(0.16, 1, 0.3, 1),
      transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)
    `;

    stageAlbum.style.left = `${anchorRect.left}px`;
    stageAlbum.style.top = `${anchorRect.top}px`;
    stageAlbum.style.width = `${anchorRect.height}px`;
    stageAlbum.style.height = `${anchorRect.height}px`;
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
    stageAlbum.classList.remove('is-open');
    setVinylSpinning(false);
    inlineEditBar.classList.remove('is-open');

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
    void stageVinylAnchor.offsetWidth;
    const centerAnchorRect = stageVinylAnchor.getBoundingClientRect();
    stageAlbum.style.transition = `
      left 0.65s cubic-bezier(0.16, 1, 0.3, 1),
      top 0.65s cubic-bezier(0.16, 1, 0.3, 1),
      width 0.65s cubic-bezier(0.16, 1, 0.3, 1),
      height 0.65s cubic-bezier(0.16, 1, 0.3, 1),
      transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)
    `;
    stageAlbum.style.left = `${centerAnchorRect.left}px`;
    stageAlbum.style.top = `${centerAnchorRect.top}px`;
    stageAlbum.style.width = `${centerAnchorRect.height}px`;
    stageAlbum.style.height = `${centerAnchorRect.height}px`;

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
    if (!activeAlbum.customAlbum) {
      spotifyUrlInput.focus();
    } else {
      togglePlayPause();
    }
  });

  // Clicking away from the album returns it to the shelf!
  inspectionStage.addEventListener('click', (e) => {
    if (!activeAlbum || isTransitioning) return;

    const clickedAlbum = e.target.closest('#stageAlbum');
    const clickedSearch = e.target.closest('#stageEmptySearch');
    const clickedMusicTab = e.target.closest('#stageMusicTab');
    const clickedCloseBtn = e.target.closest('#stageCloseBtn');

    if (clickedCloseBtn) return;

    if (clickedAlbum) {
      if (!activeAlbum.customAlbum) {
        spotifyUrlInput.focus();
      }
      return;
    }

    if (clickedSearch || clickedMusicTab) {
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
      const anchorRect = stageVinylAnchor.getBoundingClientRect();
      stageAlbum.style.transition = 'none';
      stageAlbum.style.left = `${anchorRect.left}px`;
      stageAlbum.style.top = `${anchorRect.top}px`;
      stageAlbum.style.width = `${anchorRect.height}px`;
      stageAlbum.style.height = `${anchorRect.height}px`;
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

  // Smoothly tint the scene background and ambient glow to match the album
  function setSceneBackgroundColor(r, g, b, opacity = 0.58) {
    document.documentElement.style.setProperty('--album-r', r);
    document.documentElement.style.setProperty('--album-g', g);
    document.documentElement.style.setProperty('--album-b', b);
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
    setSceneBackgroundColor(35, 43, 62, 0.38);
    document.body.style.backgroundColor = 'var(--bg-color)';
    if (stageBackdrop) stageBackdrop.style.background = '';
    const ambientGlow = document.querySelector('.ambient-glow');
    if (ambientGlow) ambientGlow.style.background = '';
    const spotlight = document.querySelector('.spotlight');
    if (spotlight) spotlight.style.background = '';
  }

  // ==========================================================================
  // Native Spotify-Styled Player Engine & Real-Time Volume Control
  // ==========================================================================

  let activeAlbumTracks = [];
  let currentTrackIdx = 0;
  const VOLUME_STORAGE_KEY = 'disc_player_volume';
  let currentVolume = parseFloat(localStorage.getItem(VOLUME_STORAGE_KEY) || '75');
  let preMuteVolume = 75;

  // ==========================================================================
  // ==========================================================================
  // Full-Song Audio Player Engine (Plays entire song without previews or video UI)
  // ==========================================================================
  let ytPlayer = null;
  let ytPlayerReady = false;
  let ytCurrentVideoId = null;
  let ytProgressTimer = null;
  let isFullSongPlaying = false;

  function initYouTubePlayer() {
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
          'enablejsapi': 1,
          'origin': window.location.origin
        },
        events: {
          'onReady': onYtPlayerReady,
          'onStateChange': onYtPlayerStateChange,
          'onError': (e) => {
            console.warn('YouTube Audio Player error:', e);
          }
        }
      });
    } catch (err) {
      console.warn('Failed to create YT.Player instance:', err);
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
    } else if (event.data === YT.PlayerState.ENDED) {
      isFullSongPlaying = false;
      stopProgressTracking();
      // Auto-advance to the next track in the album!
      if (activeAlbumTracks.length > 1) {
        const nextIdx = (currentTrackIdx + 1) % activeAlbumTracks.length;
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

    const query = `${cleanArtist} ${cleanTitle} official audio`.trim();

    // 1. Primary: Local Disc server API
    try {
      const res = await fetch(`/api/search-yt?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.videoId) {
          track.videoId = data.videoId;
          return data.videoId;
        }
      }
    } catch (e) {
      console.warn('Local search-yt endpoint query error:', e);
    }

    // 2. Fallback: Invidious public instances
    const invidiousHosts = [
      'https://inv.nadeko.net',
      'https://invidious.nerdvpn.de',
      'https://invidious.jing.rocks'
    ];

    for (const host of invidiousHosts) {
      try {
        const invRes = await fetch(`${host}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
          signal: AbortSignal.timeout(3000)
        });
        if (invRes.ok) {
          const items = await invRes.json();
          if (Array.isArray(items) && items.length > 0 && items[0].videoId) {
            track.videoId = items[0].videoId;
            return items[0].videoId;
          }
        }
      } catch (_) {}
    }

    return null;
  }

  let audioCtx = null;
  let synthGainNode = null;
  let synthInterval = null;

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

  // Lo-Fi Vinyl Chord Synthesizer Fallback (Plays if a preview stream is missing)
  function playSynthFallbackTrack() {
    initWebAudio();
    stopSynthFallback();
    if (!audioCtx) return;

    synthGainNode = audioCtx.createGain();
    synthGainNode.gain.setValueAtTime((currentVolume / 100) * 0.14, audioCtx.currentTime);
    synthGainNode.connect(audioCtx.destination);

    const chords = [
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [164.81, 196.00, 246.94, 293.66], // Em7
      [146.83, 174.61, 220.00, 261.63], // Dm7
      [130.81, 164.81, 196.00, 246.94]  // Cmaj7
    ];
    let chordIdx = 0;

    function playChord() {
      if (!synthGainNode || audioCtx.state === 'suspended') return;
      const freqs = chords[chordIdx % chords.length];
      chordIdx++;
      freqs.forEach(freq => {
        try {
          const osc = audioCtx.createOscillator();
          const voiceGain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
          voiceGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
          voiceGain.gain.exponentialRampToValueAtTime(0.038, audioCtx.currentTime + 0.12);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.85);
          osc.connect(voiceGain);
          voiceGain.connect(synthGainNode);
          osc.start();
          osc.stop(audioCtx.currentTime + 1.9);
        } catch (_) {}
      });
    }

    playChord();
    synthInterval = setInterval(playChord, 2000);
  }

  function stopSynthFallback() {
    if (synthInterval) {
      clearInterval(synthInterval);
      synthInterval = null;
    }
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
  }

  // Fetch full tracklist in strict official album track order

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

    // 3. Fetch tracks strictly from Spotify
    let tracks = [];

    let spotifyType = albumData.type || 'playlist';
    let spotifyId   = albumData.id;

    if (albumData.spotifyUrl) {
      const reParsed = parseSpotifyUrl(albumData.spotifyUrl);
      if (reParsed) {
        spotifyType = reParsed.type;
        spotifyId   = reParsed.id;
      }
    }

    if (tracklistScrollArea) {
      tracklistScrollArea.innerHTML = '<div style="padding:32px 16px; text-align:center; color:rgba(255,255,255,0.6); font-size:14px; letter-spacing:0.5px;">Loading playlist tracks...</div>';
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
            // Update cover art if Spotify gives us a better one
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
              number:      idx + 1,
              title:       t.title,
              artist:      t.artist || albumData.artist || '',
              album:       albumData.title,
              durationMs:  t.durationMs || 0,
              durationStr: formatDuration(t.durationMs || 0)
            }));
          } else {
            console.warn('[Disc] Spotify returned 0 tracks for', spotifyType, spotifyId);
          }
        } else {
          console.warn('[Disc] Spotify endpoint returned', res.status, 'for', spotifyType, spotifyId);
        }
      } catch (err) {
        console.warn('[Disc] Spotify track fetch error:', err);
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

      row.innerHTML = `
        <div class="track-num">
          <span class="num-text" style="${isPlaying ? 'display:none;' : 'display:inline;'}">${track.number}</span>
          <div class="track-playing-equalizer" style="${isPlaying ? 'display:inline-flex;' : 'display:none;'}">
            <span></span><span></span><span></span>
          </div>
        </div>
        <div class="track-info-col">
          <div class="track-row-title">${track.title}</div>
          <div class="track-row-artist">${track.artist}</div>
        </div>
        <div class="track-row-duration">${track.durationStr}</div>
      `;

      row.addEventListener('click', (e) => {
        e.stopPropagation();
        selectTrack(idx, true);
      });

      tracklistScrollArea.appendChild(row);
    });
  }

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

    stopSynthFallback();
    stopProgressTracking();
    if (nativeAudioPlayer) {
      nativeAudioPlayer.pause();
      nativeAudioPlayer.src = '';
    }

    if (autoPlay && tracklistBadgeText) {
      tracklistBadgeText.textContent = `Loading: ${track.title}...`;
    }

    // Resolve and play full song
    const videoId = await fetchFullTrackVideoId(track);

    if (videoId && ytPlayer && ytPlayerReady) {
      ytCurrentVideoId = videoId;
      try {
        if (autoPlay) {
          ytPlayer.loadVideoById(videoId);
          ytPlayer.playVideo();
          isFullSongPlaying = true;
          updateAudioPlaybackUI(true);
          setVinylSpinning(true);
        } else {
          ytPlayer.cueVideoById(videoId);
          updateAudioPlaybackUI(false);
        }
        return;
      } catch (err) {
        console.warn('Error loading video in YT Player:', err);
      }
    }
  }

  function updateAudioPlaybackUI(isPlaying) {
    // 1. Update player hero row play/pause button
    if (playerPlayBtn) {
      const iconPlay = playerPlayBtn.querySelector('.icon-play');
      const iconPause = playerPlayBtn.querySelector('.icon-pause');
      if (iconPlay && iconPause) {
        iconPlay.style.display = isPlaying ? 'none' : 'block';
        iconPause.style.display = isPlaying ? 'block' : 'none';
      }
    }

    // 2. Update header top action play button
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

    // 3. Update now playing badge and tracklist header
    if (nowPlayingBadge) nowPlayingBadge.classList.toggle('is-playing', isPlaying);
    if (tracklistBadgeText) {
      tracklistBadgeText.textContent = isPlaying 
        ? (activeAlbumTracks[currentTrackIdx] ? `Playing: ${activeAlbumTracks[currentTrackIdx].title}` : 'Now Playing') 
        : 'Tracklist';
    }

    // 4. Update track equalizer animation
    const activeRow = tracklistScrollArea ? tracklistScrollArea.querySelector('.track-row.is-active') : null;
    if (activeRow) {
      const eq = activeRow.querySelector('.track-playing-equalizer');
      const num = activeRow.querySelector('.num-text');
      if (eq && num) {
        eq.style.display = isPlaying ? 'inline-flex' : 'none';
        num.style.display = isPlaying ? 'none' : 'inline';
      }
    }

    // 5. Spin vinyl on album whenever playing, stop immediately when paused
    setVinylSpinning(isPlaying);
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
    stopSynthFallback();
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

  // --- Play/Pause Toggle Helper ---
  async function togglePlayPause() {
    initWebAudio();

    if (ytPlayer && ytPlayerReady && ytCurrentVideoId) {
      try {
        const state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
          ytPlayer.pauseVideo();
          setVinylSpinning(false);
          updateAudioPlaybackUI(false);
        } else {
          ytPlayer.playVideo();
          setVinylSpinning(true);
          updateAudioPlaybackUI(true);
        }
        return;
      } catch (_) {}
    }

    if (activeAlbumTracks.length > 0) {
      selectTrack(currentTrackIdx, true);
      return;
    }

    if (!nativeAudioPlayer) return;

    if (nativeAudioPlayer.paused && !synthInterval) {
      try {
        if (nativeAudioPlayer.src) {
          await nativeAudioPlayer.play();
        } else {
          playSynthFallbackTrack();
        }
        updateAudioPlaybackUI(true);
        setVinylSpinning(true);
      } catch (err) {
        console.warn('Play error, switching to synth:', err);
        playSynthFallbackTrack();
        updateAudioPlaybackUI(true);
        setVinylSpinning(true);
      }
    } else {
      nativeAudioPlayer.pause();
      stopSynthFallback();
      updateAudioPlaybackUI(false);
      setVinylSpinning(false);
    }
  }

  // Play button in hero row
  if (playerPlayBtn) {
    playerPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlayPause();
    });
  }

  // Play button in top header row
  if (audioPlayToggleBtn) {
    audioPlayToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlayPause();
    });
  }

  if (playerPrevBtn) {
    playerPrevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeAlbumTracks.length === 0) return;
      const prevIdx = (currentTrackIdx - 1 + activeAlbumTracks.length) % activeAlbumTracks.length;
      selectTrack(prevIdx, true);
    });
  }

  if (playerNextBtn) {
    playerNextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeAlbumTracks.length === 0) return;
      const nextIdx = (currentTrackIdx + 1) % activeAlbumTracks.length;
      selectTrack(nextIdx, true);
    });
  }

  // Audio Timeupdate -> Progress bar
  if (nativeAudioPlayer) {
    nativeAudioPlayer.addEventListener('timeupdate', () => {
      if (!nativeAudioPlayer.duration || isFullSongPlaying) return;
      const cur = nativeAudioPlayer.currentTime;
      const dur = nativeAudioPlayer.duration;
      const percent = (cur / dur) * 100;

      if (progressBarFill) progressBarFill.style.width = `${percent}%`;
      if (progressBarThumb) progressBarThumb.style.left = `${percent}%`;

      const curM = Math.floor(cur / 60);
      const curS = String(Math.floor(cur % 60)).padStart(2, '0');
      if (progressCurrentTime) progressCurrentTime.textContent = `${curM}:${curS}`;

      const rem = dur - cur;
      const remM = Math.floor(rem / 60);
      const remS = String(Math.floor(rem % 60)).padStart(2, '0');
      if (progressDurationTime) progressDurationTime.textContent = `-${remM}:${remS}`;
    });

    nativeAudioPlayer.addEventListener('play', () => updateAudioPlaybackUI(true));
    nativeAudioPlayer.addEventListener('pause', () => updateAudioPlaybackUI(false));
    nativeAudioPlayer.addEventListener('ended', () => {
      if (activeAlbumTracks.length > 1) {
        const nextIdx = (currentTrackIdx + 1) % activeAlbumTracks.length;
        selectTrack(nextIdx, true);
      } else {
        updateAudioPlaybackUI(false);
      }
    });
  }

  // Seek bar click / drag
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
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27l4.73 4.73H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
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

  // CRITICAL: setVolume actually changes the song volume in real time!
  function setVolume(vol, playSound = false) {
    vol = Math.max(0, Math.min(100, Math.round(vol)));
    currentVolume = vol;
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, vol);
    } catch (_) {}

    // 1. Update UI Elements
    if (volumeTrackFill) volumeTrackFill.style.width = `${vol}%`;
    if (volumeThumb) volumeThumb.style.left = `${vol}%`;
    if (volumeTooltip) {
      volumeTooltip.style.left = `${vol}%`;
      volumeTooltip.textContent = `${vol}%`;
    }

    // 2. Full-Song YouTube Audio Player Volume Control
    if (ytPlayer && ytPlayerReady && typeof ytPlayer.setVolume === 'function') {
      try {
        ytPlayer.setVolume(vol);
      } catch (_) {}
    }

    // 3. Audible Real-Time HTML5 Audio Element Volume Control (Changes sound in real time!)
    if (nativeAudioPlayer) {
      nativeAudioPlayer.volume = vol / 100;
    }

    // 3. Fallback Synthesizer Volume Control
    if (synthGainNode && audioCtx) {
      try {
        synthGainNode.gain.setValueAtTime((vol / 100) * 0.14, audioCtx.currentTime);
      } catch (_) {}
    }

    updateVolumeSpeakerIcon(vol);

    if (playSound) {
      playKnurlTick();
    }
  }

  // Handle pointer input on the volume slider
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

    // MOUSE WHEEL SCROLLING ON VOLUME BAR (Smooth real-time scrolling!)
    volumeSliderBar.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      initWebAudio();
      const dir = (e.deltaY < 0 || e.deltaX > 0) ? 1 : -1;
      const step = e.shiftKey ? 6 : 3;
      setVolume(currentVolume + (dir * step), true);
    }, { passive: false });
  }

  // ALSO ENABLE MOUSE WHEEL SCROLLING ON THE PROGRESS / HERO CONTROLS!
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

  // Speaker button click: toggle mute / restore previous volume
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

  // Initialize YouTube player engine
  initYouTubePlayer();

  // Initialize volume state
  setVolume(currentVolume, false);

  // --- Bootstrap ---
  initCircle();
  requestAnimationFrame(updatePhysics);
})();

