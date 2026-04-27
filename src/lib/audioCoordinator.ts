/**
 * Tiny module-level registry that guarantees only ONE <audio> element plays
 * at a time across the entire app (voice notes, previews, future media).
 *
 * Each player calls `claimPlayback(audio)` right before it starts playing.
 * The previously claimed audio (if any) is paused and reset to the beginning,
 * matching the WhatsApp / iMessage feel of voice notes.
 */
let currentAudio: HTMLAudioElement | null = null;

export function claimPlayback(audio: HTMLAudioElement) {
  if (currentAudio && currentAudio !== audio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      // ignore — element may already be detached
    }
  }
  currentAudio = audio;
}

export function releasePlayback(audio: HTMLAudioElement) {
  if (currentAudio === audio) currentAudio = null;
}

/**
 * iOS Safari requires audio output to be "unlocked" by a user gesture before
 * any <audio> element will produce sound. Without this, the first tap on a
 * voice-note play button silently does nothing on iPhone — exactly the
 * "I can hear it on Lovable but not my phone" symptom.
 *
 * Call once on app start; it attaches a one-shot listener that plays a tiny
 * silent buffer the first time the user taps anywhere.
 */
let unlocked = false;
export function installIOSAudioUnlock() {
  if (typeof window === "undefined" || unlocked) return;
  const unlock = () => {
    if (unlocked) return;
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        // Resume in case it started suspended (iOS 14+)
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
      }
      unlocked = true;
    } catch {
      /* no-op */
    }
    window.removeEventListener("touchend", unlock);
    window.removeEventListener("click", unlock);
  };
  window.addEventListener("touchend", unlock, { once: true, passive: true });
  window.addEventListener("click", unlock, { once: true });
}