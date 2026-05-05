/* ─── Subtle audio feedback for tactile dashboard feel ─── */
// Uses Web Audio API — no audio files needed, just pure synthesis
// All sounds are ultra-subtle: soft clicks, gentle taps, whisper-close

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.03) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch { /* audio not available */ }
}

export function useSound() {
  const click = () => playTone(800, 0.08, 'sine', 0.02);
  const tap = () => playTone(1200, 0.05, 'sine', 0.015);
  const hover = () => playTone(600, 0.04, 'sine', 0.01);
  const success = () => {
    playTone(523, 0.12, 'sine', 0.03);
    setTimeout(() => playTone(659, 0.12, 'sine', 0.03), 80);
    setTimeout(() => playTone(784, 0.2, 'sine', 0.03), 160);
  };
  const open = () => { playTone(440, 0.1, 'sine', 0.02); setTimeout(() => playTone(660, 0.08, 'sine', 0.015), 60); };
  const close = () => { playTone(660, 0.06, 'sine', 0.015); setTimeout(() => playTone(440, 0.1, 'sine', 0.02), 40); };

  return { click, tap, hover, success, open, close };
}

/* ─── For non-hook usage ─── */
export const sounds = {
  click: () => playTone(800, 0.08, 'sine', 0.02),
  tap: () => playTone(1200, 0.05, 'sine', 0.015),
  hover: () => playTone(600, 0.04, 'sine', 0.01),
  success: () => {
    playTone(523, 0.12, 'sine', 0.03);
    setTimeout(() => playTone(659, 0.12, 'sine', 0.03), 80);
    setTimeout(() => playTone(784, 0.2, 'sine', 0.03), 160);
  },
  open: () => { playTone(440, 0.1, 'sine', 0.02); setTimeout(() => playTone(660, 0.08, 'sine', 0.015), 60); },
  close: () => { playTone(660, 0.06, 'sine', 0.015); setTimeout(() => playTone(440, 0.1, 'sine', 0.02), 40); },
};