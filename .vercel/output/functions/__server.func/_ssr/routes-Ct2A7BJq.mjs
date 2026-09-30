import { i as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, o as require_react } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { a as Plus, c as Music2, d as Maximize, f as Film, i as Trash2, l as Minimize, n as Upload, o as Play, s as Pause, t as Video, u as Mic } from "../_libs/lucide-react.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { i as SliderTrack, n as SliderRange, r as SliderThumb, t as Slider$1 } from "../_libs/@radix-ui/react-slider+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Ct2A7BJq.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
function lerp(a, b, t) {
	return a + (b - a) * t;
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 font-medium transition-[opacity,transform,background-color,color,box-shadow] duration-150 ease-out select-none disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-bg),0_0_0_4px_var(--color-accent)]", {
	variants: {
		variant: {
			primary: "bg-accent text-accent-fg hover:opacity-90",
			ghost: "bg-transparent text-fg hover:bg-fg/10",
			outline: "bg-transparent text-fg shadow-[0_0_0_1px_var(--color-border-strong)] hover:bg-fg/10",
			subtle: "bg-surface-2 text-fg hover:bg-fg/10"
		},
		size: {
			sm: "h-9 px-3 text-sm rounded-sm",
			md: "h-11 px-4 text-sm rounded-md",
			lg: "h-12 px-5 text-[15px] rounded-md",
			icon: "size-11 rounded-md",
			pill: "h-11 px-4 rounded-full text-sm"
		}
	},
	defaultVariants: {
		variant: "primary",
		size: "md"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, type = "button", ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
	ref,
	type,
	className: cn(buttonVariants({
		variant,
		size
	}), className),
	...props
}));
Button.displayName = "Button";
var Slider = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Slider$1, {
	ref,
	className: cn("relative flex h-8 w-full touch-none items-center select-none", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderTrack, {
		className: "relative h-1 w-full grow overflow-hidden rounded-full bg-fg/12",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderRange, { className: "absolute h-full bg-accent" })
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderThumb, { className: "block size-4 rounded-full bg-fg shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-bg)_40%,transparent)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-bg),0_0_0_4px_var(--color-accent)]" })]
}));
Slider.displayName = "Slider";
var EMPTY_BANDS = {
	rms: 0,
	bass: 0,
	mid: 0,
	high: 0,
	pulse: 0
};
var Ctx = typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : void 0;
var AudioEngine = class {
	ctx = null;
	analyser = null;
	gain = null;
	freq = /* @__PURE__ */ new Uint8Array(0);
	time = /* @__PURE__ */ new Uint8Array(0);
	sourceNode = null;
	mediaEl = null;
	fileUrl = null;
	micStream = null;
	kind = "idle";
	playing = false;
	trackSpeed = 1;
	pulse = 0;
	bassAvg = .12;
	smooth = { ...EMPTY_BANDS };
	onEnded;
	endedHandler = () => this.onEnded?.();
	constructor(options = {}) {
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
	async ensureGraph() {
		if (!Ctx) throw new Error("Web Audio недоступен в этом браузере.");
		if (!this.ctx) {
			this.ctx = new Ctx();
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 2048;
			this.analyser.smoothingTimeConstant = .72;
			this.gain = this.ctx.createGain();
			this.analyser.connect(this.gain);
			this.gain.connect(this.ctx.destination);
			this.freq = new Uint8Array(this.analyser.frequencyBinCount);
			this.time = new Uint8Array(this.analyser.fftSize);
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
		return this.ctx;
	}
	disconnectSource() {
		if (this.sourceNode) {
			try {
				this.sourceNode.disconnect();
			} catch {}
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
	connectNode(node) {
		if (!this.analyser) return;
		this.sourceNode = node;
		node.connect(this.analyser);
	}
	attachMedia(el, monitor, loop) {
		if (!this.ctx || !this.gain) return;
		this.mediaEl = el;
		el.loop = loop;
		el.crossOrigin = "anonymous";
		el.playbackRate = this.trackSpeed;
		const media = el;
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
	async startFile(file) {
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
		if (!navigator.mediaDevices?.getUserMedia) throw new Error("Микрофон недоступен в этом браузере.");
		this.disconnectSource();
		if (this.fileUrl) {
			URL.revokeObjectURL(this.fileUrl);
			this.fileUrl = null;
		}
		this.mediaEl = null;
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: true,
				noiseSuppression: true
			},
			video: false
		});
		this.micStream = stream;
		this.kind = "mic";
		if (this.gain) this.gain.gain.value = 0;
		const node = this.ctx.createMediaStreamSource(stream);
		this.connectNode(node);
		this.playing = true;
	}
	async toggle() {
		if (this.kind === "idle") return;
		if (this.kind === "mic") {
			if (this.playing) {
				this.playing = false;
				if (this.micStream) for (const track of this.micStream.getTracks()) track.enabled = false;
			} else {
				await this.ensureGraph();
				if (this.micStream) for (const track of this.micStream.getTracks()) track.enabled = true;
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
	setTrackSpeed(rate) {
		this.trackSpeed = clamp(rate, .5, 1.5);
		if (this.mediaEl) this.mediaEl.playbackRate = this.trackSpeed;
	}
	seek(ratio) {
		if (!this.mediaEl || !this.duration) return;
		this.mediaEl.currentTime = clamp(ratio, 0, 1) * this.duration;
	}
	sample(sensitivity) {
		if (!this.analyser || !this.playing) {
			this.smooth = {
				rms: lerp(this.smooth.rms, 0, .08),
				bass: lerp(this.smooth.bass, 0, .08),
				mid: lerp(this.smooth.mid, 0, .08),
				high: lerp(this.smooth.high, 0, .08),
				pulse: lerp(this.smooth.pulse, 0, .18)
			};
			return this.smooth;
		}
		this.analyser.getByteFrequencyData(this.freq);
		this.analyser.getByteTimeDomainData(this.time);
		const bins = this.freq.length;
		const nyquist = (this.ctx?.sampleRate ?? 44100) / 2;
		const hz = (h) => Math.min(bins - 1, Math.floor(h / nyquist * bins));
		const avg = (fromHz, toHz) => {
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
		const gain = .35 + sensitivity * 1.45;
		const bass = clamp(avg(20, 140) * gain * 1.15, 0, 1);
		const mid = clamp(avg(140, 1600) * gain, 0, 1);
		const high = clamp(avg(1600, 8e3) * gain * 1.1, 0, 1);
		const energy = clamp(rms * gain * 2.4, 0, 1);
		this.bassAvg = lerp(this.bassAvg, bass, .04);
		if (bass > this.bassAvg * 1.38 + .08) this.pulse = 1;
		this.pulse *= .86;
		const k = .22;
		this.smooth = {
			rms: lerp(this.smooth.rms, energy, k),
			bass: lerp(this.smooth.bass, bass, k),
			mid: lerp(this.smooth.mid, mid, k),
			high: lerp(this.smooth.high, high, k),
			pulse: Math.max(this.pulse, lerp(this.smooth.pulse, this.pulse, .35))
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
		this.ctx?.close();
		this.ctx = null;
		this.analyser = null;
		this.gain = null;
	}
};
var BUILTIN_CLIPS = [
	{
		id: "ember",
		name: "Пламя",
		src: "/clips/ember.mp4",
		poster: "/clips/ember.jpg",
		band: "bass",
		builtin: true
	},
	{
		id: "rain",
		name: "Дождь",
		src: "/clips/rain.mp4",
		poster: "/clips/rain.jpg",
		band: "mid",
		builtin: true
	},
	{
		id: "tide",
		name: "Прилив",
		src: "/clips/tide.mp4",
		poster: "/clips/tide.jpg",
		band: "high",
		builtin: true
	}
];
var BAND_LABEL = {
	bass: "Бас",
	mid: "Середина",
	high: "Верх"
};
var BANDS = [
	"bass",
	"mid",
	"high"
];
function LibraryPanel({ open, clips, enabled, onClose, onToggle, onBand, onRemove, onFiles }) {
	const galleryRef = (0, import_react.useRef)(null);
	const cameraRef = (0, import_react.useRef)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("absolute inset-0 z-40 transition-[opacity,visibility] duration-200 ease-out", open ? "visible opacity-100" : "invisible opacity-0"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "absolute inset-0 bg-bg/50",
			"aria-label": "Закрыть ролики",
			onClick: onClose
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": "clips-title",
			className: cn("absolute inset-x-0 bottom-0 max-h-[78dvh] overflow-y-auto rounded-t-xl bg-surface px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_0_0_1px_var(--color-border)] transition-transform duration-300 ease-out", open ? "translate-y-0" : "translate-y-8"),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-auto mb-3 h-1 w-10 rounded-full bg-fg/18" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-4 flex items-end justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium tracking-[0.18em] text-muted uppercase",
						children: "Медиатека"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						id: "clips-title",
						className: "font-display text-xl font-semibold tracking-tight",
						children: "Ролики"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "max-w-40 text-right text-xs leading-snug text-muted",
						children: "С телефона. Скорость кадра следует за треком."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-4 grid grid-cols-2 gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						className: "h-12",
						onClick: () => galleryRef.current?.click(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "Из галереи"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "subtle",
						className: "h-12",
						onClick: () => cameraRef.current?.click(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { className: "size-4" }), "Снять"]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					ref: galleryRef,
					type: "file",
					accept: "video/*",
					multiple: true,
					hidden: true,
					onChange: (e) => {
						onFiles(e.target.files);
						e.target.value = "";
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					ref: cameraRef,
					type: "file",
					accept: "video/*",
					capture: "environment",
					hidden: true,
					onChange: (e) => {
						onFiles(e.target.files);
						e.target.value = "";
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "flex flex-col gap-2",
					children: clips.map((clip) => {
						const on = enabled.has(clip.id);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: cn("flex gap-3 rounded-lg bg-bg p-2 shadow-[0_0_0_1px_var(--color-border)]", !on && "opacity-55"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => onToggle(clip.id),
								className: "relative size-16 shrink-0 overflow-hidden rounded-sm bg-surface-2",
								"aria-pressed": on,
								"aria-label": `${on ? "Выключить" : "Включить"} ${clip.name}`,
								children: clip.poster ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: clip.poster,
									alt: "",
									className: "size-full object-cover"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "flex size-full items-center justify-center text-muted",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Film, { className: "size-5" })
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex min-w-0 flex-1 flex-col justify-between py-0.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "truncate text-sm font-medium",
										children: clip.name
									}), !clip.builtin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "flex size-8 items-center justify-center rounded-sm text-muted hover:text-fg",
										onClick: () => onRemove(clip.id),
										"aria-label": `Удалить ${clip.name}`,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex gap-1",
									children: BANDS.map((band) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => onBand(clip.id, band),
										className: cn("h-7 rounded-full px-2.5 text-[11px] font-medium tracking-wide", clip.band === band ? "bg-accent text-accent-fg" : "bg-fg/6 text-muted"),
										children: BAND_LABEL[band]
									}, band))
								})]
							})]
						}, clip.id);
					})
				})
			]
		})]
	});
}
var BAND_KEY = {
	bass: "bass",
	mid: "mid",
	high: "high"
};
function VideoStage({ engineRef, varsTarget, onProgress, ...params }) {
	const paramsRef = (0, import_react.useRef)(params);
	paramsRef.current = params;
	const progressRef = (0, import_react.useRef)(onProgress);
	progressRef.current = onProgress;
	const nodes = (0, import_react.useRef)(/* @__PURE__ */ new Map());
	const rates = (0, import_react.useRef)(/* @__PURE__ */ new Map());
	const lastProgress = (0, import_react.useRef)(0);
	(0, import_react.useEffect)(() => {
		let frame = 0;
		const tick = (now) => {
			const { clips, playing, idle, sensitivity, trackSpeed, syncToTrack } = paramsRef.current;
			const engine = engineRef.current;
			const bands = engine?.sample(sensitivity) ?? EMPTY_BANDS;
			applyBands(varsTarget.current, bands);
			mixClips({
				clips,
				bands,
				playing,
				idle,
				sensitivity,
				trackSpeed,
				syncToTrack,
				nodes: nodes.current,
				rates: rates.current
			});
			if (now - lastProgress.current > 200) {
				lastProgress.current = now;
				if (engine && (engine.sourceKind === "file" || engine.sourceKind === "demo")) progressRef.current?.(engine.currentTime, engine.duration);
			}
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [engineRef, varsTarget]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grain absolute inset-0 overflow-hidden bg-bg",
		children: [
			params.clips.map((clip, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
				ref: (node) => {
					if (node) nodes.current.set(clip.id, node);
					else nodes.current.delete(clip.id);
				},
				className: "video-layer",
				src: clip.src,
				poster: clip.poster,
				muted: true,
				loop: true,
				playsInline: true,
				autoPlay: true,
				preload: "auto",
				style: {
					zIndex: i + 1,
					opacity: params.clips.length === 1 ? 1 : .45
				}
			}, clip.id)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "vignette pointer-events-none absolute inset-0 z-10" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flash pointer-events-none absolute inset-0 z-10 mix-blend-soft-light" })
		]
	});
}
function applyBands(target, bands) {
	if (!target) return;
	target.style.setProperty("--energy", bands.rms.toFixed(4));
	target.style.setProperty("--pulse", bands.pulse.toFixed(4));
	target.style.setProperty("--band-bass", bands.bass.toFixed(4));
	target.style.setProperty("--band-mid", bands.mid.toFixed(4));
	target.style.setProperty("--band-high", bands.high.toFixed(4));
	target.style.setProperty("--zoom", (1 + bands.rms * .055 + bands.pulse * .03).toFixed(4));
	target.style.setProperty("--bright", (.74 + bands.rms * .55 + bands.pulse * .12).toFixed(4));
	target.style.setProperty("--sat", (.92 + bands.rms * .28).toFixed(4));
}
function mixClips({ clips, bands, playing, idle, sensitivity, trackSpeed, syncToTrack, nodes, rates }) {
	const total = bands.bass + bands.mid + bands.high + 1e-4;
	const weights = {
		bass: bands.bass / total,
		mid: bands.mid / total,
		high: bands.high / total
	};
	for (const clip of clips) {
		const el = nodes.get(clip.id);
		if (!el) continue;
		const band = bands[BAND_KEY[clip.band]];
		const mix = idle ? .42 : .16 + band * .78 + weights[clip.band] * .22;
		el.style.opacity = mix.toFixed(3);
		const reactive = .48 + (band * .55 + bands.rms * .45) * (.4 + sensitivity * 1.7);
		const target = idle ? .55 : playing ? clamp((syncToTrack ? trackSpeed : 1) * reactive, .5, 2.2) : 0;
		const prev = rates.get(clip.id) ?? target;
		const next = target === 0 ? 0 : lerp(prev, target, .18);
		rates.set(clip.id, next);
		if (!playing && !idle) {
			if (!el.paused) el.pause();
			continue;
		}
		if (el.paused) {
			const play = el.play();
			if (play) play.catch(() => {});
		}
		if (next > 0 && Math.abs(el.playbackRate - next) > .025) el.playbackRate = next;
	}
}
var PREFS_KEY = "pulseframe-prefs";
var BAND_CYCLE = [
	"bass",
	"mid",
	"high"
];
function loadPrefs() {
	try {
		const raw = localStorage.getItem(PREFS_KEY);
		if (!raw) return {
			sensitivity: .62,
			trackSpeed: 1
		};
		const parsed = JSON.parse(raw);
		return {
			sensitivity: clampNum(parsed.sensitivity ?? .62, .15, 1),
			trackSpeed: clampNum(parsed.trackSpeed ?? 1, .5, 1.5)
		};
	} catch {
		return {
			sensitivity: .62,
			trackSpeed: 1
		};
	}
}
function clampNum(n, a, b) {
	return Math.min(b, Math.max(a, n));
}
function formatTime(s) {
	if (!Number.isFinite(s) || s < 0) return "0:00";
	return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}
function sourceLabel(kind, fileName) {
	if (kind === "mic") return "Микрофон";
	if (kind === "demo") return "Демо-пульс";
	if (kind === "file") return fileName ?? "Трек";
	return "Тишина";
}
function PulseframeApp() {
	const stageRef = (0, import_react.useRef)(null);
	const engineRef = (0, import_react.useRef)(null);
	const fileInputRef = (0, import_react.useRef)(null);
	const prefsReady = (0, import_react.useRef)(false);
	const [sensitivity, setSensitivity] = (0, import_react.useState)(.62);
	const [trackSpeed, setTrackSpeed] = (0, import_react.useState)(1);
	const [kind, setKind] = (0, import_react.useState)("idle");
	const [playing, setPlaying] = (0, import_react.useState)(false);
	const [progress, setProgress] = (0, import_react.useState)({
		current: 0,
		duration: 0
	});
	const [chromeOn, setChromeOn] = (0, import_react.useState)(true);
	const [libraryOpen, setLibraryOpen] = (0, import_react.useState)(false);
	const [fullscreen, setFullscreen] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [fileName, setFileName] = (0, import_react.useState)(null);
	const [clips, setClips] = (0, import_react.useState)(BUILTIN_CLIPS);
	const [enabled, setEnabled] = (0, import_react.useState)(() => new Set(BUILTIN_CLIPS.map((c) => c.id)));
	const hideTimer = (0, import_react.useRef)(0);
	const playingRef = (0, import_react.useRef)(false);
	const libraryRef = (0, import_react.useRef)(false);
	playingRef.current = playing;
	libraryRef.current = libraryOpen;
	const activeClips = (0, import_react.useMemo)(() => clips.filter((c) => enabled.has(c.id)), [clips, enabled]);
	const bumpChrome = (0, import_react.useCallback)(() => {
		setChromeOn(true);
		window.clearTimeout(hideTimer.current);
		if (libraryRef.current) return;
		hideTimer.current = window.setTimeout(() => {
			if (playingRef.current) setChromeOn(false);
		}, 3200);
	}, []);
	(0, import_react.useEffect)(() => {
		const engine = new AudioEngine({ onEnded: () => setPlaying(false) });
		engineRef.current = engine;
		const prefs = loadPrefs();
		setSensitivity(prefs.sensitivity);
		setTrackSpeed(prefs.trackSpeed);
		engine.setTrackSpeed(prefs.trackSpeed);
		return () => engine.dispose();
	}, []);
	(0, import_react.useEffect)(() => {
		if (!prefsReady.current) {
			prefsReady.current = true;
			return;
		}
		localStorage.setItem(PREFS_KEY, JSON.stringify({
			sensitivity,
			trackSpeed
		}));
		engineRef.current?.setTrackSpeed(trackSpeed);
	}, [sensitivity, trackSpeed]);
	(0, import_react.useEffect)(() => {
		const onFs = () => {
			const doc = document;
			setFullscreen(Boolean(document.fullscreenElement || doc.webkitFullscreenElement));
		};
		document.addEventListener("fullscreenchange", onFs);
		document.addEventListener("webkitfullscreenchange", onFs);
		return () => {
			document.removeEventListener("fullscreenchange", onFs);
			document.removeEventListener("webkitfullscreenchange", onFs);
		};
	}, []);
	const run = (0, import_react.useCallback)(async (fn) => {
		setBusy(true);
		setError(null);
		try {
			await fn();
			const engine = engineRef.current;
			if (engine) {
				setKind(engine.sourceKind);
				setPlaying(engine.isPlaying);
			}
			bumpChrome();
		} catch (err) {
			const raw = err instanceof Error ? err.message : String(err);
			setError(/NotAllowed|Permission|Denied/i.test(raw) ? "Нет доступа к микрофону. Разрешите его в браузере или загрузите трек." : err instanceof Error ? err.message : "Не удалось запустить источник.");
		} finally {
			setBusy(false);
		}
	}, [bumpChrome]);
	const startDemo = () => run(async () => {
		setFileName(null);
		await engineRef.current?.startDemo();
	});
	const startMic = () => run(async () => {
		setFileName(null);
		await engineRef.current?.startMic();
	});
	const startFile = (file) => run(async () => {
		setFileName(file.name);
		await engineRef.current?.startFile(file);
	});
	const togglePlay = () => run(async () => {
		const engine = engineRef.current;
		if (!engine) return;
		if (engine.sourceKind === "idle") {
			await engine.startDemo();
			return;
		}
		await engine.toggle();
	});
	const toggleFullscreen = async () => {
		const el = stageRef.current;
		if (!el) return;
		const doc = document;
		const node = el;
		const current = document.fullscreenElement || doc.webkitFullscreenElement;
		try {
			if (current) {
				if (document.exitFullscreen) await document.exitFullscreen();
				else doc.webkitExitFullscreen?.();
			} else if (el.requestFullscreen) await el.requestFullscreen();
			else node.webkitRequestFullscreen?.();
		} catch {
			setChromeOn((v) => !v);
		}
	};
	const onPickVideos = (list) => {
		if (!list?.length) return;
		const next = [];
		Array.from(list).forEach((file, i) => {
			const url = URL.createObjectURL(file);
			next.push({
				id: `user-${Date.now()}-${i}`,
				name: file.name.replace(/\.[^.]+$/, ""),
				src: url,
				band: BAND_CYCLE[(clips.length + i) % 3] ?? "mid",
				builtin: false
			});
		});
		setClips((prev) => [...prev, ...next].slice(0, 8));
		setEnabled((prev) => {
			const copy = new Set(prev);
			for (const clip of next) copy.add(clip.id);
			return copy;
		});
	};
	const showWelcome = kind === "idle";
	const hasTransport = kind === "file" || kind === "demo";
	const showSpeed = kind !== "mic";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		ref: stageRef,
		className: "relative h-dvh w-full overflow-hidden bg-bg text-fg",
		onPointerMove: bumpChrome,
		onPointerDown: bumpChrome,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VideoStage, {
				engineRef,
				varsTarget: stageRef,
				clips: activeClips.length ? activeClips : BUILTIN_CLIPS,
				playing,
				idle: showWelcome,
				sensitivity,
				trackSpeed,
				syncToTrack: kind === "file" || kind === "demo",
				onProgress: (current, duration) => setProgress({
					current,
					duration
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: cn("pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-5 transition-opacity duration-300 ease-out", chromeOn || showWelcome ? "opacity-100" : "opacity-0"),
				style: { paddingTop: "max(1.25rem, env(safe-area-inset-top))" },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-[0.28em] text-accent uppercase",
					children: "Pulseframe"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs text-muted",
					children: sourceLabel(kind, fileName)
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EnergyPills, {})]
			}),
			showWelcome && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 z-20 flex items-end justify-center px-5 pb-32 sm:items-center sm:pb-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "stagger-in w-full max-w-md",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium tracking-[0.28em] text-accent uppercase",
							children: "Видео × звук"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-2 font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl",
							children: "Ролики дышат вместе с музыкой"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 max-w-sm text-base leading-relaxed text-muted",
							children: "Микрофон или трек. Свои вертикальные ролики с телефона. Скорость кадра следует за темпом загруженного трека и за энергией звука."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 flex flex-col gap-2 sm:flex-row",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									size: "lg",
									onClick: startDemo,
									disabled: busy,
									className: "flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Music2, { className: "size-4" }), "Демо"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									size: "lg",
									variant: "outline",
									disabled: busy,
									className: "flex-1",
									onClick: () => fileInputRef.current?.click(),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "size-4" }), "Трек"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									size: "lg",
									variant: "subtle",
									onClick: startMic,
									disabled: busy,
									className: "flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "size-4" }), "Микрофон"]
								})
							]
						})
					]
				})
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute top-20 right-4 left-4 z-30 mx-auto max-w-md rounded-md bg-surface px-3 py-2 text-sm text-fg shadow-[0_0_0_1px_var(--color-border)]",
				children: error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: cn("absolute inset-x-0 bottom-0 z-30 px-3 transition-[opacity,transform] duration-300 ease-out", chromeOn ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"),
				style: { paddingBottom: "max(0.85rem, env(safe-area-inset-bottom))" },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-xl rounded-xl bg-surface/88 px-3 py-3 shadow-[0_0_0_1px_var(--color-border)]",
					children: [hasTransport && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-2 flex items-center gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "w-8 text-xs tabular-nums text-muted",
								children: formatTime(progress.current)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
								min: 0,
								max: 1,
								step: .001,
								value: [progress.duration ? progress.current / progress.duration : 0],
								onValueChange: ([v]) => engineRef.current?.seek(v ?? 0),
								"aria-label": "Позиция трека"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "w-8 text-right text-xs tabular-nums text-muted",
								children: formatTime(progress.duration)
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1.5 sm:gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon",
								variant: "primary",
								onClick: togglePlay,
								disabled: busy,
								"aria-label": playing ? "Пауза" : "Играть",
								className: "shrink-0",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "relative size-5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: cn("absolute inset-0 flex items-center justify-center transition-[opacity,filter,transform] duration-200", playing ? "scale-100 opacity-100 blur-0" : "scale-[0.25] opacity-0 blur-[4px]"),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-5" })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: cn("absolute inset-0 flex items-center justify-center transition-[opacity,filter,transform] duration-200", playing ? "scale-[0.25] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-0"),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "ml-0.5 size-5" })
									})]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex min-w-0 flex-1 items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "w-14 shrink-0 text-xs tracking-wide text-muted",
										children: "Отклик"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
										min: .15,
										max: 1,
										step: .01,
										value: [sensitivity],
										onValueChange: ([v]) => setSensitivity(v ?? .62),
										"aria-label": "Чувствительность"
									})]
								}), showSpeed && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex min-w-0 flex-1 items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "w-20 shrink-0 text-xs tracking-wide text-muted tabular-nums",
										children: [
											"Темп ",
											trackSpeed.toFixed(2),
											"×"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
										min: .5,
										max: 1.5,
										step: .01,
										value: [trackSpeed],
										onValueChange: ([v]) => setTrackSpeed(v ?? 1),
										"aria-label": "Скорость трека"
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon",
								variant: "ghost",
								onClick: () => setLibraryOpen(true),
								"aria-label": "Ролики",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Film, { className: "size-5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon",
								variant: "ghost",
								className: "hidden sm:inline-flex",
								onClick: () => fileInputRef.current?.click(),
								"aria-label": "Загрузить трек",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "size-5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon",
								variant: "ghost",
								className: "hidden sm:inline-flex",
								onClick: () => void startMic(),
								"aria-label": "Микрофон",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "size-5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon",
								variant: "ghost",
								onClick: () => void toggleFullscreen(),
								"aria-label": fullscreen ? "Выйти из полного экрана" : "Полный экран",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "relative size-5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: cn("absolute inset-0 flex items-center justify-center transition-[opacity,filter,transform] duration-200", fullscreen ? "scale-100 opacity-100 blur-0" : "scale-[0.25] opacity-0 blur-[4px]"),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minimize, { className: "size-5" })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: cn("absolute inset-0 flex items-center justify-center transition-[opacity,filter,transform] duration-200", fullscreen ? "scale-[0.25] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-0"),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Maximize, { className: "size-5" })
									})]
								})
							})
						]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				ref: fileInputRef,
				type: "file",
				accept: "audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac",
				hidden: true,
				onChange: (e) => {
					const file = e.target.files?.[0];
					if (file) startFile(file);
					e.target.value = "";
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LibraryPanel, {
				open: libraryOpen,
				clips,
				enabled,
				onClose: () => setLibraryOpen(false),
				onToggle: (id) => {
					setEnabled((prev) => {
						const copy = new Set(prev);
						if (copy.has(id)) {
							if (copy.size > 1) copy.delete(id);
						} else copy.add(id);
						return copy;
					});
				},
				onBand: (id, band) => {
					setClips((prev) => prev.map((c) => c.id === id ? {
						...c,
						band
					} : c));
				},
				onRemove: (id) => {
					setClips((prev) => {
						const found = prev.find((c) => c.id === id);
						if (found && !found.builtin) URL.revokeObjectURL(found.src);
						return prev.filter((c) => c.id !== id);
					});
					setEnabled((prev) => {
						const copy = new Set(prev);
						copy.delete(id);
						return copy;
					});
				},
				onFiles: onPickVideos
			})
		]
	});
}
function EnergyPills() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex h-8 items-end gap-1",
		"aria-hidden": true,
		children: [
			"--band-bass",
			"--band-mid",
			"--band-high"
		].map((key) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "w-1 origin-bottom rounded-full bg-accent",
			style: {
				height: 30,
				transform: `scaleY(calc(0.22 + var(${key}, 0) * 0.78))`,
				opacity: `calc(0.35 + var(${key}, 0) * 0.65)`
			}
		}, key))
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PulseframeApp, {});
}
//#endregion
export { Home as component };
