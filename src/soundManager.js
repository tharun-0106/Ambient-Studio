// Sound Manager for Ambinest-style Audio Engine
// Loads and loops real audio files (/sounds/*.mp3) with seamless fallback to procedural Web Audio

import { audioEngine } from "./audioEngine";

class SoundManager {
  constructor() {
    this.audioElements = {};
    this.volumes = {};
    this.isMuted = false;
    this.variations = {}; // atmospheric variation timers
    this.variationState = {};
    this.masterVolume = 1.0;
  }

  initSound(id) {
    if (this.audioElements[id]) return this.audioElements[id];

    const audio = new Audio();
    audio.src = `/sounds/${id === "ocean" ? "waves" : id}.mp3`;
    audio.loop = true;
    audio.preload = "auto";

    audio.addEventListener("error", () => {
      console.warn(`Local audio for ${id} not found, falling back to Web Audio synthesis.`);
      this.audioElements[id] = null;
    });

    this.audioElements[id] = audio;
    return audio;
  }

  play(id, volume = 0.7) {
    this.volumes[id] = volume;
    const audio = this.initSound(id);

    if (audio) {
      audio.volume = this.isMuted ? 0 : Math.max(0, Math.min(1, volume * this.masterVolume));
      audio.play().catch((err) => {
        console.warn(`Browser autoplay policy blocked audio, fallback to Web Audio:`, err);
        audioEngine.setTrackVolume(id, volume);
      });
    } else {
      audioEngine.setTrackVolume(id, volume);
    }
  }

  pause(id) {
    this.volumes[id] = 0;
    this.stopAtmosphericVariation(id);

    const audio = this.audioElements[id];
    if (audio) {
      audio.pause();
    }
    audioEngine.setTrackVolume(id, 0);
  }

  setVolume(id, volume) {
    this.volumes[id] = volume;
    const audio = this.audioElements[id];
    const targetVol = this.isMuted ? 0 : Math.max(0, Math.min(1, volume * this.masterVolume));

    if (audio && !audio.paused) {
      audio.volume = targetVol;
    } else {
      audioEngine.setTrackVolume(id, targetVol);
    }
  }

  toggle(id, defaultVol = 0.7) {
    const isPlaying = (this.volumes[id] || 0) > 0;
    if (isPlaying) {
      this.pause(id);
      return 0;
    } else {
      this.play(id, defaultVol);
      return defaultVol;
    }
  }

  // Atmospheric Variation: subtly drifts volume up & down naturally
  toggleAtmosphericVariation(id, onVolumeChange) {
    if (this.variations[id]) {
      this.stopAtmosphericVariation(id);
      return false;
    }

    const currentBaseVol = this.volumes[id] || 0.7;
    let mode = Math.random() > 0.5 ? "up" : "down";
    let stepCount = 0;
    const targetSteps = Math.floor(Math.random() * 10) + 8;
    const stepSize = 0.015 + Math.random() * 0.01;

    this.variations[id] = setInterval(() => {
      if ((this.volumes[id] || 0) <= 0) {
        this.stopAtmosphericVariation(id);
        return;
      }

      let current = this.volumes[id];
      if (mode === "up") {
        current = Math.min(0.95, current + stepSize);
      } else {
        current = Math.max(0.2, current - stepSize);
      }

      stepCount++;
      if (current >= 0.95 || current <= 0.2 || stepCount >= targetSteps) {
        mode = mode === "up" ? "down" : "up";
        stepCount = 0;
      }

      this.setVolume(id, current);
      if (onVolumeChange) onVolumeChange(id, current);
    }, 1800);

    return true;
  }

  stopAtmosphericVariation(id) {
    if (this.variations[id]) {
      clearInterval(this.variations[id]);
      delete this.variations[id];
    }
  }

  stopAll() {
    Object.keys(this.audioElements).forEach((id) => {
      this.pause(id);
    });
    Object.keys(this.variations).forEach((id) => {
      clearInterval(this.variations[id]);
    });
    this.variations = {};
    this.volumes = {};
  }

  // Smooth audio fade-out over a few seconds before stopping
  fadeOutAndStopAll(durationSeconds = 2.5, onComplete) {
    const steps = 25;
    const intervalTime = (durationSeconds * 1000) / steps;
    let currentStep = 0;
    const initialVols = { ...this.volumes };

    const fadeTimer = setInterval(() => {
      currentStep++;
      const factor = Math.max(0, 1 - currentStep / steps);

      Object.entries(initialVols).forEach(([id, vol]) => {
        if (vol > 0) {
          const targetVol = vol * factor;
          const audio = this.audioElements[id];
          if (audio) {
            audio.volume = this.isMuted ? 0 : targetVol * this.masterVolume;
          }
          audioEngine.setTrackVolume(id, this.isMuted ? 0 : targetVol * this.masterVolume);
        }
      });

      if (currentStep >= steps) {
        clearInterval(fadeTimer);
        this.stopAll();
        if (onComplete) onComplete();
      }
    }, intervalTime);
  }

  // Play a soft, beautiful Tibetan singing bowl zen chime
  playZenChime() {
    audioEngine.init();
    if (!audioEngine.ctx) return;
    const ctx = audioEngine.ctx;
    const now = ctx.currentTime;

    // Harmonic singing bowl frequencies (528Hz healing tone + shimmering overtones)
    const tones = [
      { freq: 528, gain: 0.22, decay: 4.5 },
      { freq: 1056, gain: 0.10, decay: 3.8 },
      { freq: 1584, gain: 0.05, decay: 3.0 },
      { freq: 2640, gain: 0.02, decay: 2.2 }
    ];

    tones.forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      // Subtle detune for shimmer acoustic beating
      osc.frequency.setValueAtTime(t.freq + (i * 0.75), now);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(t.gain, now + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + t.decay);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + t.decay + 0.1);
    });
  }

  setMute(muteState) {
    this.isMuted = muteState;
    Object.entries(this.volumes).forEach(([id, vol]) => {
      if (vol > 0) {
        const audio = this.audioElements[id];
        if (audio) {
          audio.volume = this.isMuted ? 0 : vol * this.masterVolume;
        }
        audioEngine.setTrackVolume(id, this.isMuted ? 0 : vol * this.masterVolume);
      }
    });
  }

  toggleMute() {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }
}

export const soundManager = new SoundManager();
