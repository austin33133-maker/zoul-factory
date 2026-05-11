import { Save } from './storage.js';
import { CONFIG } from './config.js';

const ctxClass = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
let ctx = null;
let masterGain = null;

function ensure() {
  if (!ctxClass) return null;
  if (!ctx) {
    ctx = new ctxClass();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.35;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function envTone(freq, dur = 0.12, type = 'sine', volume = 1, slideTo = null) {
  if (!Save.get().audio) return;
  const c = ensure(); if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(volume, c.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  osc.connect(g); g.connect(masterGain);
  osc.start();
  osc.stop(c.currentTime + dur + 0.02);
}

function noise(dur = 0.1, volume = 0.3, lowpass = 1200) {
  if (!Save.get().audio) return;
  const c = ensure(); if (!c) return;
  const bufferSize = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const g = c.createGain();
  g.gain.setValueAtTime(volume, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  src.connect(filter); filter.connect(g); g.connect(masterGain);
  src.start(); src.stop(c.currentTime + dur);
}

export const Audio = {
  unlock() { ensure(); },
  pop(n = 0) { envTone(440 + n * 80, 0.08, 'triangle', 0.5, 880 + n * 60); },
  swap() { envTone(520, 0.05, 'square', 0.3); },
  invalid() { envTone(220, 0.12, 'sawtooth', 0.25, 160); },
  combo(level = 1) {
    const base = 440 + level * 80;
    [0, 0.07, 0.14, 0.21].slice(0, Math.min(4, level + 1)).forEach((t, i) =>
      setTimeout(() => envTone(base + i * 80, 0.1, 'triangle', 0.5, base + 200 + i * 80), t * 1000)
    );
  },
  bomb() { noise(0.25, 0.4, 800); envTone(120, 0.2, 'sawtooth', 0.4, 50); },
  rocket() { envTone(600, 0.3, 'sawtooth', 0.4, 1600); noise(0.2, 0.2, 1800); },
  lightball() {
    for (let i = 0; i < 8; i++) setTimeout(() => envTone(880 + Math.random() * 800, 0.06, 'sine', 0.3), i * 40);
  },
  win() {
    [0, 0.12, 0.24, 0.36].forEach((t, i) =>
      setTimeout(() => envTone([523, 659, 784, 1047][i], 0.18, 'triangle', 0.5), t * 1000)
    );
  },
  lose() {
    [0, 0.18, 0.36].forEach((t, i) =>
      setTimeout(() => envTone([392, 311, 247][i], 0.25, 'sine', 0.4), t * 1000)
    );
  },
  click() { envTone(660, 0.05, 'square', 0.3); },
  princess() {
    [0, 0.08, 0.18].forEach((t, i) =>
      setTimeout(() => envTone([784, 988, 1175][i], 0.14, 'triangle', 0.4), t * 1000)
    );
  }
};
