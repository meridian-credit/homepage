/* 변경 기록의 시각을 서울 시간으로 보여 준다. 서버(UTC)와 브라우저의 시간대가 달라도 같은 글자가 나오게. */
const seoulTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const formatSeoul = (iso: string) => seoulTime.format(new Date(iso));
