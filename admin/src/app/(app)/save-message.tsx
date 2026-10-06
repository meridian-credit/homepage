import type { SaveResult } from "../actions";

/* 저장 요청 자체가 실패했을 때(배포로 관리자 앱이 바뀌어 옛 화면의 액션을 못 찾거나, 연결이 끊김).
   잡지 않으면 오류 화면으로 바뀌면서 적던 내용이 사라진다. */
export const UNREACHABLE: SaveResult<never> = {
  ok: false,
  error: "저장하지 못했습니다. 관리자 앱이 막 새로 배포됐거나 연결이 끊겼을 수 있습니다. 적은 내용을 따로 복사해 두고 새로고침해 주세요.",
};

/* 저장 결과 한 덩어리. 저장 성공과 사이트 반영 성공은 따로 알린다 — 저장만 되고 반영이 실패할 수 있다. */
export default function SaveMessage({ result }: { result: SaveResult<unknown> | null }) {
  if (!result) return null;
  if (!result.ok) {
    return (
      <div className="msg msg-error" role="alert">
        {result.error}
        {result.conflict ? (
          <div className="bar">
            <button type="button" className="btn btn-sm" onClick={() => window.location.reload()}>
              새로고침
            </button>
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <>
      <div className={`msg ${result.published.ok ? "msg-ok" : "msg-warn"}`} role="status">
        {result.published.ok
          ? "저장하고 개발 사이트에 반영했습니다."
          : `저장은 했지만 사이트 반영에 실패했습니다: ${result.published.detail} 「오늘 할 일」에서 다시 반영할 수 있습니다.`}
      </div>
      {result.warnings.length ? (
        <div className="msg msg-warn" role="status">
          <ul>
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
