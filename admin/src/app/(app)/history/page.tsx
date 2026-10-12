import Link from "next/link";
import { Fragment } from "react";
import { seoulToday } from "@/lib/schedule";
import { describeEvent } from "@admin/content/history";
import { CONTENT_TYPES, contentType, isContentKind } from "@admin/content/registry";
import { listAudit } from "@admin/lib/content";
import { monthDay, seoulDateTime, weekday } from "@admin/lib/format";
import { requireAdmin } from "@admin/lib/session";
import { DiffList } from "@admin/ui/diff-list";
import { Icon } from "@admin/ui/icons";
import { PageHeader } from "@admin/ui/page-header";
import { RepublishButton } from "@admin/ui/publish-banner";
import { RestoreButton, RestoreScope } from "./restore";

export const metadata = { title: "변경 기록" };

const LIMIT = 100;

/* 변경 기록. 목록과 바뀐 내용은 서버에서 그린다 — 기록 100건의 전 · 후를 브라우저로 보내지 않는다.
   거르기는 주소(?type=)로 한다. 각 편집 화면의 「변경 기록」 단추가 type 을 붙여 연다. */
export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireAdmin();
  const { type } = await searchParams;
  const kind = isContentKind(type) ? type : undefined;
  const today = seoulToday();
  const events = listAudit({ kind, limit: LIMIT });

  /* 서울 날짜로 묶는다. */
  const days: { date: string; items: typeof events }[] = [];
  for (const e of events) {
    const { date } = seoulDateTime(e.at);
    if (days.at(-1)?.date !== date) days.push({ date, items: [] });
    days.at(-1)!.items.push(e);
  }

  return (
    <>
      <PageHeader
        title="변경 기록"
        desc="저장할 때마다 누가, 언제, 무엇을 바꿨는지 남습니다. 잘못 고쳤다면 그 저장 이전으로 되돌릴 수 있고, 되돌린 것도 기록에 남습니다."
      />
      <div className="list-toolbar" style={{ marginBottom: 16 }}>
        <nav className="seg" aria-label="종류로 거르기">
          <Link href="/history" aria-current={kind ? undefined : "page"}>
            전체
          </Link>
          {CONTENT_TYPES.map((t) => (
            <Link key={t.kind} href={`/history?type=${t.kind}`} aria-current={kind === t.kind ? "page" : undefined}>
              {t.label}
            </Link>
          ))}
        </nav>
        <span className="hint">최근 {LIMIT}건까지 보입니다</span>
      </div>

      <RestoreScope>
        {events.length ? (
          <section className="card" aria-label="변경 목록">
            {days.map((day) => (
              <Fragment key={day.date}>
                <div className="day-head">
                  {monthDay(day.date, today)} ({weekday(day.date)}){day.date === today ? " · 오늘" : ""}
                </div>
                {day.items.map((e) => {
                  const t = contentType(e.kind);
                  const { title, detail, changes, restore } = describeEvent(e, today);
                  return (
                    <details className="entry" key={e.id} id={`e${e.id}`}>
                      <summary>
                        <time dateTime={e.at}>{seoulDateTime(e.at).time}</time>
                        <span className="what">
                          <span className="what-line">
                            <span className={`tag kind-${e.kind}`}>{t.label}</span>
                            {restore ? <span className="tag kind-restore">되돌림</span> : null}
                            <span className="title">{title}</span>
                          </span>
                          {restore || detail ? (
                            <span className="muted" style={{ fontSize: "0.8125rem" }}>
                              {restore ?? detail}
                            </span>
                          ) : null}
                        </span>
                        <span className="actor">{e.actor}</span>
                        <Icon name="chevron" className="chev" />
                      </summary>
                      <div className="entry-body">
                        {changes.length ? <DiffList changes={changes} /> : <p className="hint">달라진 점 없음</p>}
                        <div className="entry-foot">
                          <p className="hint">
                            되돌리면 {t.subject} 이 저장 직전 모습으로 돌아갑니다. 누르면 지금과 무엇이 달라지는지 먼저 보여 드립니다.
                          </p>
                          <RestoreButton id={e.id} />
                        </div>
                      </div>
                    </details>
                  );
                })}
              </Fragment>
            ))}
          </section>
        ) : (
          <section className="card">
            <div className="empty">
              <span className="empty-ic">
                <Icon name="history" />
              </span>
              <h3>{kind ? `${contentType(kind).label} 기록이 아직 없습니다` : "아직 저장한 기록이 없습니다"}</h3>
              <p>세무 일정이나 자주 묻는 질문을 저장하면 여기에 쌓입니다. 잘못 고쳤을 때 여기서 되돌릴 수 있습니다.</p>
            </div>
          </section>
        )}
      </RestoreScope>
      {events.length && events.length < LIMIT ? (
        <p className="hint" style={{ textAlign: "center", margin: "16px 0 0" }}>
          처음 기록입니다. 기록은 관리자를 연 뒤부터 남았습니다.
        </p>
      ) : null}

      <section className="card tail-tool" aria-labelledby="tail-h" style={{ marginTop: 32 }}>
        <span className="type-ic" style={{ flex: "none" }}>
          <Icon name="refresh" />
        </span>
        <div className="banner-body">
          <div className="banner-title" id="tail-h">
            사이트가 저장한 내용과 다르게 보이나요?
          </div>
          <p>저장할 때마다 사이트에 자동으로 반영하므로 보통은 쓸 일이 없습니다. 반영이 실패했다는 안내를 받았을 때만 누르세요.</p>
          <RepublishButton plain label="사이트에 다시 반영" />
        </div>
      </section>
    </>
  );
}
