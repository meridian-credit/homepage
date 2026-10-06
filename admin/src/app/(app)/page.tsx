import Link from "next/link";
import { daysLeft, dday, seoulToday } from "@/lib/schedule";
import { listAudit, readFaq, readSchedule } from "@admin/lib/content";
import { formatSeoul } from "@admin/lib/format";
import { requireAdmin } from "@admin/lib/session";
import { scheduleWarnings } from "@admin/lib/validate";
import RepublishButton from "./republish-button";

export const metadata = { title: "오늘 할 일" };

export default async function Dashboard() {
  await requireAdmin();
  const today = seoulToday();
  const schedule = readSchedule();
  const faq = readFaq();
  const upcoming = schedule.items.filter((it) => daysLeft(it.when, today) >= 0);
  const last = upcoming.at(-1);
  const runway = last ? daysLeft(last.when, today) : -1;
  const warnings = scheduleWarnings(schedule.items, today);
  const recent = listAudit(5);

  return (
    <>
      <h1>오늘 할 일</h1>
      <p className="lead">
        여기서 고친 내용은 <strong>개발 사이트</strong>에만 반영됩니다. 운영 사이트(www.meridianco.kr)는 아직 코드에 적힌 값을 씁니다.
      </p>

      {warnings.length ? (
        <div className="msg msg-warn" role="status">
          <strong>세무 일정 확인이 필요합니다</strong>
          <ul>
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid">
        <section className="card">
          <h2>다음 세무 일정</h2>
          {upcoming[0] ? (
            <>
              <div className="stat">{dday(upcoming[0].when, today)}</div>
              <div>
                {upcoming[0].what} · {upcoming[0].when}
              </div>
              <div className="muted">{upcoming[0].period}</div>
            </>
          ) : (
            <div className="stat bad">없음</div>
          )}
        </section>
        <section className="card">
          <h2>일정이 남은 날</h2>
          <div className={`stat${runway < 30 ? " bad" : ""}`}>{runway >= 0 ? `${runway}일` : "없음"}</div>
          <div className="muted">
            마지막 일정 {last?.when ?? "—"} · 국세청 확인일 {schedule.reviewedAt || "—"}
          </div>
        </section>
        <section className="card">
          <h2>자주 묻는 질문</h2>
          <div className="stat">{faq.items.length}개</div>
          <div className="muted">FAQ 쪽과 문의 쪽에 함께 나옵니다.</div>
        </section>
      </div>

      <section className="card">
        <h2>최근 변경</h2>
        {recent.length ? (
          <ul className="list">
            {recent.map((e) => (
              <li key={e.id}>
                <span className="muted">{formatSeoul(e.at)}</span>
                <span>{e.summary}</span>
                <span className="muted">{e.actor}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">아직 고친 내용이 없습니다.</p>
        )}
        <div className="bar">
          <Link className="btn" href="/history">
            변경 기록 전체
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>사이트에 다시 반영</h2>
        <p className="muted">
          저장할 때마다 자동으로 반영합니다. 저장은 됐는데 반영이 실패했다고 나왔을 때만 누르세요.
        </p>
        <RepublishButton />
      </section>
    </>
  );
}
