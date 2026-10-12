/* 콘텐츠 종류가 함께 쓰는 모양. 브라우저와 서버 양쪽에서 읽는다(server-only 를 붙이지 않는다). */

/* 두 상태 사이의 바뀐 점 한 줄. 변경 기록, 되돌리기 미리 보기, 충돌 창이 모두 이것으로 그린다.
   - add · del: 「무엇이」 들어오거나 빠졌다. detail 은 그 내용 전부(새 문답의 답). 충돌 뒤 「저장하지 못한 내 변경」이
     질문만 남기고 답을 잃지 않게 늘 담는다.
   - mod: 같은 것이 바뀌었다. before · after 가 있으면 앞뒤를 나란히 보인다(block 이면 긴 글이라 두 줄로). */
export type Change =
  | { op: "add" | "del"; text: string; detail?: string }
  | { op: "mod"; text: string; before?: string; after?: string; block?: boolean };

/* 저장 액션의 결과. 실패는 까닭마다 화면이 다르게 답한다(저장 막대 · 충돌 창 · 다시 로그인). */
export type Published = { ok: true } | { ok: false; detail: string };
export type SaveResult<T> =
  | { ok: true; revision: number; saved: T; warnings: string[]; published: Published }
  | { ok: false; reason: "invalid"; message: string }
  | { ok: false; reason: "conflict"; latest: { at: string; actor: string } | null }
  | { ok: false; reason: "signed-out" };
