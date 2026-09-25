/**
 * Turntable Needle Drop Opening Experience (Enhanced Luxury Edition)
 * - Procedural Web Audio vinyl needle drop, sub-thump, and surface crackle FX
 * - Interactive 3D tilt & mouse parallax on turntable chassis
 * - Smooth multi-stage mechanical tonearm cueing & platter physics
 * - Real-optics strobe projector beam with platter rim & vinyl specular reflections
 * - Dynamic soundwave ripple shockwaves upon needle contact
 * - Silky-smooth cinematic crossfade transition into the 360° vinyl rotunda
 */
(() => {
  'use strict';

  let audioCtx = null;
  let crackleGain = null;
  let isDropping = false;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  /**
   * Procedurally synthesizes an authentic analog vinyl needle-drop
   * - 60Hz damped mechanical thump on stylus contact
   * - Warm vinyl surface noise & authentic random crackle pops
   * - Gentle 50Hz turntable motor hum
   */
  function playNeedleDropAudio() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Stylus Contact Mechanical Thud (Low-end transient pop)
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(115, now);
    thudOsc.frequency.exponentialRampToValueAtTime(30, now + 0.09);

    thudGain.gain.setValueAtTime(0.32, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(now);
    thudOsc.stop(now + 0.15);

    // 2. High-frequency needle scratch transient
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(3600, now);
    snapOsc.frequency.exponentialRampToValueAtTime(380, now + 0.028);

    snapGain.gain.setValueAtTime(0.11, now);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(now);
    snapOsc.stop(now + 0.05);

    // 3. Ambient Vinyl Crackle & Surface Noise (Procedural White/Pink Noise with Random Bursts)
    const bufferSize = ctx.sampleRate * 2.8;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise filter approximation
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      let sample = (b0 + b1 + b2 + white * 0.5362) * 0.038;

      // Random micro-pops / vinyl groove dust particles
      if (Math.random() < 0.0022) {
        sample += (Math.random() * 2 - 1) * 0.4;
      }
      output[i] = sample;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // Filter to warm analog groove spectrum (200Hz - 4500Hz)
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1350, now);
    filter.Q.setValueAtTime(0.75, now);

    crackleGain = ctx.createGain();
    crackleGain.gain.setValueAtTime(0.001, now);
    crackleGain.gain.linearRampToValueAtTime(0.2, now + 0.06);
    // Smoothly fade out as we enter the 3D listening room
    crackleGain.gain.setValueAtTime(0.2, now + 1.4);
    crackleGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);

    noiseSource.connect(filter);
    filter.connect(crackleGain);
    crackleGain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 2.8);
  }

  function initTurntableIntro() {
    const introSection = document.getElementById('turntableIntro');
    if (!introSection) return;

    const deckStage = document.getElementById('turntableStage');
    const turntableChassis = document.getElementById('turntableChassis');
    const enterBtn = document.getElementById('introEnterBtn');
    const tonearmWand = document.getElementById('deckTonearmWand');
    const tonearmCueLever = document.getElementById('tonearmCueLever');
    const stylusNeedle = document.getElementById('stylusNeedle');
    const deckPlatter = document.getElementById('deckPlatter');
    const powerLed = document.getElementById('powerLed');
    const strobeLamp = document.getElementById('strobeLamp');
    const strobeBeam = document.getElementById('strobeBeam');
    const strobePlatterReflection = document.getElementById('strobePlatterReflection');
    const strobeVinylSheen = document.getElementById('strobeVinylSheen');
    const needleRipple = document.getElementById('needleRipple');
    const viewport = document.getElementById('viewport');

    // --- Interactive 3D Parallax Tilt with Smooth Lerp ---
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;
    let tiltAnimFrame = null;

    function handleMouseMove(e) {
      if (isDropping) return;
      const xRatio = (e.clientX / window.innerWidth) - 0.5;
      const yRatio = (e.clientY / window.innerHeight) - 0.5;
      targetTiltX = xRatio * 14; // max 7 deg horizontal tilt
      targetTiltY = -yRatio * 12; // max 6 deg vertical tilt
    }

    function updateTiltPhysics() {
      if (!isDropping) {
        currentTiltX += (targetTiltX - currentTiltX) * 0.08;
        currentTiltY += (targetTiltY - currentTiltY) * 0.08;
      } else {
        // Return smoothly to flat alignment during needle drop
        currentTiltX += (0 - currentTiltX) * 0.12;
        currentTiltY += (0 - currentTiltY) * 0.12;
      }
      if (turntableChassis) {
        turntableChassis.style.setProperty('--tilt-x', `${currentTiltX.toFixed(2)}deg`);
        turntableChassis.style.setProperty('--tilt-y', `${currentTiltY.toFixed(2)}deg`);
      }
      tiltAnimFrame = requestAnimationFrame(updateTiltPhysics);
    }

    window.addEventListener('pointermove', handleMouseMove, { passive: true });
    tiltAnimFrame = requestAnimationFrame(updateTiltPhysics);

    // --- Multi-Stage Choreographed Needle Drop ---
    function triggerNeedleDrop() {
      if (isDropping) return;
      isDropping = true;

      // Unlock browser audio context immediately on user gesture
      getAudioContext();

      // 1. Power On: LED turns green, Strobe lamp, projector beam, and optical reflections ignite
      introSection.classList.add('is-starting');
      if (powerLed) powerLed.classList.add('is-active');
      if (strobeLamp) strobeLamp.classList.add('is-active');
      if (strobeBeam) strobeBeam.classList.add('is-active');
      if (strobePlatterReflection) strobePlatterReflection.classList.add('is-active');
      if (strobeVinylSheen) strobeVinylSheen.classList.add('is-active');

      // 2. Platter starts accelerating smoothly into 33⅓ RPM spin
      setTimeout(() => {
        if (deckPlatter) {
          deckPlatter.classList.add('is-spinning');
        }
      }, 100);

      // 3. Tonearm cue lever drops & tonearm lifts out of cradle
      setTimeout(() => {
        if (tonearmCueLever) tonearmCueLever.classList.add('is-down');
        if (tonearmWand) {
          tonearmWand.classList.remove('is-dropped');
          tonearmWand.classList.add('is-lifting');
        }
      }, 250);

      // 4. Tonearm sweeps gracefully over the outer lead-in groove
      setTimeout(() => {
        if (tonearmWand) {
          tonearmWand.classList.remove('is-lifting');
          tonearmWand.classList.add('is-swinging');
        }
      }, 550);

      // 5. Tonearm lowers down with physical spring damping onto the groove
      setTimeout(() => {
        if (tonearmWand) {
          tonearmWand.classList.remove('is-swinging');
          tonearmWand.classList.add('is-dropped');
        }
        if (stylusNeedle) {
          stylusNeedle.classList.add('is-active');
        }

        // Trigger golden soundwave shockwaves across the vinyl grooves
        if (needleRipple) {
          needleRipple.classList.add('is-active');
        }

        // Play authentic analog vinyl needle-drop audio
        playNeedleDropAudio();
      }, 1080);

      // 6. Silky-Smooth Cinematic Crossfade into the 360° Rotunda
      setTimeout(() => {
        introSection.classList.add('is-entering');
        if (viewport) {
          viewport.classList.add('intro-revealed');
        }
        if (typeof window.triggerCarouselIntroImpulse === 'function') {
          window.triggerCarouselIntroImpulse();
        }
      }, 1550);

      // 7. Complete transition: hide intro overlay & cancel parallax loop
      setTimeout(() => {
        introSection.classList.add('is-completed');
        introSection.setAttribute('aria-hidden', 'true');
        introSection.style.display = 'none';
        if (tiltAnimFrame) {
          cancelAnimationFrame(tiltAnimFrame);
        }
        window.removeEventListener('pointermove', handleMouseMove);
      }, 2950);
    }

    // Attach click triggers
    if (enterBtn) {
      enterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerNeedleDrop();
      });
    }

    if (deckStage) {
      deckStage.addEventListener('click', () => {
        triggerNeedleDrop();
      });
    }

    // Keyboard support: Space or Enter triggers needle drop
    window.addEventListener('keydown', (e) => {
      if (!isDropping && (e.code === 'Space' || e.code === 'Enter')) {
        if (introSection && !introSection.classList.contains('is-completed')) {
          e.preventDefault();
          triggerNeedleDrop();
        }
      }
    });
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTurntableIntro);
  } else {
    initTurntableIntro();
  }
})();
