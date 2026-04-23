let audioCtx: AudioContext | null = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playBeep(freq: number, durationMs: number) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // Ignore browsers that block audio until user interaction.
  }
}

export function playSuccessFeedback() {
  playBeep(800, 150);
}

export function playDeniedFeedback() {
  playBeep(300, 100);
  setTimeout(() => playBeep(300, 100), 150);
}
