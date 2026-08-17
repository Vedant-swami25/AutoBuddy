/**
 * AutoBuddy Procedural Web Audio SFX Engine
 * Synthesizes futuristic UI sounds entirely through the native Web Audio API.
 * Zero external audio assets needed; ultra-fast, responsive, and reliable.
 */

class SoundFxEngine {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem("autobuddy_sound_enabled") !== "false";
    this.initAudioContext();
  }

  initAudioContext() {
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    // Initialize on first user interaction to comply with browser autoplay policies
    const unlock = () => {
      if (!this.ctx) {
        this.ctx = new AudioContextClass();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };

    window.addEventListener("pointerdown", unlock, { once: false, passive: true });
    window.addEventListener("keydown", unlock, { once: false, passive: true });
  }

  getAudioContext() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  toggleSound() {
    this.enabled = !this.enabled;
    localStorage.setItem("autobuddy_sound_enabled", this.enabled ? "true" : "false");
    this.updateSoundToggleButtons();
    if (this.enabled) {
      this.playChime();
    }
    return this.enabled;
  }

  isSoundEnabled() {
    return this.enabled;
  }

  updateSoundToggleButtons() {
    const buttons = document.querySelectorAll(".sound-toggle-btn");
    buttons.forEach((btn) => {
      btn.setAttribute("aria-pressed", this.enabled ? "true" : "false");
      btn.classList.toggle("is-muted", !this.enabled);
      const icon = btn.querySelector(".sound-icon");
      if (icon) {
        icon.textContent = this.enabled ? "🔊" : "🔇";
      }
      const label = btn.querySelector(".sound-label");
      if (label) {
        label.textContent = this.enabled ? "Audio ON" : "Audio MUTED";
      }
    });
  }

  // Futuristic soft hover micro-blip
  playHover() {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.04);

      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch (e) {}
  }

  // Crisp mechanical tactile activation click
  playClick() {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.06);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.065);
    } catch (e) {}
  }

  // Holographic scan sweep sound
  playScan() {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(1100, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.28);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.29);
    } catch (e) {}
  }

  // Harmonious dual-tone confirmation chime
  playChime() {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.05);

        gain.gain.setValueAtTime(0.04, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.36);
      });
    } catch (e) {}
  }

  // Emergency SOS alert tone pulse
  playEmergency() {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(587.33, now + 0.12);
      osc.frequency.setValueAtTime(880, now + 0.24);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.37);
    } catch (e) {}
  }
}

window.soundFx = new SoundFxEngine();

// Auto-attach sound effects to interactive buttons & links
document.addEventListener("DOMContentLoaded", () => {
  window.soundFx.updateSoundToggleButtons();

  document.body.addEventListener("pointerenter", (e) => {
    const target = e.target.closest("button, .sidebar-link, .action-card, .service-card, .list-card, .hud-btn");
    if (target) {
      window.soundFx.playHover();
    }
  }, true);

  document.body.addEventListener("click", (e) => {
    const target = e.target.closest("button, .sidebar-link, .action-card, .service-card, .list-card, .hud-btn");
    if (target) {
      if (target.classList.contains("warning") || target.textContent.toLowerCase().includes("emergency") || target.textContent.toLowerCase().includes("help")) {
        window.soundFx.playEmergency();
      } else {
        window.soundFx.playClick();
      }
    }
  }, true);
});
