import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Film,
  Maximize,
  Mic,
  Minimize,
  Music2,
  Pause,
  Play,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AudioEngine, type AudioSourceKind } from "@/lib/audio-engine";
import { BUILTIN_CLIPS, type Band, type VisualClip } from "@/lib/clips";
import { cn } from "@/lib/utils";
import { LibraryPanel } from "./library-panel";
import { VideoStage } from "./video-stage";

const PREFS_KEY = "pulseframe-prefs";
const BAND_CYCLE: Band[] = ["bass", "mid", "high"];

type Prefs = {
  sensitivity: number;
  trackSpeed: number;
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { sensitivity: 0.62, trackSpeed: 1 };
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      sensitivity: clampNum(parsed.sensitivity ?? 0.62, 0.15, 1),
      trackSpeed: clampNum(parsed.trackSpeed ?? 1, 0.5, 1.5),
    };
  } catch {
    return { sensitivity: 0.62, trackSpeed: 1 };
  }
}

function clampNum(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function sourceLabel(kind: AudioSourceKind, fileName: string | null) {
  if (kind === "mic") return "Микрофон";
  if (kind === "demo") return "Демо-пульс";
  if (kind === "file") return fileName ?? "Трек";
  return "Тишина";
}

export function PulseframeApp() {
  const stageRef = useRef<HTMLElement>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prefsReady = useRef(false);
  const [sensitivity, setSensitivity] = useState(0.62);
  const [trackSpeed, setTrackSpeed] = useState(1);
  const [kind, setKind] = useState<AudioSourceKind>("idle");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState({ current: 0, duration: 0 });
  const [chromeOn, setChromeOn] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [clips, setClips] = useState<VisualClip[]>(BUILTIN_CLIPS);
  const [enabled, setEnabled] = useState<Set<string>>(
    () => new Set(BUILTIN_CLIPS.map((c) => c.id)),
  );
  const hideTimer = useRef(0);
  const playingRef = useRef(false);
  const libraryRef = useRef(false);
  playingRef.current = playing;
  libraryRef.current = libraryOpen;

  const activeClips = useMemo(
    () => clips.filter((c) => enabled.has(c.id)),
    [clips, enabled],
  );

  const bumpChrome = useCallback(() => {
    setChromeOn(true);
    window.clearTimeout(hideTimer.current);
    if (libraryRef.current) return;
    hideTimer.current = window.setTimeout(() => {
      if (playingRef.current) setChromeOn(false);
    }, 3200);
  }, []);

  useEffect(() => {
    const engine = new AudioEngine({
      onEnded: () => setPlaying(false),
    });
    engineRef.current = engine;
    const prefs = loadPrefs();
    setSensitivity(prefs.sensitivity);
    setTrackSpeed(prefs.trackSpeed);
    engine.setTrackSpeed(prefs.trackSpeed);
    return () => engine.dispose();
  }, []);

  useEffect(() => {
    if (!prefsReady.current) {
      prefsReady.current = true;
      return;
    }
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ sensitivity, trackSpeed } satisfies Prefs),
    );
    engineRef.current?.setTrackSpeed(trackSpeed);
  }, [sensitivity, trackSpeed]);

  useEffect(() => {
    const onFs = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      setFullscreen(
        Boolean(document.fullscreenElement || doc.webkitFullscreenElement),
      );
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener(
        "webkitfullscreenchange",
        onFs as EventListener,
      );
    };
  }, []);

  const run = useCallback(
    async (fn: () => Promise<void>) => {
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
        setError(
          /NotAllowed|Permission|Denied/i.test(raw)
            ? "Нет доступа к микрофону. Разрешите его в браузере или загрузите трек."
            : err instanceof Error
              ? err.message
              : "Не удалось запустить источник.",
        );
      } finally {
        setBusy(false);
      }
    },
    [bumpChrome],
  );

  const startDemo = () =>
    run(async () => {
      setFileName(null);
      await engineRef.current?.startDemo();
    });

  const startMic = () =>
    run(async () => {
      setFileName(null);
      await engineRef.current?.startMic();
    });

  const startFile = (file: File) =>
    run(async () => {
      setFileName(file.name);
      await engineRef.current?.startFile(file);
    });

  const togglePlay = () =>
    run(async () => {
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
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => void;
    };
    const node = el as HTMLElement & { webkitRequestFullscreen?: () => void };
    const current = document.fullscreenElement || doc.webkitFullscreenElement;
    try {
      if (current) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else doc.webkitExitFullscreen?.();
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else {
        node.webkitRequestFullscreen?.();
      }
    } catch {
      setChromeOn((v) => !v);
    }
  };

  const onPickVideos = (list: FileList | null) => {
    if (!list?.length) return;
    const next: VisualClip[] = [];
    Array.from(list).forEach((file, i) => {
      const url = URL.createObjectURL(file);
      next.push({
        id: `user-${Date.now()}-${i}`,
        name: file.name.replace(/\.[^.]+$/, ""),
        src: url,
        band: BAND_CYCLE[(clips.length + i) % 3] ?? "mid",
        builtin: false,
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

  return (
    <main
      ref={stageRef}
      className="relative h-dvh w-full overflow-hidden bg-bg text-fg"
      onPointerMove={bumpChrome}
      onPointerDown={bumpChrome}
    >
      <VideoStage
        engineRef={engineRef}
        varsTarget={stageRef}
        clips={activeClips.length ? activeClips : BUILTIN_CLIPS}
        playing={playing}
        idle={showWelcome}
        sensitivity={sensitivity}
        trackSpeed={trackSpeed}
        syncToTrack={kind === "file" || kind === "demo"}
        onProgress={(current, duration) => setProgress({ current, duration })}
      />

      <header
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-5 transition-opacity duration-300 ease-out",
          chromeOn || showWelcome ? "opacity-100" : "opacity-0",
        )}
        style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
      >
        <div>
          <p className="text-xs font-medium tracking-[0.28em] text-accent uppercase">
            Pulseframe
          </p>
          <p className="mt-1 text-xs text-muted">{sourceLabel(kind, fileName)}</p>
        </div>
        <EnergyPills />
      </header>

      {showWelcome && (
        <div className="absolute inset-0 z-20 flex items-end justify-center px-5 pb-32 sm:items-center sm:pb-0">
          <div className="stagger-in w-full max-w-md">
            <p className="text-xs font-medium tracking-[0.28em] text-accent uppercase">
              Видео × звук
            </p>
            <h1 className="mt-2 font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
              Ролики дышат вместе с музыкой
            </h1>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-muted">
              Микрофон или трек. Свои вертикальные ролики с телефона. Скорость
              кадра следует за темпом загруженного трека и за энергией звука.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button
                size="lg"
                onClick={startDemo}
                disabled={busy}
                className="flex-1"
              >
                <Music2 className="size-4" />
                Демо
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={busy}
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" />
                Трек
              </Button>
              <Button
                size="lg"
                variant="subtle"
                onClick={startMic}
                disabled={busy}
                className="flex-1"
              >
                <Mic className="size-4" />
                Микрофон
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-20 right-4 left-4 z-30 mx-auto max-w-md rounded-md bg-surface px-3 py-2 text-sm text-fg shadow-[0_0_0_1px_var(--color-border)]">
          {error}
        </div>
      )}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-30 px-3 transition-[opacity,transform] duration-300 ease-out",
          chromeOn
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0",
        )}
        style={{ paddingBottom: "max(0.85rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-xl rounded-xl bg-surface/88 px-3 py-3 shadow-[0_0_0_1px_var(--color-border)]">
          {hasTransport && (
            <div className="mb-2 flex items-center gap-3">
              <span className="w-8 text-xs tabular-nums text-muted">
                {formatTime(progress.current)}
              </span>
              <Slider
                min={0}
                max={1}
                step={0.001}
                value={[
                  progress.duration ? progress.current / progress.duration : 0,
                ]}
                onValueChange={([v]) => engineRef.current?.seek(v ?? 0)}
                aria-label="Позиция трека"
              />
              <span className="w-8 text-right text-xs tabular-nums text-muted">
                {formatTime(progress.duration)}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="primary"
              onClick={togglePlay}
              disabled={busy}
              aria-label={playing ? "Пауза" : "Играть"}
              className="shrink-0"
            >
              <span className="relative size-5">
                <span
                  className={cn(
                    "absolute inset-0 flex items-center justify-center transition-[opacity,filter,transform] duration-200",
                    playing
                      ? "scale-100 opacity-100 blur-0"
                      : "scale-[0.25] opacity-0 blur-[4px]",
                  )}
                >
                  <Pause className="size-5" />
                </span>
                <span
                  className={cn(
                    "absolute inset-0 flex items-center justify-center transition-[opacity,filter,transform] duration-200",
                    playing
                      ? "scale-[0.25] opacity-0 blur-[4px]"
                      : "scale-100 opacity-100 blur-0",
                  )}
                >
                  <Play className="ml-0.5 size-5" />
                </span>
              </span>
            </Button>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <label className="flex min-w-0 items-center gap-2">
                <span className="w-14 shrink-0 text-xs tracking-wide text-muted">
                  Отклик
                </span>
                <Slider
                  min={0.15}
                  max={1}
                  step={0.01}
                  value={[sensitivity]}
                  onValueChange={([v]) => setSensitivity(v ?? 0.62)}
                  aria-label="Чувствительность"
                />
              </label>
              {showSpeed && (
                <label className="flex min-w-0 items-center gap-2">
                  <span className="w-14 shrink-0 text-xs tracking-wide text-muted tabular-nums">
                    {trackSpeed.toFixed(2)}×
                  </span>
                  <Slider
                    min={0.5}
                    max={1.5}
                    step={0.01}
                    value={[trackSpeed]}
                    onValueChange={([v]) => setTrackSpeed(v ?? 1)}
                    aria-label="Скорость трека"
                  />
                </label>
              )}
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => setLibraryOpen(true)}
              aria-label="Ролики"
            >
              <Film className="size-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="hidden sm:inline-flex"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Загрузить трек"
            >
              <Upload className="size-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="hidden sm:inline-flex"
              onClick={() => void startMic()}
              aria-label="Микрофон"
            >
              <Mic className="size-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => void toggleFullscreen()}
              aria-label={
                fullscreen ? "Выйти из полного экрана" : "Полный экран"
              }
            >
              <span className="relative size-5">
                <span
                  className={cn(
                    "absolute inset-0 flex items-center justify-center transition-[opacity,filter,transform] duration-200",
                    fullscreen
                      ? "scale-100 opacity-100 blur-0"
                      : "scale-[0.25] opacity-0 blur-[4px]",
                  )}
                >
                  <Minimize className="size-5" />
                </span>
                <span
                  className={cn(
                    "absolute inset-0 flex items-center justify-center transition-[opacity,filter,transform] duration-200",
                    fullscreen
                      ? "scale-[0.25] opacity-0 blur-[4px]"
                      : "scale-100 opacity-100 blur-0",
                  )}
                >
                  <Maximize className="size-5" />
                </span>
              </span>
            </Button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void startFile(file);
          e.target.value = "";
        }}
      />

      <LibraryPanel
        open={libraryOpen}
        clips={clips}
        enabled={enabled}
        onClose={() => setLibraryOpen(false)}
        onToggle={(id) => {
          setEnabled((prev) => {
            const copy = new Set(prev);
            if (copy.has(id)) {
              if (copy.size > 1) copy.delete(id);
            } else copy.add(id);
            return copy;
          });
        }}
        onBand={(id, band) => {
          setClips((prev) =>
            prev.map((c) => (c.id === id ? { ...c, band } : c)),
          );
        }}
        onRemove={(id) => {
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
        }}
        onFiles={onPickVideos}
      />
    </main>
  );
}

function EnergyPills() {
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden>
      {(["--band-bass", "--band-mid", "--band-high"] as const).map((key) => (
        <span
          key={key}
          className="w-1 origin-bottom rounded-full bg-accent"
          style={{
            height: 30,
            transform: `scaleY(calc(0.22 + var(${key}, 0) * 0.78))`,
            opacity: `calc(0.35 + var(${key}, 0) * 0.65)`,
          }}
        />
      ))}
    </div>
  );
}
