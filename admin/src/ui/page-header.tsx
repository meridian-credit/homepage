import Link from "next/link";
import { readPublishFailure } from "@admin/lib/content";
import { Icon } from "./icons";
import { PublishBanner } from "./publish-banner";

/* 쪽 머리: 제목, 「사이트 어디에 나오나」, 사이트에서 보기 · 변경 기록. 그 아래 반영 실패 띠.
   설명은 늘 「이것이 사이트 어디에 나오나」다 — 주인이 가장 먼저 묻는 것이 그것이다. */
export function PageHeader({
  title,
  desc,
  eyebrow,
  siteHref,
  historyHref,
  publishBanner = true,
}: {
  title: string;
  desc?: string;
  eyebrow?: string;
  siteHref?: string;
  historyHref?: string;
  publishBanner?: boolean;
}) {
  return (
    <>
      <div className="page-head">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          {desc ? <p className="desc">{desc}</p> : null}
        </div>
        {siteHref || historyHref ? (
          <div className="page-actions">
            {siteHref ? (
              <a className="btn" href={siteHref} target="_blank" rel="noopener noreferrer">
                <Icon name="external" />
                사이트에서 보기
              </a>
            ) : null}
            {historyHref ? (
              <Link className="btn btn-ghost" href={historyHref}>
                <Icon name="history" />
                변경 기록
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
      {publishBanner ? <PublishBanner failure={readPublishFailure()} /> : null}
    </>
  );
}
