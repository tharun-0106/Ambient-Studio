import React, { useState, useEffect, useRef } from "react";
import {
  AlarmClock,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Coffee,
  Share2,
  Check,
  RotateCcw
} from "lucide-react";
import { soundManager } from "./soundManager";
import "./styles.css";

const STORAGE_KEY = "sound-volume-preferences";

// Exact Default Slider Levels matching user's reference image
export const DEFAULT_VOLUMES = {
  rain: 0.45,
  thunder: 0.65,
  forest: 0.75,
  waves: 0.47,
  fire: 0.35,
  cafe: 0.45
};

// 6 Exact Ambinest Cards with precise gradients and default slider values
const SOUND_CARDS = [
  {
    id: "rain",
    name: "Rain",
    description: "Gentle rain sounds",
    icon: "🌧️",
    image: "/bg/rain.gif",
    defaultVol: DEFAULT_VOLUMES.rain,
    gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2))",
    activeGradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.45), rgba(37, 99, 235, 0.45))"
  },
  {
    id: "thunder",
    name: "Thunder",
    description: "Distant thunder",
    icon: "⚡",
    image: "/bg/thunder.jpg",
    defaultVol: DEFAULT_VOLUMES.thunder,
    gradient: "linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(147, 51, 234, 0.2))",
    activeGradient: "linear-gradient(135deg, rgba(168, 85, 247, 0.45), rgba(147, 51, 234, 0.45))"
  },
  {
    id: "forest",
    name: "Forest",
    description: "Forest ambience",
    icon: "🌲",
    image: "/bg/forest.jpg",
    defaultVol: DEFAULT_VOLUMES.forest,
    gradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.2))",
    activeGradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.45), rgba(22, 163, 74, 0.45))"
  },
  {
    id: "waves",
    name: "Ocean",
    description: "Crashing waves",
    icon: "🌊",
    image: "/bg/ocean.jpg",
    defaultVol: DEFAULT_VOLUMES.waves,
    gradient: "linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(8, 145, 178, 0.2))",
    activeGradient: "linear-gradient(135deg, rgba(6, 182, 212, 0.45), rgba(8, 145, 178, 0.45))"
  },
  {
    id: "fire",
    name: "Fireplace",
    description: "Crackling fire",
    icon: "🔥",
    image: "/bg/fire.jpg",
    defaultVol: DEFAULT_VOLUMES.fire,
    gradient: "linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.2))",
    activeGradient: "linear-gradient(135deg, rgba(249, 115, 22, 0.45), rgba(234, 88, 12, 0.45))"
  },
  {
    id: "cafe",
    name: "Café",
    description: "Coffee shop ambience",
    icon: "☕",
    image: "/bg/cafe.jpg",
    defaultVol: DEFAULT_VOLUMES.cafe,
    gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2))",
    activeGradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.45), rgba(217, 119, 6, 0.45))"
  }
];

// Presets
const PRESETS = [
  {
    name: "Midnight Study",
    desc: "Steady rain, distant thunder, and warm café ambience",
    icon: "🌙",
    volumes: { rain: 0.65, thunder: 0.35, cafe: 0.45 }
  },
  {
    name: "Stormy Coast",
    desc: "Heavy rain pouring over crashing ocean waves",
    icon: "🌊",
    volumes: { rain: 0.65, waves: 0.70, thunder: 0.4 }
  },
  {
    name: "Cozy Cabin Hearth",
    desc: "Crackling logs in the fireplace with soft rain outside",
    icon: "🏡",
    volumes: { fire: 0.65, rain: 0.45, forest: 0.3 }
  },
  {
    name: "Peaceful Sleep",
    desc: "Gentle rainfall, soothing waves, and distant rumble",
    icon: "😴",
    volumes: { rain: 0.6, waves: 0.4, thunder: 0.2 }
  }
];

export default function App() {
  // Real-time clock (e.g., "06:27 PM")
  const [timeStr, setTimeStr] = useState("");

  // Sound volumes { [id]: 0.0 to 1.0 }
  const [volumes, setVolumes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    const params = new URLSearchParams(window.location.search);
    const initial = {};
    SOUND_CARDS.forEach((c) => {
      const p = params.get(c.id);
      initial[c.id] = p !== null ? parseFloat(p) / 100 : DEFAULT_VOLUMES[c.id];
    });
    return initial;
  });

  // Track playing states
  const [activeSounds, setActiveSounds] = useState({});
  const [resetting, setResetting] = useState(false);

  // Alarm Clock / Sleep Timer
  const [timerExpanded, setTimerExpanded] = useState(false);
  const [timerHours, setTimerHours] = useState("");
  const [timerMinutes, setTimerMinutes] = useState("");
  const [timerSecondsInput, setTimerSecondsInput] = useState("");
  const [timerRemaining, setTimerRemaining] = useState(null);
  const [lastDuration, setLastDuration] = useState(null);
  const [savedPlayingTracks, setSavedPlayingTracks] = useState({});
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const timerIntervalRef = useRef(null);

  // Mute
  const [isMuted, setIsMuted] = useState(false);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Update clock every second
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const formattedHours = hours.toString().padStart(2, "0");
      setTimeStr(`${formattedHours}:${minutes} ${ampm}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Save volume preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(volumes));
    } catch (e) {}
  }, [volumes]);

  // Spacebar to mute/unmute
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        handleMuteToggle();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMuted, activeSounds]);

  // Countdown timer
  useEffect(() => {
    if (timerRemaining !== null && timerRemaining > 0) {
      timerIntervalRef.current = setTimeout(() => {
        setTimerRemaining((prev) => {
          if (prev <= 1) {
            // Smoothly fade out sounds over 2.5 seconds
            soundManager.fadeOutAndStopAll(2.5, () => {
              setActiveSounds({});
            });
            // Play gentle Tibetan singing bowl chime
            soundManager.playZenChime();
            setSessionCompleted(true);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearTimeout(timerIntervalRef.current);
  }, [timerRemaining]);

  const formatCountdown = (totalSecs) => {
    if (totalSecs === null) return "00:00:00";
    const hrs = Math.floor(totalSecs / 3600).toString().padStart(2, "0");
    const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, "0");
    const secs = (totalSecs % 60).toString().padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const handleStartTimer = () => {
    const h = parseInt(timerHours || "0", 10);
    const m = parseInt(timerMinutes || "0", 10);
    const s = parseInt(timerSecondsInput || "0", 10);
    const total = h * 3600 + m * 60 + s;
    if (total > 0) {
      setLastDuration(total);
      setSavedPlayingTracks({ ...activeSounds });
      setTimerRemaining(total);
      setTimerExpanded(false);
      setSessionCompleted(false);
      setTimerHours("");
      setTimerMinutes("");
      setTimerSecondsInput("");
    }
  };

  const handleRestartTimer = () => {
    if (lastDuration) {
      setTimerRemaining(lastDuration);
      Object.entries(savedPlayingTracks).forEach(([id, active]) => {
        if (active && (volumes[id] || 0) > 0) {
          soundManager.play(id, volumes[id]);
        }
      });
      setActiveSounds({ ...savedPlayingTracks });
      setSessionCompleted(false);
    }
  };

  const handleResumeSounds = () => {
    Object.entries(savedPlayingTracks).forEach(([id, active]) => {
      if (active && (volumes[id] || 0) > 0) {
        soundManager.play(id, volumes[id]);
      }
    });
    setActiveSounds({ ...savedPlayingTracks });
    setSessionCompleted(false);
  };

  const handleCancelTimer = () => {
    clearTimeout(timerIntervalRef.current);
    setTimerRemaining(null);
  };

  // Toggle sound play/pause
  const handleToggleSound = (sound) => {
    const isPlaying = !!activeSounds[sound.id];
    if (isPlaying) {
      soundManager.pause(sound.id);
      setActiveSounds((prev) => ({ ...prev, [sound.id]: false }));
    } else {
      const vol = volumes[sound.id] !== undefined ? volumes[sound.id] : sound.defaultVol;
      soundManager.play(sound.id, vol);
      setActiveSounds((prev) => ({ ...prev, [sound.id]: true }));
      setVolumes((prev) => ({ ...prev, [sound.id]: vol }));
    }
  };

  // Volume slider adjustment
  const handleVolumeChange = (soundId, val) => {
    const num = parseFloat(val);
    setVolumes((prev) => ({ ...prev, [soundId]: num }));
    soundManager.setVolume(soundId, num);

    if (num > 0 && !activeSounds[soundId]) {
      soundManager.play(soundId, num);
      setActiveSounds((prev) => ({ ...prev, [soundId]: true }));
    } else if (num === 0 && activeSounds[soundId]) {
      soundManager.pause(soundId);
      setActiveSounds((prev) => ({ ...prev, [soundId]: false }));
    }
  };

  const handleMuteToggle = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleStopAll = () => {
    soundManager.stopAll();
    setActiveSounds({});
  };

  const handleReset = () => {
    setResetting(true);
    soundManager.stopAll();
    setActiveSounds({});
    setVolumes({ ...DEFAULT_VOLUMES });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_VOLUMES));
    } catch (e) {}
    handleCancelTimer();
    setTimeout(() => setResetting(false), 450);
  };

  const handleApplyPreset = (preset) => {
    handleStopAll();
    const newVols = { ...volumes };
    const newActives = {};

    SOUND_CARDS.forEach((c) => {
      const targetVol = preset.volumes[c.id];
      if (targetVol) {
        newVols[c.id] = targetVol;
        newActives[c.id] = true;
        soundManager.play(c.id, targetVol);
      } else {
        newVols[c.id] = c.defaultVol;
        newActives[c.id] = false;
        soundManager.pause(c.id);
      }
    });

    setVolumes(newVols);
    setActiveSounds(newActives);
    setDrawerOpen(false);
  };

  const handleAiMix = (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true);

    setTimeout(() => {
      const p = aiPrompt.toLowerCase();
      const newVols = { ...volumes };
      const newActives = {};

      SOUND_CARDS.forEach((c) => {
        newActives[c.id] = false;
        soundManager.pause(c.id);
      });

      if (p.includes("rain") || p.includes("storm") || p.includes("pour") || p.includes("water")) {
        newVols.rain = 0.65;
        newActives.rain = true;
      }
      if (p.includes("thunder") || p.includes("lightning") || p.includes("stormy")) {
        newVols.thunder = 0.5;
        newActives.thunder = true;
      }
      if (p.includes("forest") || p.includes("tree") || p.includes("bird") || p.includes("nature")) {
        newVols.forest = 0.5;
        newActives.forest = true;
      }
      if (p.includes("ocean") || p.includes("sea") || p.includes("beach") || p.includes("wave")) {
        newVols.waves = 0.6;
        newActives.waves = true;
      }
      if (p.includes("fire") || p.includes("hearth") || p.includes("cabin") || p.includes("cozy") || p.includes("warm")) {
        newVols.fire = 0.6;
        newActives.fire = true;
      }
      if (p.includes("cafe") || p.includes("coffee") || p.includes("study") || p.includes("work")) {
        newVols.cafe = 0.55;
        newActives.cafe = true;
      }

      if (!Object.values(newActives).some(Boolean)) {
        newVols.rain = 0.55;
        newVols.cafe = 0.4;
        newActives.rain = true;
        newActives.cafe = true;
      }

      SOUND_CARDS.forEach((c) => {
        if (newActives[c.id]) {
          soundManager.play(c.id, newVols[c.id]);
        }
      });

      setVolumes(newVols);
      setActiveSounds(newActives);
      setAiLoading(false);
      setDrawerOpen(false);
    }, 600);
  };

  const copyShareLink = () => {
    const params = new URLSearchParams();
    Object.entries(activeSounds).forEach(([id, active]) => {
      if (active && (volumes[id] || 0) > 0) {
        params.set(id, Math.round(volumes[id] * 100));
      }
    });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const hasAnyPlaying = Object.values(activeSounds).some(Boolean);

  return (
    <>
      {/* Anime Overlook Backdrop Image from Screenshot */}
      <img
        src="/backdrop.png"
        alt="Anime Overlook Backdrop"
        className="backdrop-image"
      />

      {/* Top Left: Alarm Clock Fixed Round Button */}
      <div className="fixed-alarm-btn">
        <button
          className="alarm-icon-btn"
          onClick={() => {
            if (timerRemaining !== null) {
              handleCancelTimer();
            } else {
              setTimerExpanded(!timerExpanded);
            }
          }}
          title={timerRemaining !== null ? "Click to cancel sleep timer" : "Set sleep timer"}
        >
          <AlarmClock size={18} className={timerRemaining !== null ? "animate-pulse" : ""} />
        </button>

        {timerRemaining !== null && (
          <div className="alarm-countdown">
            <span>{formatCountdown(timerRemaining)}</span>
            <button
              className="alarm-cancel"
              onClick={handleCancelTimer}
              title="Cancel timer"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {timerExpanded && timerRemaining === null && (
          <div className="alarm-popup-inputs">
            <input
              type="text"
              maxLength={2}
              placeholder="00"
              value={timerHours}
              onChange={(e) => setTimerHours(e.target.value.replace(/\D/g, ""))}
              className="alarm-num"
            />
            <span className="alarm-colon">:</span>
            <input
              type="text"
              maxLength={2}
              placeholder="00"
              value={timerMinutes}
              onChange={(e) => setTimerMinutes(e.target.value.replace(/\D/g, ""))}
              className="alarm-num"
            />
            <span className="alarm-colon">:</span>
            <input
              type="text"
              maxLength={2}
              placeholder="00"
              value={timerSecondsInput}
              onChange={(e) => setTimerSecondsInput(e.target.value.replace(/\D/g, ""))}
              className="alarm-num"
            />
            <button className="alarm-start" onClick={handleStartTimer}>
              Start
            </button>
          </div>
        )}
      </div>

      {/* Top Right: Reset and Mute Buttons */}
      <div className="fixed-top-right">
        <button
          className={`circle-control-btn ${resetting ? "resetting" : ""}`}
          onClick={handleReset}
          title="Reset to default settings & turn everything off"
        >
          <RotateCcw size={16} />
        </button>
        <button
          className={`circle-control-btn ${hasAnyPlaying && !isMuted ? "active-state" : ""}`}
          onClick={handleMuteToggle}
          title={isMuted ? "Unmute all sounds (Space)" : "Mute all sounds (Space)"}
        >
          {isMuted || !hasAnyPlaying ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
      </div>

      {/* Session Complete Floating Toast Banner */}
      {sessionCompleted && (
        <div className="session-complete-toast">
          <div className="toast-icon-glow">
            <Sparkles size={15} />
          </div>
          <div className="toast-text">
            <span className="toast-title">Session Complete ✨</span>
            <span className="toast-sub">Audio gently faded out. Take a deep breath.</span>
          </div>
          <div className="toast-actions">
            {lastDuration && (
              <button className="toast-btn primary" onClick={handleRestartTimer}>
                Restart
              </button>
            )}
            <button className="toast-btn" onClick={handleResumeSounds}>
              Resume
            </button>
            <button
              className="toast-close-btn"
              onClick={() => setSessionCompleted(false)}
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Centered Page Container */}
      <div className="page-container">
        {/* Header: Clock & Instructional Subtitle */}
        <section className="header-hero">
          <h1 className="clock-display">{timeStr || "06:27 PM"}</h1>
          <p className="subtitle-text">
            Click on any sound to play, click again to stop. Adjust volume with the slider. Combine multiple sounds to create your perfect ambient atmosphere.
          </p>
        </section>

        {/* 6 Square Sound Cards (2 rows x 3 columns) */}
        <main className="sound-grid">
          {SOUND_CARDS.map((sound) => {
            const isPlaying = !!activeSounds[sound.id];
            const currentVol = volumes[sound.id] !== undefined ? volumes[sound.id] : sound.defaultVol;
            const pct = Math.round(currentVol * 100);

            return (
              <div
                key={sound.id}
                className={`sound-card ${isPlaying ? "card-active" : ""}`}
              >
                {/* Background image: opacity-20 when idle, opacity-50 when playing */}
                <img
                  src={sound.image}
                  alt={sound.name}
                  className="card-bg-img"
                />

                {/* Color gradient */}
                <div
                  className="card-color-overlay"
                  style={{
                    background: isPlaying ? sound.activeGradient : sound.gradient
                  }}
                />

                {/* Inner Card Content */}
                <div className="card-content-wrap">
                  <div
                    className="card-top-click"
                    onClick={() => handleToggleSound(sound)}
                  >
                    <div className="card-emoji">
                      <span>{sound.icon}</span>
                    </div>
                    <h3 className="card-title">{sound.name}</h3>
                    <p className="card-desc">{sound.description}</p>
                  </div>

                  {/* Volume Slider Track */}
                  <div
                    className="card-slider-area"
                    style={{ "--range-pct": `${pct}%` }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="slider-bar-track">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={currentVol}
                        onChange={(e) => handleVolumeChange(sound.id, e.target.value)}
                        className="slider-input-range"
                        aria-label={`${sound.name} volume`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </main>

        {/* Floating Teal Coffee Cup Button (Screenshot Bottom Right) */}
        <button
          className="fixed-coffee-cup"
          onClick={() => setDrawerOpen(true)}
          title="Atmosphere Studio & AI Mixer"
        >
          <Coffee size={24} />
        </button>

        {/* Studio Modal Drawer */}
        {drawerOpen && (
          <div className="studio-modal-backdrop" onClick={() => setDrawerOpen(false)}>
            <div className="studio-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="studio-modal-header">
                <h2 className="studio-title">
                  <Coffee size={20} /> Atmosphere Studio
                </h2>
                <button
                  className="studio-close"
                  onClick={() => setDrawerOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* AI Mood Atmosphere Creator */}
              <div className="studio-ai-box">
                <div style={{ fontSize: 12, color: "#5eead4", display: "flex", alignItems: "center", gap: 5 }}>
                  <Sparkles size={13} /> AI Atmosphere Curator
                </div>
                <form onSubmit={handleAiMix} className="studio-ai-input-row">
                  <input
                    type="text"
                    placeholder="e.g. studying in a cozy cafe during rain..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="studio-ai-input"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading}
                    className="studio-ai-submit"
                  >
                    {aiLoading ? "..." : "Mix"}
                  </button>
                </form>
              </div>

              {/* Curated Presets */}
              <div style={{ marginBottom: 6, fontSize: 11, color: "#9ca3af" }}>
                CURATED PRESETS
              </div>
              <div className="studio-presets-grid">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    className="studio-preset-chip"
                    onClick={() => handleApplyPreset(p)}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                      <span>{p.icon}</span>
                      <span>{p.name}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{p.desc}</div>
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
                <button
                  className="alarm-start"
                  onClick={copyShareLink}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px" }}
                >
                  {copiedLink ? <Check size={13} /> : <Share2 size={13} />}
                  {copiedLink ? "Link Copied!" : "Share Soundscape"}
                </button>

                <button
                  className="alarm-start"
                  onClick={handleStopAll}
                  style={{
                    background: "rgba(244, 63, 94, 0.2)",
                    color: "#fca5a5",
                    padding: "5px 12px"
                  }}
                >
                  Turn All Off
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
