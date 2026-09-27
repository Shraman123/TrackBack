// A fixed demo clock keeps every screenshot, test and eval number reproducible.
export const DEMO_NOW = "2026-09-27T10:00:00+05:30";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const ms = (iso: string) => new Date(iso).getTime();
export const hoursBetween = (a: string, b: string) => (ms(b) - ms(a)) / HOUR;
export const daysBetween = (a: string, b: string) => (ms(b) - ms(a)) / DAY;
export const addHours = (iso: string, h: number) => new Date(ms(iso) + h * HOUR).toISOString();
export const addDays = (iso: string, d: number) => new Date(ms(iso) + d * DAY).toISOString();

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function fmtHours(h: number): string {
  const a = Math.abs(h);
  if (a < 1) return `${Math.round(a * 60)} min`;
  if (a < 48) return `${Math.round(a)} h`;
  return `${Math.round(a / 24)} days`;
}

export const inr = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN");
