/* 국세청 월별 세무일정 표. 일정이 다 지나면 이번 달 표로 보낸다(ntsThisMonthUrl). */
const NTS_SCHEDULE = 'https://www.nts.go.kr/nts/ad/taxSchdul/selectList.do?mi=135747';
export const ntsMonthUrl = (year: number, month: number) => `${NTS_SCHEDULE}&taxMonth=${month}&taxYear=${year}`;

/* 국세청이 공식으로 게시한 달까지만 적는다. 게시되지 않은 달을 추측해 넣지 않는다.
   2026-09-27 확인: 10 · 11 · 12월 게시, 2027년 1월 미게시.
   갱신은 사이트 주인이 한다. 남은 일정이 30일 밑으로 내려가면 content-audit 이
   맨 앞에 경고하고, 주간 점검(.github/workflows/schedule-check.yml)이 실패로 알린다. */
export const scheduleReviewedAt = '2026-09-27';
export const scheduleDates = [
  { what: '원천세 납부', when: '2026-10-12', period: '2026년 9월분' },
  { what: '부가세 2기 예정신고', when: '2026-10-26', period: '2026년 7~9월분' },
  { what: '원천세 납부', when: '2026-11-10', period: '2026년 10월분' },
  { what: '소득세 중간예납', when: '2026-11-30', period: '2026년 1~6월분' },
  { what: '원천세 납부', when: '2026-12-10', period: '2026년 11월분' },
  { what: '종합부동산세 납부', when: '2026-12-15', period: '2026년 귀속' },
];
export type ScheduleItem = typeof scheduleDates[number];
const seoulDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
export function seoulToday(now = new Date()) {
  return seoulDateFormatter.format(now);
}
/* 적어 둔 일정이 다 지났을 때 보내는 곳. 고정된 달이 아니라 서울 기준 오늘의 달이다 —
   11월에 「이번 달」을 누르고 10월 표가 뜨면 안 된다. */
export function ntsThisMonthUrl(today = seoulToday()) {
  const [year, month] = today.split('-').map(Number);
  return ntsMonthUrl(year, month);
}
export function daysLeft(date: string, today = seoulToday()) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}
export function dday(date: string, today = seoulToday()) {
  const days = daysLeft(date, today);
  return days === 0 ? 'D-DAY' : days > 0 ? `D-${days}` : `D+${-days}`;
}
