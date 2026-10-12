"use client";

import type { Change } from "@admin/content/types";
import { whenSaved } from "@admin/lib/format";
import { DiffList } from "@admin/ui/diff-list";
import { Icon } from "@admin/ui/icons";

/* 편집 화면 위의 띠 둘.
   - 이 기기에 남은 작업본: 새로고침 · 로그인 만료 · 배포 뒤 다시 열었을 때.
   - 충돌 뒤 최신 내용을 불러왔을 때, 저장하지 못한 내 변경. 다시 넣을 수 있게 닫기 전까지 남긴다. */
export function EditorNotices({
  draft,
  lost,
  onResume,
  onDrop,
  onDismissLost,
}: {
  draft: { at: string; summary: string } | null;
  lost: Change[] | null;
  onResume: () => void;
  onDrop: () => void;
  onDismissLost: () => void;
}) {
  if (!draft && !lost) return null;
  return (
    <div className="page-banners">
      {draft ? (
        <div className="banner info" role="status">
          <Icon name="info" />
          <div className="banner-body">
            <div className="banner-title">저장하지 않은 변경이 이 기기에 남아 있습니다</div>
            <p className="banner-text">
              {whenSaved(draft.at)}에 적던 내용입니다 — {draft.summary}
            </p>
            <div className="banner-actions">
              <button type="button" className="btn btn-primary" onClick={onResume}>
                이어서 고치기
              </button>
              <button type="button" className="btn" onClick={onDrop}>
                버리기
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {lost ? (
        <div className="banner info" role="status">
          <Icon name="info" />
          <div className="banner-body">
            <div className="banner-title">최신 내용을 불러왔습니다. 저장하지 못한 내 변경은 아래와 같습니다</div>
            <p className="banner-text">필요한 것만 다시 넣고 저장해 주세요. 이 안내는 닫기 전까지 남아 있습니다.</p>
            <div className="diff-box" style={{ marginTop: 12 }}>
              <DiffList changes={lost} />
            </div>
            <div className="banner-actions">
              <button type="button" className="btn btn-sm" onClick={onDismissLost}>
                <Icon name="x" small />
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
