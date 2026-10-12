import { daysLeft } from "@/lib/schedule";

/* 날짜와 시각을 화면 글자로. 서버(UTC)와 브라우저의 시간대가 달라도 같은 글자가 나오게 늘 서울 시간으로 쓴다.
   날짜(YYYY-MM-DD)는 시간대가 없는 「그날」이라 UTC 로 읽어 요일만 뽑는다. */

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const utc = (ymd: string) => new Date(`${ymd}T00:00:00Z`);

/* 2026-13-01 처럼 없는 날짜는 Invalid Date 가 되고 toISOString 이 던진다. 먼저 걸러 낸다. */
export const isYmd = (s: string) => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = utc(s);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
};
export const weekday = (ymd: string) => WEEKDAYS[utc(ymd).getUTCDay()];
export const addDays = (ymd: string, n: number) => new Date(utc(ymd).getTime() + n * 86_400_000).toISOString().slice(0, 10);

/* 「10.12」 — 목록의 날짜 칸. */
export const monthDot = (ymd: string) => `${Number(ymd.slice(5, 7))}.${ymd.slice(8, 10)}`;
/* 「10월 12일」 — 문장 안. 올해가 아니면 연도를 붙인다(1월 일정을 10월에 넣을 때 헷갈리지 않게). */
export const monthDay = (ymd: string, today?: string) =>
  `${today && today.slice(0, 4) !== ymd.slice(0, 4) ? `${ymd.slice(0, 4)}년 ` : ""}${Number(ymd.slice(5, 7))}월 ${Number(ymd.slice(8, 10))}일`;

/* D-day 배지의 색. 지난 것 · 오늘 · 일주일 안 · 그 밖. */
export function ddayTone(ymd: string, today: string) {
  const d = daysLeft(ymd, today);
  return d < 0 ? "past" : d === 0 ? "today" : d <= 7 ? "soon" : "";
}

const seoulParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/* ISO 시각 → 서울의 날짜(YYYY-MM-DD)와 시각(HH:MM). */
export function seoulDateTime(iso: string) {
  const p = Object.fromEntries(seoulParts.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  const hour = p.hour === "24" ? "00" : p.hour;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${hour}:${p.minute}` };
}

/* 「10월 12일 14:03」 */
export function whenSaved(iso: string, today?: string) {
  const { date, time } = seoulDateTime(iso);
  return `${monthDay(date, today)} ${time}`;
}
