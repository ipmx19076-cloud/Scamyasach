/**
 * Tiny sound effects made with the Web Audio API: no audio files to download.
 * The AudioContext is created on first use, which always follows a tap or key
 * press, so mobile browsers allow it.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, type: OscillatorType, gain = 0.12) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export type Sfx = "correct" | "wrong" | "timeout" | "stamp" | "tick";

export function play(sfx: Sfx, muted: boolean): void {
  if (muted) return;
  switch (sfx) {
    case "correct":
      tone(660, 0, 0.12, "triangle");
      tone(990, 0.09, 0.18, "triangle");
      break;
    case "wrong":
      tone(220, 0, 0.18, "sawtooth", 0.08);
      tone(165, 0.12, 0.24, "sawtooth", 0.08);
      break;
    case "timeout":
      tone(330, 0, 0.12, "square", 0.06);
      tone(247, 0.14, 0.2, "square", 0.06);
      break;
    case "stamp":
      tone(90, 0, 0.14, "sine", 0.3);
      break;
    case "tick":
      tone(1200, 0, 0.04, "square", 0.03);
      break;
  }
}
