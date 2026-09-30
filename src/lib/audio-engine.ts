import { clamp, lerp } from "./utils";

export type AudioSourceKind = "idle" | "demo" | "file" | "mic";

export type AudioBands = {
  rms: number;
  bass: number;
  mid: number;
  high: number;
  pulse: number;
};

export const EMPTY_BANDS: AudioBands = {
  rms: 0,
  bass: 0,
  mid: 0,
  high: 0,
  pulse: 0,
};

type EngineOptions = {
  onEnded?: () => void;
};

const Ctx =
  typeof window !== "undefined"
    ? window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    : undefined;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gain: GainNode | null = null;
  private freq = new Uint8Array(0);
  private time = new Uint8Array(0);
  private sourceNode: AudioNode | null = null;
  private mediaEl: HTMLAudioElement | null = null;
  private fileUrl: string | null = null;
  private micStream: MediaStream | null = null;
  private kind: AudioSourceKind = "idle";
  private playing = false;
  private trackSpeed = 1;
  private pulse = 0;
  private bassAvg = 0.12;
  private smooth: AudioBands = { ...EMPTY_BANDS };
  private onEnded?: () => void;
  private endedHandler = () => this.onEnded?.();

  constructor(options: EngineOptions = {}) {
    this.onEnded = options.onEnded;
  }

  get sourceKind() {
    return this.kind;
  }

  get isPlaying() {
    return this.playing;
  }

  get element() {
    return this.mediaEl;
  }

  get currentTime() {
    return this.mediaEl?.currentTime ?? 0;
  }

  get duration() {
    const d = this.mediaEl?.duration;
    return d && Number.isFinite(d) ? d : 0;
  }

  private async ensureGraph() {
    if (!Ctx) throw new Error("Web Audio недоступен в этом браузере.");
    if (!this.ctx) {
      this.ctx = new Ctx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.72;
      this.gain = this.ctx.createGain();
      this.analyser.connect(this.gain);
      this.gain.connect(this.ctx.destination);
      this.freq = new Uint8Array(this.analyser.frequencyBinCount);
      this.time = new Uint8Array(this.analyser.fftSize);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    return this.ctx;
  }

  private disconnectSource() {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        /* already disconnected */
      }
      this.sourceNode = null;
    }
    if (this.mediaEl) {
      this.mediaEl.pause();
      this.mediaEl.removeEventListener("ended", this.endedHandler);
    }
    if (this.micStream) {
      for (const track of this.micStream.getTracks()) track.stop();
      this.micStream = null;
    }
  }

  private connectNode(node: AudioNode) {
    if (!this.analyser) return;
    this.sourceNode = node;
    node.connect(this.analyser);
  }

  private attachMedia(el: HTMLAudioElement, monitor: boolean, loop: boolean) {
    if (!this.ctx || !this.gain) return;
    this.mediaEl = el;
    el.loop = loop;
    el.crossOrigin = "anonymous";
    el.playbackRate = this.trackSpeed;
    const media = el as HTMLAudioElement & {
      preservesPitch?: boolean;
      webkitPreservesPitch?: boolean;
    };
    media.preservesPitch = true;
    media.webkitPreservesPitch = true;
    el.addEventListener("ended", this.endedHandler);
    this.gain.gain.value = monitor ? 1 : 0;
    const node = this.ctx.createMediaElementSource(el);
    this.connectNode(node);
  }

  async startDemo() {
    await this.ensureGraph();
    this.disconnectSource();
    if (this.fileUrl) {
      URL.revokeObjectURL(this.fileUrl);
      this.fileUrl = null;
    }
    const el = new Audio("/audio/demo.wav");
    this.kind = "demo";
    this.attachMedia(el, true, true);
    await el.play();
    this.playing = true;
  }

  async startFile(file: File) {
    await this.ensureGraph();
    this.disconnectSource();
    if (this.fileUrl) URL.revokeObjectURL(this.fileUrl);
    this.fileUrl = URL.createObjectURL(file);
    const el = new Audio(this.fileUrl);
    this.kind = "file";
    this.attachMedia(el, true, true);
    await el.play();
    this.playing = true;
  }

  async startMic() {
    await this.ensureGraph();
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Микрофон недоступен в этом браузере.");
    }
    this.disconnectSource();
    if (this.fileUrl) {
      URL.revokeObjectURL(this.fileUrl);
      this.fileUrl = null;
    }
    this.mediaEl = null;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false,
    });
    this.micStream = stream;
    this.kind = "mic";
    if (this.gain) this.gain.gain.value = 0;
    const node = this.ctx!.createMediaStreamSource(stream);
    this.connectNode(node);
    this.playing = true;
  }

  async toggle() {
    if (this.kind === "idle") return;
    if (this.kind === "mic") {
      if (this.playing) {
        this.playing = false;
        if (this.micStream) {
          for (const track of this.micStream.getTracks()) track.enabled = false;
        }
      } else {
        await this.ensureGraph();
        if (this.micStream) {
          for (const track of this.micStream.getTracks()) track.enabled = true;
        }
        this.playing = true;
      }
      return;
    }
    if (!this.mediaEl) return;
    if (this.playing) {
      this.mediaEl.pause();
      this.playing = false;
    } else {
      await this.ensureGraph();
      await this.mediaEl.play();
      this.playing = true;
    }
  }

  setTrackSpeed(rate: number) {
    this.trackSpeed = clamp(rate, 0.5, 1.5);
    if (this.mediaEl) this.mediaEl.playbackRate = this.trackSpeed;
  }

  seek(ratio: number) {
    if (!this.mediaEl || !this.duration) return;
    this.mediaEl.currentTime = clamp(ratio, 0, 1) * this.duration;
  }

  sample(sensitivity: number): AudioBands {
    if (!this.analyser || !this.playing) {
      this.smooth = {
        rms: lerp(this.smooth.rms, 0, 0.08),
        bass: lerp(this.smooth.bass, 0, 0.08),
        mid: lerp(this.smooth.mid, 0, 0.08),
        high: lerp(this.smooth.high, 0, 0.08),
        pulse: lerp(this.smooth.pulse, 0, 0.18),
      };
      return this.smooth;
    }

    this.analyser.getByteFrequencyData(this.freq);
    this.analyser.getByteTimeDomainData(this.time);

    const bins = this.freq.length;
    const nyquist = (this.ctx?.sampleRate ?? 44100) / 2;
    const hz = (h: number) => Math.min(bins - 1, Math.floor((h / nyquist) * bins));

    const avg = (fromHz: number, toHz: number) => {
      const a = hz(fromHz);
      const b = Math.max(a + 1, hz(toHz));
      let s = 0;
      for (let i = a; i < b; i++) s += this.freq[i] ?? 0;
      return s / (b - a) / 255;
    };

    let rms = 0;
    for (let i = 0; i < this.time.length; i++) {
      const v = ((this.time[i] ?? 128) - 128) / 128;
      rms += v * v;
    }
    rms = Math.sqrt(rms / this.time.length);

    const gain = 0.35 + sensitivity * 1.45;
    const bass = clamp(avg(20, 140) * gain * 1.15, 0, 1);
    const mid = clamp(avg(140, 1600) * gain, 0, 1);
    const high = clamp(avg(1600, 8000) * gain * 1.1, 0, 1);
    const energy = clamp(rms * gain * 2.4, 0, 1);

    this.bassAvg = lerp(this.bassAvg, bass, 0.04);
    if (bass > this.bassAvg * 1.38 + 0.08) this.pulse = 1;
    this.pulse *= 0.86;

    const k = 0.22;
    this.smooth = {
      rms: lerp(this.smooth.rms, energy, k),
      bass: lerp(this.smooth.bass, bass, k),
      mid: lerp(this.smooth.mid, mid, k),
      high: lerp(this.smooth.high, high, k),
      pulse: Math.max(this.pulse, lerp(this.smooth.pulse, this.pulse, 0.35)),
    };
    return this.smooth;
  }

  dispose() {
    this.disconnectSource();
    if (this.fileUrl) URL.revokeObjectURL(this.fileUrl);
    this.fileUrl = null;
    this.mediaEl = null;
    this.playing = false;
    this.kind = "idle";
    void this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
    this.gain = null;
  }
}
