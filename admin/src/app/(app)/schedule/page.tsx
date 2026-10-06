import { ntsMonthUrl, seoulToday } from "@/lib/schedule";
import { readSchedule } from "@admin/lib/content";
import { requireAdmin } from "@admin/lib/session";
import ScheduleForm from "./schedule-form";

export const metadata = { title: "세무 일정" };

export default async function SchedulePage() {
  await requireAdmin();
  const state = readSchedule();
  const today = seoulToday();
  const [year, month] = today.split("-").map(Number);
  /* 이번 달부터 석 달치 국세청 표. 국세청이 게시한 달만 적는다. */
  const months = [0, 1, 2].map((k) => {
    const m = ((month - 1 + k) % 12) + 1;
    const y = year + Math.floor((month - 1 + k) / 12);
    return { label: `${y}년 ${m}월`, href: ntsMonthUrl(y, m) };
  });

  return (
    <>
      <h1>세무 일정</h1>
      <p className="lead">
        머리글의 일정 큐브와 고객 포털 안내창에 나옵니다. D-day 는 보는 날 기준으로 저절로 계산되니 날짜만 적으세요.
      </p>
      <div className="card">
        <h2>국세청 월별 세무일정에서 확인</h2>
        <p className="muted">국세청이 표를 게시한 달만 적습니다. 게시되지 않은 달은 짐작해 넣지 않습니다.</p>
        <div className="bar">
          {months.map((m) => (
            <a key={m.href} className="btn btn-sm" href={m.href} target="_blank" rel="noopener noreferrer">
              {m.label} 표 열기
            </a>
          ))}
        </div>
      </div>
      <ScheduleForm initial={{ items: state.items, reviewedAt: state.reviewedAt }} revision={state.revision} today={today} />
    </>
  );
}
