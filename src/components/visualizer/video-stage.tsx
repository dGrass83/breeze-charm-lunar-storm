import { useEffect, useRef, type RefObject } from "react";
import {
  EMPTY_BANDS,
  type AudioBands,
  type AudioEngine,
} from "@/lib/audio-engine";
import type { Band, VisualClip } from "@/lib/clips";
import { clamp, lerp } from "@/lib/utils";

type StageParams = {
  clips: VisualClip[];
  playing: boolean;
  idle: boolean;
  sensitivity: number;
  trackSpeed: number;
  syncToTrack: boolean;
};

type Props = StageParams & {
  engineRef: RefObject<AudioEngine | null>;
  varsTarget: RefObject<HTMLElement | null>;
  onProgress?: (current: number, duration: number) => void;
};

const BAND_KEY: Record<Band, keyof Pick<AudioBands, "bass" | "mid" | "high">> = {
  bass: "bass",
  mid: "mid",
  high: "high",
};

export function VideoStage({
  engineRef,
  varsTarget,
  onProgress,
  ...params
}: Props) {
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;
  const nodes = useRef<Map<string, HTMLVideoElement>>(new Map());
  const rates = useRef<Map<string, number>>(new Map());
  const lastProgress = useRef(0);

  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      const { clips, playing, idle, sensitivity, trackSpeed, syncToTrack } =
        paramsRef.current;
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
        rates: rates.current,
      });
      if (now - lastProgress.current > 200) {
        lastProgress.current = now;
        if (
          engine &&
          (engine.sourceKind === "file" || engine.sourceKind === "demo")
        ) {
          progressRef.current?.(engine.currentTime, engine.duration);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [engineRef, varsTarget]);

  return (
    <div className="grain pointer-events-none absolute inset-0 z-0 overflow-hidden bg-bg">
      {params.clips.map((clip, i) => (
        <video
          key={clip.id}
          ref={(node) => {
            if (node) nodes.current.set(clip.id, node);
            else nodes.current.delete(clip.id);
          }}
          className="video-layer"
          src={clip.src}
          poster={clip.poster}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          style={{
            opacity: params.clips.length === 1 ? 1 : 0.55,
          }}
        />
      ))}
      <div className="vignette pointer-events-none absolute inset-0 z-10" />
      <div className="flash pointer-events-none absolute inset-0 z-10 mix-blend-soft-light" />
    </div>
  );
}

function applyBands(target: HTMLElement | null, bands: AudioBands) {
  if (!target) return;
  target.style.setProperty("--energy", bands.rms.toFixed(4));
  target.style.setProperty("--pulse", bands.pulse.toFixed(4));
  target.style.setProperty("--band-bass", bands.bass.toFixed(4));
  target.style.setProperty("--band-mid", bands.mid.toFixed(4));
  target.style.setProperty("--band-high", bands.high.toFixed(4));
  target.style.setProperty(
    "--zoom",
    (1 + bands.rms * 0.055 + bands.pulse * 0.03).toFixed(4),
  );
  target.style.setProperty(
    "--bright",
    (0.82 + bands.rms * 0.45 + bands.pulse * 0.1).toFixed(4),
  );
  target.style.setProperty("--sat", (0.92 + bands.rms * 0.28).toFixed(4));
}

function mixClips({
  clips,
  bands,
  playing,
  idle,
  sensitivity,
  trackSpeed,
  syncToTrack,
  nodes,
  rates,
}: StageParams & {
  bands: AudioBands;
  nodes: Map<string, HTMLVideoElement>;
  rates: Map<string, number>;
}) {
  const total = bands.bass + bands.mid + bands.high + 0.0001;
  const weights = {
    bass: bands.bass / total,
    mid: bands.mid / total,
    high: bands.high / total,
  };

  for (const clip of clips) {
    const el = nodes.get(clip.id);
    if (!el) continue;
    const band = bands[BAND_KEY[clip.band]];
    const mix = idle ? 0.55 : 0.34 + band * 0.6 + weights[clip.band] * 0.18;
    el.style.opacity = mix.toFixed(3);

    const reactive =
      0.48 + (band * 0.55 + bands.rms * 0.45) * (0.4 + sensitivity * 1.7);
    const base = syncToTrack ? trackSpeed : 1;
    const target = idle
      ? 0.55
      : playing
        ? clamp(base * reactive, 0.5, 2.2)
        : 0;
    const prev = rates.get(clip.id) ?? target;
    const next = target === 0 ? 0 : lerp(prev, target, 0.18);
    rates.set(clip.id, next);

    if (!playing && !idle) {
      if (!el.paused) el.pause();
      continue;
    }
    if (el.paused) {
      const play = el.play();
      if (play) void play.catch(() => {});
    }
    if (next > 0 && Math.abs(el.playbackRate - next) > 0.025) {
      el.playbackRate = next;
    }
  }
}
