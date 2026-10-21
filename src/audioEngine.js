// Procedural Web Audio Engine for Ambient AI Mixer
// Provides realistic ambient sound synthesis (Rain, Thunder, Forest, Ocean, Fireplace, Café, Wind, Crickets, Binaural Beats, Lofi Chords)
// Zero external files required, zero loading delay, seamless infinite playback!

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.tracks = {};
    this.isInitialized = false;
    this.masterVolume = 0.8;
    this.isMuted = false;
  }

  init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio API not supported in this browser.');
      return;
    }

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
    this.isInitialized = true;
  }

  // Generate pink noise buffer
  createPinkNoiseBuffer(seconds = 5) {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * seconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  // Generate brown noise buffer
  createBrownNoiseBuffer(seconds = 5) {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * seconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Gain compensation
    }
    return buffer;
  }

  // Start or adjust a sound track
  setTrackVolume(id, volume) {
    this.init();
    if (!this.ctx) return;

    if (!this.tracks[id]) {
      this.createTrack(id);
    }

    const track = this.tracks[id];
    if (!track) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    const now = this.ctx.currentTime;

    if (clampedVolume > 0) {
      if (!track.isPlaying) {
        this.startTrack(id);
      }
      track.gainNode.gain.cancelScheduledValues(now);
      track.gainNode.gain.setTargetAtTime(clampedVolume, now, 0.08);
    } else {
      track.gainNode.gain.cancelScheduledValues(now);
      track.gainNode.gain.setTargetAtTime(0, now, 0.08);
      if (track.isPlaying) {
        setTimeout(() => {
          if (track.gainNode.gain.value < 0.005) {
            this.stopTrack(id);
          }
        }, 150);
      }
    }
  }

  createTrack(id) {
    if (!this.ctx) return;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    gainNode.connect(this.masterGain);

    this.tracks[id] = {
      id,
      gainNode,
      isPlaying: false,
      nodes: [],
      timers: []
    };
  }

  startTrack(id) {
    const track = this.tracks[id];
    if (!track || track.isPlaying) return;
    track.isPlaying = true;

    switch (id) {
      case 'rain':
        this.buildRain(track);
        break;
      case 'thunder':
        this.buildThunder(track);
        break;
      case 'forest':
        this.buildForest(track);
        break;
      case 'ocean':
        this.buildOcean(track);
        break;
      case 'fire':
        this.buildFire(track);
        break;
      case 'cafe':
        this.buildCafe(track);
        break;
      case 'wind':
        this.buildWind(track);
        break;
      case 'crickets':
        this.buildCrickets(track);
        break;
      case 'binaural':
        this.buildBinaural(track);
        break;
      case 'lofi':
        this.buildLofi(track);
        break;
      default:
        this.buildRain(track);
        break;
    }
  }

  stopTrack(id) {
    const track = this.tracks[id];
    if (!track || !track.isPlaying) return;

    track.timers.forEach(t => clearInterval(t));
    track.timers = [];

    track.nodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch (e) {}
    });
    track.nodes = [];
    track.isPlaying = false;
  }

  // --- Rain Generator ---
  buildRain(track) {
    const pinkBuffer = this.createPinkNoiseBuffer(6);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = pinkBuffer;
    noiseSource.loop = true;

    // Filter to capture sound of rain falling
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1100;
    bandpass.Q.value = 0.8;

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 350;

    noiseSource.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(track.gainNode);
    noiseSource.start();

    // Occasional raindrop spatters on windowpane
    const dropTimer = setInterval(() => {
      if (!track.isPlaying || !this.ctx) return;
      const osc = this.ctx.createOscillator();
      const dropGain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      const freq = 1400 + Math.random() * 1200;

      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + 0.04);

      dropGain.gain.setValueAtTime(0.08 + Math.random() * 0.08, now);
      dropGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(dropGain);
      dropGain.connect(track.gainNode);
      osc.start(now);
      osc.stop(now + 0.05);
    }, 180 + Math.random() * 200);

    track.nodes.push(noiseSource, highpass, bandpass);
    track.timers.push(dropTimer);
  }

  // --- Thunder Generator ---
  buildThunder(track) {
    const brownBuffer = this.createBrownNoiseBuffer(6);
    const baseNoise = this.ctx.createBufferSource();
    baseNoise.buffer = brownBuffer;
    baseNoise.loop = true;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 120;

    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.08; // subtle dark low-end hum

    baseNoise.connect(lowpass);
    lowpass.connect(subGain);
    subGain.connect(track.gainNode);
    baseNoise.start();

    // Trigger thunderclaps periodically
    const triggerClap = () => {
      if (!track.isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const thunderSource = this.ctx.createBufferSource();
      thunderSource.buffer = brownBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(80, now);
      filter.frequency.linearRampToValueAtTime(260, now + 0.4);
      filter.frequency.exponentialRampToValueAtTime(70, now + 3.8);

      const thunderGain = this.ctx.createGain();
      thunderGain.gain.setValueAtTime(0.001, now);
      thunderGain.gain.linearRampToValueAtTime(0.85, now + 0.25);
      thunderGain.gain.exponentialRampToValueAtTime(0.3, now + 1.2);
      thunderGain.gain.exponentialRampToValueAtTime(0.001, now + 4.2);

      thunderSource.connect(filter);
      filter.connect(thunderGain);
      thunderGain.connect(track.gainNode);

      thunderSource.start(now);
      thunderSource.stop(now + 4.5);
    };

    // First clap quickly, then at natural intervals
    const initialDelay = setTimeout(triggerClap, 2000);
    const intervalTimer = setInterval(() => {
      if (Math.random() > 0.3) triggerClap();
    }, 9000);

    track.nodes.push(baseNoise, lowpass, subGain);
    track.timers.push(intervalTimer, initialDelay);
  }

  // --- Forest & Birdsong Generator ---
  buildForest(track) {
    const pinkBuffer = this.createPinkNoiseBuffer(6);
    const rustleSource = this.ctx.createBufferSource();
    rustleSource.buffer = pinkBuffer;
    rustleSource.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 850;
    bandpass.Q.value = 0.6;

    const rustleGain = this.ctx.createGain();
    rustleGain.gain.value = 0.25;

    rustleSource.connect(bandpass);
    bandpass.connect(rustleGain);
    rustleGain.connect(track.gainNode);
    rustleSource.start();

    // Birds chirping in forest
    const chirpBird = () => {
      if (!track.isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const birdGain = this.ctx.createGain();

      const notes = [2800, 3200, 3600, 4200, 4800];
      const startFreq = notes[Math.floor(Math.random() * notes.length)];

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.linearRampToValueAtTime(startFreq + 600, now + 0.07);
      osc.frequency.exponentialRampToValueAtTime(startFreq - 200, now + 0.18);

      birdGain.gain.setValueAtTime(0.001, now);
      birdGain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      birdGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(birdGain);
      birdGain.connect(track.gainNode);
      osc.start(now);
      osc.stop(now + 0.25);
    };

    const birdTimer = setInterval(() => {
      if (Math.random() > 0.35) chirpBird();
    }, 2800);

    track.nodes.push(rustleSource, bandpass, rustleGain);
    track.timers.push(birdTimer);
  }

  // --- Ocean Waves Generator ---
  buildOcean(track) {
    const pinkBuffer = this.createPinkNoiseBuffer(8);
    const waveSource = this.ctx.createBufferSource();
    waveSource.buffer = pinkBuffer;
    waveSource.loop = true;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 450;

    const waveGain = this.ctx.createGain();
    waveGain.gain.value = 0.2;

    waveSource.connect(lowpass);
    lowpass.connect(waveGain);
    waveGain.connect(track.gainNode);
    waveSource.start();

    // LFO to simulate rolling, crashing, and receding waves
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.12; // One wave every ~8 seconds

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.35; // depth

    lfo.connect(waveGain.gain);
    lfo.start();

    track.nodes.push(waveSource, lowpass, waveGain, lfo, lfoGain);
  }

  // --- Fireplace Crackle Generator ---
  buildFire(track) {
    const brownBuffer = this.createBrownNoiseBuffer(6);
    const roarSource = this.ctx.createBufferSource();
    roarSource.buffer = brownBuffer;
    roarSource.loop = true;

    const roarFilter = this.ctx.createBiquadFilter();
    roarFilter.type = 'lowpass';
    roarFilter.frequency.value = 240;

    const roarGain = this.ctx.createGain();
    roarGain.gain.value = 0.3;

    roarSource.connect(roarFilter);
    roarFilter.connect(roarGain);
    roarGain.connect(track.gainNode);
    roarSource.start();

    // Crackles and pops
    const crackleTimer = setInterval(() => {
      if (!track.isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();

      osc.type = Math.random() > 0.5 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(300 + Math.random() * 2200, now);

      const popVol = 0.05 + Math.random() * 0.15;
      popGain.gain.setValueAtTime(popVol, now);
      popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02 + Math.random() * 0.04);

      osc.connect(popGain);
      popGain.connect(track.gainNode);
      osc.start(now);
      osc.stop(now + 0.07);
    }, 110 + Math.random() * 150);

    track.nodes.push(roarSource, roarFilter, roarGain);
    track.timers.push(crackleTimer);
  }

  // --- Café Ambience Generator ---
  buildCafe(track) {
    const pinkBuffer = this.createPinkNoiseBuffer(6);
    const crowdSource = this.ctx.createBufferSource();
    crowdSource.buffer = pinkBuffer;
    crowdSource.loop = true;

    const crowdFilter = this.ctx.createBiquadFilter();
    crowdFilter.type = 'bandpass';
    crowdFilter.frequency.value = 520;
    crowdFilter.Q.value = 1.2;

    const crowdGain = this.ctx.createGain();
    crowdGain.gain.value = 0.28;

    crowdSource.connect(crowdFilter);
    crowdFilter.connect(crowdGain);
    crowdGain.connect(track.gainNode);
    crowdSource.start();

    // Occasional cup & saucer clinks
    const clinkTimer = setInterval(() => {
      if (!track.isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const clinkGain = this.ctx.createGain();

      osc.type = 'sine';
      const f = 2400 + Math.random() * 1800;
      osc.frequency.setValueAtTime(f, now);

      clinkGain.gain.setValueAtTime(0.12, now);
      clinkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(clinkGain);
      clinkGain.connect(track.gainNode);
      osc.start(now);
      osc.stop(now + 0.22);
    }, 3800 + Math.random() * 3200);

    track.nodes.push(crowdSource, crowdFilter, crowdGain);
    track.timers.push(clinkTimer);
  }

  // --- Wind Ambience ---
  buildWind(track) {
    const pinkBuffer = this.createPinkNoiseBuffer(6);
    const windSource = this.ctx.createBufferSource();
    windSource.buffer = pinkBuffer;
    windSource.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 350;
    bandpass.Q.value = 2.5;

    // Modulate filter frequency for gusts
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15; // slow gusting
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 180;

    lfo.connect(bandpass.frequency);
    lfo.start();

    windSource.connect(bandpass);
    bandpass.connect(track.gainNode);
    windSource.start();

    track.nodes.push(windSource, bandpass, lfo, lfoGain);
  }

  // --- Night Crickets ---
  buildCrickets(track) {
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 4600;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 4900;

    // Fast flutter tremolo
    const tremolo = this.ctx.createOscillator();
    tremolo.type = 'sine';
    tremolo.frequency.value = 16; // 16Hz chirp rhythm

    const tremGain = this.ctx.createGain();
    tremGain.gain.value = 0.5;

    const cricketGain = this.ctx.createGain();
    cricketGain.gain.value = 0.12;

    tremolo.connect(cricketGain.gain);
    osc1.connect(cricketGain);
    osc2.connect(cricketGain);
    cricketGain.connect(track.gainNode);

    tremolo.start();
    osc1.start();
    osc2.start();

    track.nodes.push(osc1, osc2, tremolo, tremGain, cricketGain);
  }

  // --- Binaural Beats (10Hz Alpha Focus) ---
  buildBinaural(track) {
    if (!this.ctx.createStereoPanner) {
      // Fallback if stereo panner not available
      const osc = this.ctx.createOscillator();
      osc.frequency.value = 216;
      osc.connect(track.gainNode);
      osc.start();
      track.nodes.push(osc);
      return;
    }

    // Left ear 216 Hz
    const oscLeft = this.ctx.createOscillator();
    oscLeft.frequency.value = 216;
    const panLeft = this.ctx.createStereoPanner();
    panLeft.pan.value = -1;

    // Right ear 226 Hz (10Hz difference = Alpha wave focus)
    const oscRight = this.ctx.createOscillator();
    oscRight.frequency.value = 226;
    const panRight = this.ctx.createStereoPanner();
    panRight.pan.value = 1;

    const binauralGain = this.ctx.createGain();
    binauralGain.gain.value = 0.2;

    oscLeft.connect(panLeft);
    panLeft.connect(binauralGain);

    oscRight.connect(panRight);
    panRight.connect(binauralGain);

    binauralGain.connect(track.gainNode);

    oscLeft.start();
    oscRight.start();

    track.nodes.push(oscLeft, oscRight, panLeft, panRight, binauralGain);
  }

  // --- Lofi Chords (Warm electric piano progression) ---
  buildLofi(track) {
    const chords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [293.66, 349.23, 440.00, 523.25], // Dm7
      [196.00, 246.94, 293.66, 349.23]  // G7
    ];
    let chordIdx = 0;

    const playChord = () => {
      if (!track.isPlaying || !this.ctx) return;
      const currentChord = chords[chordIdx % chords.length];
      chordIdx++;
      const now = this.ctx.currentTime;

      currentChord.forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, now);

        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.linearRampToValueAtTime(0.05, now + 0.3);
        noteGain.gain.exponentialRampToValueAtTime(0.0005, now + 3.8);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(track.gainNode);

        osc.start(now);
        osc.stop(now + 4.0);
      });
    };

    playChord();
    const chordTimer = setInterval(playChord, 4200);
    track.timers.push(chordTimer);
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const target = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }
}

export const audioEngine = new AudioEngine();
