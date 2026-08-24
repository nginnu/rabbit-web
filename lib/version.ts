export const VERSION_TINT = [
  { dot: "bg-sky-500", text: "text-sky-700", border: "border-b-sky-500", wash: "bg-sky-50/70" },
  { dot: "bg-amber-500", text: "text-amber-700", border: "border-b-amber-500", wash: "bg-amber-50/70" },
  { dot: "bg-emerald-500", text: "text-emerald-700", border: "border-b-emerald-500", wash: "bg-emerald-50/70" },
  { dot: "bg-fuchsia-500", text: "text-fuchsia-700", border: "border-b-fuchsia-500", wash: "bg-fuchsia-50/70" },
  { dot: "bg-indigo-500", text: "text-indigo-700", border: "border-b-indigo-500", wash: "bg-indigo-50/70" },
  { dot: "bg-rose-500", text: "text-rose-700", border: "border-b-rose-500", wash: "bg-rose-50/70" },
];

export function tintAt(index: number) {
  const n = Number.isFinite(index) ? Math.abs(Math.trunc(index)) : 0;
  return VERSION_TINT[n % VERSION_TINT.length];
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function splitMarker(marker: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(marker);
  if (!m) return { date: null, time: marker };
  return {
    date: `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}`,
    time: `${m[4]}:${m[5]}`,
  };
}
