export type Band = "bass" | "mid" | "high";

export type VisualClip = {
  id: string;
  name: string;
  src: string;
  poster?: string;
  band: Band;
  builtin: boolean;
};

export const BUILTIN_CLIPS: VisualClip[] = [
  {
    id: "ember",
    name: "Пламя",
    src: "/clips/ember.mp4",
    poster: "/clips/ember.jpg",
    band: "bass",
    builtin: true,
  },
  {
    id: "rain",
    name: "Дождь",
    src: "/clips/rain.mp4",
    poster: "/clips/rain.jpg",
    band: "mid",
    builtin: true,
  },
  {
    id: "tide",
    name: "Прилив",
    src: "/clips/tide.mp4",
    poster: "/clips/tide.jpg",
    band: "high",
    builtin: true,
  },
];

export const BAND_LABEL: Record<Band, string> = {
  bass: "Бас",
  mid: "Середина",
  high: "Верх",
};
