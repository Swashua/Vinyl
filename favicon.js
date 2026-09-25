/**
 * Spinning Pixelated Vinyl Favicon
 * - Procedurally generates crisp retro pixel-art vinyl frames
 * - Smoothly rotates the favicon in the browser tab
 * - Pre-buffers frames to ensure 0 CPU overhead
 * - Automatically pauses on hidden tab to conserve resources
 */
(() => {
  'use strict';

  const SIZE = 32; // Standard High-DPI Favicon size
  const TOTAL_FRAMES = 24; // 24 frames for 360-degree rotation (15 deg per frame)
  const FRAME_INTERVAL = 65; // ~15.4 FPS retro pixel animation rate

  // Offscreen canvas for pre-rendering frames
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  // Ensure favicon link element exists
  let faviconLink = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
  if (!faviconLink) {
    faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    faviconLink.type = 'image/png';
    document.head.appendChild(faviconLink);
  }

  /**
   * Render a single pixelated vinyl frame at a given rotation angle (in radians)
   */
  function drawVinylFrame(angle) {
    ctx.clearRect(0, 0, SIZE, SIZE);
    const imgData = ctx.createImageData(SIZE, SIZE);
    const data = imgData.data;

    const cx = (SIZE - 1) / 2;
    const cy = (SIZE - 1) / 2;
    const maxR = SIZE / 2 - 0.6;
    const labelR = SIZE * 0.20;
    const holeR = SIZE * 0.06;

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy);
        const idx = (y * SIZE + x) * 4;

        // Outside vinyl disc boundary
        if (dist > maxR) {
          data[idx + 3] = 0; // Transparent
          continue;
        }

        // Outer dark rim / pixel border
        if (dist > maxR - 1.1) {
          data[idx] = 12;     // R
          data[idx + 1] = 12; // G
          data[idx + 2] = 15; // B
          data[idx + 3] = 255;
          continue;
        }

        // Center spindle hole
        if (dist <= holeR) {
          data[idx] = 5;
          data[idx + 1] = 5;
          data[idx + 2] = 7;
          data[idx + 3] = 255;
          continue;
        }
        if (dist <= holeR + 0.6) {
          data[idx] = 30;
          data[idx + 1] = 30;
          data[idx + 2] = 36;
          data[idx + 3] = 255;
          continue;
        }

        // Compute angle relative to spinning vinyl
        const curAngle = Math.atan2(dy, dx) - angle;
        const normAngle = ((curAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const halfAngle = normAngle % Math.PI;

        // Center Record Label (Retro Rose/Crimson)
        if (dist <= labelR) {
          // Outer label rim ring
          if (dist > labelR - 0.8) {
            data[idx] = 251;     // #fb7185
            data[idx + 1] = 113;
            data[idx + 2] = 133;
            data[idx + 3] = 255;
            continue;
          }

          // Rotating label accent / SIDE A notch
          const isMarker = (normAngle < 0.6 || (normAngle > Math.PI && normAngle < Math.PI + 0.6)) &&
                           dist > holeR + 1.2 && dist < labelR - 0.8;
          if (isMarker) {
            data[idx] = 255;     // White marker dot / stripe
            data[idx + 1] = 255;
            data[idx + 2] = 255;
            data[idx + 3] = 255;
          } else {
            data[idx] = 225;     // #e11d48 Vinyl Crimson
            data[idx + 1] = 29;
            data[idx + 2] = 72;
            data[idx + 3] = 255;
          }
          continue;
        }

        // Vinyl Grooves & Anisotropic Light Sheen
        const sheen = Math.abs(Math.sin(halfAngle * 2));
        const grooveTrack = Math.floor(dist * 1.6) % 2;

        if (sheen > 0.86) {
          // Bright specular sheen reflection
          if (grooveTrack === 0) {
            data[idx] = 203;     // #cbd5e1 Light Slate Silver
            data[idx + 1] = 213;
            data[idx + 2] = 225;
          } else {
            data[idx] = 148;     // #94a3b8 Slate Silver
            data[idx + 1] = 163;
            data[idx + 2] = 184;
          }
        } else if (sheen > 0.65) {
          // Medium sheen reflection
          if (grooveTrack === 0) {
            data[idx] = 100;     // #64748b Medium Slate
            data[idx + 1] = 116;
            data[idx + 2] = 139;
          } else {
            data[idx] = 71;      // #475569 Dark Slate
            data[idx + 1] = 85;
            data[idx + 2] = 105;
          }
        } else {
          // Base deep vinyl body with grooves
          if (grooveTrack === 0) {
            data[idx] = 30;      // #1e293b Midnight Navy
            data[idx + 1] = 41;
            data[idx + 2] = 59;
          } else {
            data[idx] = 15;      // #0f172a Deep Obsidian
            data[idx + 1] = 23;
            data[idx + 2] = 42;
          }
        }
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  // Pre-generate all rotation frames
  const frames = [];
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const angle = (i / TOTAL_FRAMES) * (2 * Math.PI);
    frames.push(drawVinylFrame(angle));
  }

  let currentFrameIndex = 0;
  let timerId = null;

  function updateFavicon() {
    currentFrameIndex = (currentFrameIndex + 1) % TOTAL_FRAMES;
    faviconLink.href = frames[currentFrameIndex];
  }

  function startAnimation() {
    if (timerId !== null) return;
    timerId = setInterval(updateFavicon, FRAME_INTERVAL);
  }

  function stopAnimation() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  // Set initial frame immediately
  faviconLink.href = frames[0];
  startAnimation();

  // Handle visibility change to save CPU when tab is in background
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAnimation();
    } else {
      startAnimation();
    }
  });

  // Export control API if needed
  window.PixelVinylFavicon = {
    start: startAnimation,
    stop: stopAnimation,
    setSpeed: (intervalMs) => {
      stopAnimation();
      timerId = setInterval(updateFavicon, intervalMs);
    }
  };
})();
