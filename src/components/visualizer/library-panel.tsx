import { useRef } from "react";
import { Film, Plus, Trash2, Video } from "lucide-react";
import { BAND_LABEL, type Band, type VisualClip } from "@/lib/clips";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  clips: VisualClip[];
  enabled: Set<string>;
  onClose: () => void;
  onToggle: (id: string) => void;
  onBand: (id: string, band: Band) => void;
  onRemove: (id: string) => void;
  onFiles: (files: FileList | null) => void;
};

const BANDS: Band[] = ["bass", "mid", "high"];

export function LibraryPanel({
  open,
  clips,
  enabled,
  onClose,
  onToggle,
  onBand,
  onRemove,
  onFiles,
}: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={cn(
        "absolute inset-0 z-40 transition-[opacity,visibility] duration-200 ease-out",
        open ? "visible opacity-100" : "invisible opacity-0",
      )}
    >
      <button
        type="button"
        className="absolute inset-0 bg-bg/50"
        aria-label="Закрыть ролики"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="clips-title"
        className={cn(
          "absolute inset-x-0 bottom-0 max-h-[78dvh] overflow-y-auto rounded-t-xl bg-surface px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_0_0_1px_var(--color-border)] transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-8",
        )}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-fg/18" />
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
              Медиатека
            </p>
            <h2
              id="clips-title"
              className="font-display text-xl font-semibold tracking-tight"
            >
              Ролики
            </h2>
          </div>
          <p className="max-w-40 text-right text-xs leading-snug text-muted">
            С телефона. Скорость кадра следует за треком.
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-12"
            onClick={() => galleryRef.current?.click()}
          >
            <Plus className="size-4" />
            Из галереи
          </Button>
          <Button
            variant="subtle"
            className="h-12"
            onClick={() => cameraRef.current?.click()}
          >
            <Video className="size-4" />
            Снять
          </Button>
        </div>
        <input
          ref={galleryRef}
          type="file"
          accept="video/*"
          multiple
          hidden
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="video/*"
          capture="environment"
          hidden
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <ul className="flex flex-col gap-2">
          {clips.map((clip) => {
            const on = enabled.has(clip.id);
            return (
              <li
                key={clip.id}
                className={cn(
                  "flex gap-3 rounded-lg bg-bg p-2 shadow-[0_0_0_1px_var(--color-border)]",
                  !on && "opacity-55",
                )}
              >
                <button
                  type="button"
                  onClick={() => onToggle(clip.id)}
                  className="relative size-16 shrink-0 overflow-hidden rounded-sm bg-surface-2"
                  aria-pressed={on}
                  aria-label={`${on ? "Выключить" : "Включить"} ${clip.name}`}
                >
                  {clip.poster ? (
                    <img
                      src={clip.poster}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-muted">
                      <Film className="size-5" />
                    </span>
                  )}
                </button>
                <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium">{clip.name}</p>
                    {!clip.builtin && (
                      <button
                        type="button"
                        className="flex size-8 items-center justify-center rounded-sm text-muted hover:text-fg"
                        onClick={() => onRemove(clip.id)}
                        aria-label={`Удалить ${clip.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {BANDS.map((band) => (
                      <button
                        key={band}
                        type="button"
                        onClick={() => onBand(clip.id, band)}
                        className={cn(
                          "h-7 rounded-full px-2.5 text-[11px] font-medium tracking-wide",
                          clip.band === band
                            ? "bg-accent text-accent-fg"
                            : "bg-fg/6 text-muted",
                        )}
                      >
                        {BAND_LABEL[band]}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
