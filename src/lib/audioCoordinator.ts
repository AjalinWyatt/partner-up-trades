let currentAudio: HTMLAudioElement | null = null;

export function claimPlayback(audio: HTMLAudioElement) {
  if (currentAudio && currentAudio !== audio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  currentAudio = audio;
}

export function releasePlayback(audio: HTMLAudioElement) {
  if (currentAudio === audio) currentAudio = null;
}