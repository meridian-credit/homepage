import Link from "next/link";
import { dday, seoulToday } from "@/lib/schedule";
import { describeEvent } from "@admin/content/history";
import { CONTENT_TYPES, contentType, type ContentKind } from "@admin/content/registry";
import { scheduleStatus } from "@admin/content/schedule";
import { lastSaves, listAudit, readFaq, readPublishFailure, readSchedule } from "@admin/lib/content";
import { ddayTone, monthDay, monthDot, seoulDateTime, weekday, whenSaved } from "@admin/lib/format";
import { requireAdmin } from "@admin/lib/session";
import { Icon } from "@admin/ui/icons";
import { PageHeader } from "@admin/ui/page-header";
import { RepublishButton } from "@admin/ui/publish-banner";

export const metadata = { title: "홈" };

/* 홈은 숫자판이 아니다. 손볼 일이 있으면 그것 하나와 단추 하나를 보여 주고, 없으면 「없습니다, 다음은 언제」라고 말한다.
   손볼 일의 차례: 사이트 반영 실패 → 세무 일정이 바닥남 → 30일 안에 바닥남 → 없음. */
export default async function Home() {
  const user = await requireAdmin();
  const today = seoulToday();
  const schedule = readSchedule();
  const faq = readFaq();
  const status = scheduleStatus(schedule.items, today);
  const failure = readPublishFailure();
  const saves = lastSaves();
  const recent = listAudit({ limit: 4 });
  const [y, m, d] = today.split("-").map(Number);
  const greeting = user.name && user.name !== user.username ? `안녕하세요, ${user.name} 님` : "안녕하세요";

  const meta: Record<ContentKind, string> = {
    schedule: status.last ? `${schedule.items.length}건 · ${monthDay(status.last.when, today)}까지` : `${schedule.items.length}건 · 보일 일정 없음`,
    faq: `${faq.items.length}개 · FAQ · 문의 페이지`,
  };

  return (
    <>
      <PageHeader eyebrow={`${y}년 ${m}월 ${d}일 ${weekday(today)}요일`} title={greeting} publishBanner={false} />
      <div className="home-grid">
        <div className="stack">
          {failure ? (
            <section className="card hero" aria-labelledby="hero-h">
              <span className="hero-icon danger">
                <Icon name="alert" />
              </span>
              <div>
                <h2 id="hero-h">저장한 내용이 사이트에 아직 나오지 않습니다</h2>
                <p>
                  {whenSaved(failure.at, today)}에 저장한 {failure.what} 사이트가 아직 그리지 못했습니다. 저장은 되어 있으니 [다시 반영]만 누르면
                  됩니다.
                </p>
                <RepublishButton />
              </div>
            </section>
          ) : status.level === "danger" ? (
            <section className="card hero" aria-labelledby="hero-h">
              <span className="hero-icon danger">
                <Icon name="alert" />
              </span>
              <div>
                <h2 id="hero-h">사이트에 보일 세무 일정이 없습니다</h2>
                <p>사이트 머리글에 일정 대신 국세청 이번 달 일정 링크가 나오고 있습니다. 국세청 표를 보고 이번 달과 다음 달 기한을 넣어 주세요.</p>
                <Link className="btn btn-primary" href="/schedule">
                  <Icon name="plus" />
                  일정 채우기
                </Link>
              </div>
            </section>
          ) : status.level === "warn" && status.last ? (
            <section className="card hero" aria-labelledby="hero-h">
              <span className="hero-icon warn">
                <Icon name="alert" />
              </span>
              <div>
                <h2 id="hero-h">세무 일정을 채울 때입니다</h2>
                <p>
                  사이트에 보일 일정이 <strong>{monthDay(status.last.when, today)}</strong>까지만 있습니다({status.runway}일 남음). 국세청이 다음 달 표를
                  올렸는지 확인하고 넣어 주세요.
                </p>
                <Link className="btn btn-primary" href="/schedule">
                  <Icon name="plus" />
                  일정 채우기
                </Link>
              </div>
            </section>
          ) : (
            <section className="card hero" aria-labelledby="hero-h">
              <span className="hero-icon">
                <Icon name="check" />
              </span>
              <div>
                <h2 id="hero-h">지금 손볼 일은 없습니다</h2>
                <p>
                  세무 일정이 <strong>{monthDay(status.last!.when, today)}</strong>까지 채워져 있습니다.{" "}
                  <strong>{monthDay(status.remindFrom!, today)}</strong>부터 이 화면에 ‘일정 채우기’ 알림이 뜹니다.
                </p>
              </div>
            </section>
          )}

          <section className="card" aria-labelledby="up-h">
            <div className="card-head">
              <div>
                <h2 id="up-h">지금 사이트에 보이는 세무 일정</h2>
                <span className="sub">머리글 큐브와 고객 포털에 이 순서로 나옵니다</span>
              </div>
              <Link className="btn btn-sm btn-ghost" href="/schedule">
                고치기
                <Icon name="right" small />
              </Link>
            </div>
            {status.upcoming.length ? (
              <ul className="upcoming">
                {status.upcoming.map((it) => (
                  <li key={`${it.when}-${it.what}`}>
                    <span className="date num">
                      {monthDot(it.when)}
                      <small>({weekday(it.when)})</small>
                    </span>
                    <span className={`dday ${ddayTone(it.when, today)}`}>{dday(it.when, today)}</span>
                    <span className="what">{it.what}</span>
                    <span className="period">{it.period}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="card-body muted">사이트에 보일 일정이 없습니다. 대신 국세청 이번 달 일정 링크가 나옵니다.</p>
            )}
          </section>
        </div>

        <div className="stack">
          <section className="card" aria-labelledby="types-h">
            <div className="card-head">
              <h2 id="types-h">사이트 내용</h2>
            </div>
            <ul className="type-list">
              {CONTENT_TYPES.map((t) => {
                const saved = saves[t.kind];
                return (
                  <li key={t.kind}>
                    <Link href={t.href}>
                      <span className="type-ic">
                        <Icon name={t.icon} />
                      </span>
                      <span>
                        <strong>{t.label}</strong>
                        <span className="meta">{meta[t.kind]}</span>
                        <span className="meta">{saved ? `${whenSaved(saved.at, today)} ${saved.actor} 저장` : "아직 저장한 적 없음"}</span>
                      </span>
                      <span className="chev">
                        <Icon name="right" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card" aria-labelledby="feed-h">
            <div className="card-head">
              <h2 id="feed-h">최근 변경</h2>
              <Link className="link-btn" href="/history">
                전체 보기
                <Icon name="right" small />
              </Link>
            </div>
            {recent.length ? (
              <ul className="feed">
                {recent.map((e) => {
                  const { title, detail, restore } = describeEvent(e, today);
                  const { date, time } = seoulDateTime(e.at);
                  return (
                    <li key={e.id}>
                      <time className="num" dateTime={e.at}>
                        {monthDot(date)} {time}
                      </time>
                      <span>
                        {contentType(e.kind).label} — {restore ? "되돌림" : title}
                        <span className="who-line">
                          {restore ?? detail} · {e.actor}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="card-body muted">아직 저장한 기록이 없습니다.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
