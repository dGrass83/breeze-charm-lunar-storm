import { writeFileSync } from "node:fs";

const SR = 44100;
const BPM = 112;
const BARS = 4;
const BEATS = BARS * 4;
const BEAT = 60 / BPM;
const DURATION = BEAT * BEATS;
const N = Math.floor(SR * DURATION);

const L = new Float32Array(N);
const R = new Float32Array(N);

function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
}

function add(i, l, r = l) {
  if (i < 0 || i >= N) return;
  L[i] += l;
  R[i] += r;
}

function env(t, a, d) {
  if (t < 0) return 0;
  if (t < a) return t / a;
  const x = 1 - (t - a) / d;
  return x > 0 ? x * x : 0;
}

function noise() {
  return Math.random() * 2 - 1;
}

function kick(at) {
  const start = Math.floor(at * SR);
  const len = Math.floor(0.28 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const e = Math.exp(-t * 14);
    const freq = 52 + 90 * Math.exp(-t * 28);
    const click = Math.exp(-t * 90) * noise() * 0.12;
    const s = Math.sin(2 * Math.PI * freq * t) * e * 0.92 + click;
    add(start + i, s, s * 0.98);
  }
}

function snare(at) {
  const start = Math.floor(at * SR);
  const len = Math.floor(0.22 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const e = Math.exp(-t * 18);
    const tone = Math.sin(2 * Math.PI * 186 * t) * Math.exp(-t * 22) * 0.22;
    const n = noise() * e * 0.42;
    const pan = 0.08;
    add(start + i, (tone + n) * (1 - pan), (tone + n) * (1 + pan));
  }
}

function hat(at, open = false) {
  const start = Math.floor(at * SR);
  const decay = open ? 9 : 38;
  const len = Math.floor((open ? 0.18 : 0.06) * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const e = Math.exp(-t * decay);
    const s = (noise() + Math.sin(2 * Math.PI * 7800 * t) * 0.15) * e * (open ? 0.16 : 0.11);
    add(start + i, s * 0.9, s * 1.1);
  }
}

function bass(at, freq, length) {
  const start = Math.floor(at * SR);
  const len = Math.floor(length * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const e = env(t, 0.01, length * 0.95);
    const s =
      Math.sin(2 * Math.PI * freq * t) * 0.34 +
      Math.sin(2 * Math.PI * freq * 2 * t) * 0.08;
    add(start + i, s * e, s * e * 0.96);
  }
}

function stab(at, freq) {
  const start = Math.floor(at * SR);
  const len = Math.floor(0.22 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const e = env(t, 0.006, 0.2);
    const s =
      Math.sin(2 * Math.PI * freq * t) * 0.12 +
      Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.06 +
      Math.sin(2 * Math.PI * freq * 2 * t) * 0.04;
    add(start + i, s * e * 1.05, s * e * 0.9);
  }
}

const notes = [41.2, 41.2, 49, 36.71]; // E1 E1 G1 D1
for (let bar = 0; bar < BARS; bar++) {
  const t0 = bar * 4 * BEAT;
  kick(t0);
  kick(t0 + BEAT * 2);
  if (bar % 2 === 1) kick(t0 + BEAT * 3.5);
  snare(t0 + BEAT);
  snare(t0 + BEAT * 3);
  for (let i = 0; i < 8; i++) {
    hat(t0 + i * (BEAT / 2), i % 4 === 3);
  }
  bass(t0, notes[bar], BEAT * 1.8);
  bass(t0 + BEAT * 2, notes[bar] * 1.5, BEAT * 1.4);
  if (bar === 1 || bar === 3) {
    stab(t0 + BEAT * 1.5, 164.81);
    stab(t0 + BEAT * 3.25, 196);
  }
}

let peak = 1e-6;
for (let i = 0; i < N; i++) {
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const gain = 0.86 / peak;
for (let i = 0; i < N; i++) {
  L[i] = clamp(L[i] * gain, -1, 1);
  R[i] = clamp(R[i] * gain, -1, 1);
}

const dataSize = N * 4;
const buf = Buffer.alloc(44 + dataSize);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + dataSize, 4);
buf.write("WAVE", 8);
buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(dataSize, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE((L[i] * 32767) | 0, 44 + i * 4);
  buf.writeInt16LE((R[i] * 32767) | 0, 46 + i * 4);
}

writeFileSync("/workspace/public/audio/demo.wav", buf);
console.log("demo.wav", (buf.length / 1024).toFixed(1), "KB", DURATION.toFixed(2), "s");
