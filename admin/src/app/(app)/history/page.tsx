import type { FaqItem } from "@/lib/faq";
import type { ScheduleItem } from "@/lib/schedule";
import { listAudit, type AuditEvent } from "@admin/lib/content";
import { formatSeoul } from "@admin/lib/format";
import { requireAdmin } from "@admin/lib/session";
import RestoreButton from "./restore-button";

export const metadata = { title: "변경 기록" };

/* 기록의 전 · 후를 사람이 읽을 줄로 바꾼다. 통째로 보여 주면 무엇이 바뀌었는지 찾기 어렵다. */
function describe(event: AuditEvent) {
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  if (event.kind === "schedule") {
    const b = event.before as { items: ScheduleItem[]; reviewedAt: string };
    const a = event.after as { items: ScheduleItem[]; reviewedAt: string };
    const line = (it: ScheduleItem) => `${it.when} ${it.what} (${it.period})`;
    const bs = new Set(b.items.map(line));
    const as = new Set(a.items.map(line));
    for (const l of as) if (!bs.has(l)) added.push(l);
    for (const l of bs) if (!as.has(l)) removed.push(l);
    if (b.reviewedAt !== a.reviewedAt) changed.push(`확인일 ${b.reviewedAt} → ${a.reviewedAt}`);
  } else {
    const b = (event.before as { items: FaqItem[] }).items;
    const a = (event.after as { items: FaqItem[] }).items;
    const bm = new Map(b.map((it) => [it.q, it.a]));
    const am = new Map(a.map((it) => [it.q, it.a]));
    for (const it of a) if (!bm.has(it.q)) added.push(it.q);
    for (const it of b) if (!am.has(it.q)) removed.push(it.q);
    for (const it of a) if (bm.has(it.q) && bm.get(it.q) !== it.a) changed.push(`답 수정: ${it.q}`);
    const order = (xs: FaqItem[]) => xs.filter((it) => bm.has(it.q) && am.has(it.q)).map((it) => it.q).join("\n");
    if (order(a) !== order(b)) changed.push("순서 바뀜");
  }
  return { added, removed, changed };
}

export default async function HistoryPage() {
  await requireAdmin();
  const events = listAudit(100);
  return (
    <>
      <h1>변경 기록</h1>
      <p className="lead">최근 100건입니다. 「이 변경 전으로」는 그 저장 직전의 목록으로 되돌리고, 되돌린 것도 새 기록으로 남깁니다.</p>
      {events.length ? null : <p className="muted">아직 고친 내용이 없습니다.</p>}
      {events.map((e) => {
        const d = describe(e);
        return (
          <section key={e.id} className="card">
            <div className="faq-head">
              <strong>
                #{e.id} {e.kind === "schedule" ? "세무 일정" : "자주 묻는 질문"} · {e.summary}
              </strong>
              <RestoreButton id={e.id} />
            </div>
            <p className="muted">
              {formatSeoul(e.at)} · {e.actor}
            </p>
            {d.added.length || d.removed.length || d.changed.length ? (
              <ul>
                {d.added.map((l) => (
                  <li key={`+${l}`}>
                    <span className="sr-only">추가: </span>＋ {l}
                  </li>
                ))}
                {d.removed.map((l) => (
                  <li key={`-${l}`}>
                    <span className="sr-only">삭제: </span>－ {l}
                  </li>
                ))}
                {d.changed.map((l) => (
                  <li key={`~${l}`}>{l}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">내용 변화 없음</p>
            )}
          </section>
        );
      })}
    </>
  );
}
