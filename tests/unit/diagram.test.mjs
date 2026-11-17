import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDiagram, parseAmount } from "../../src/lib/diagram.mjs";

const ok = (kind, body, title = "제목") => {
  const r = parseDiagram(kind, `${title}
${body}`);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.diagram;
};
const bad = (kind, body, title = "제목") => {
  const r = parseDiagram(kind, `${title}
${body}`);
  assert.equal(r.ok, false);
  return r.error;
};

test("금액 읽기", () => {
  assert.equal(parseAmount("1억 400만 원"), 104_000_000);
  assert.equal(parseAmount("4,800만 원"), 48_000_000);
  assert.equal(parseAmount("30,000,000"), 30_000_000);
  assert.equal(parseAmount("0"), 0);
  assert.ok(Number.isNaN(parseAmount("많이")));
});

test("흐름: 두 층 질문, 결과 색, 근거 줄", () => {
  const d = ok("흐름", `직전 사업연도에 산출세액이 있었나?
- 아니오: 상반기 가결산으로 신고 | 올해 실적 기준
- 예: 계산한 세액이 50만 원 미만인가?
  - 예: 안 내도 됨 | 신고 납부 없음 (좋음)
  - 아니오: 8월 31일까지 | 신고 납부 (납부)
근거: 법인세법 제63조`);
  assert.equal(d.source, "법인세법 제63조");
  assert.equal(d.root.branches.length, 2);
  assert.deepEqual(d.root.branches[0].node, { result: "상반기 가결산으로 신고", note: "올해 실적 기준", tone: "alt" });
  const sub = d.root.branches[1].node;
  assert.equal(sub.q, "계산한 세액이 50만 원 미만인가?");
  assert.equal(sub.branches[0].node.tone, "good");
  assert.equal(sub.branches[1].node.tone, "pay");
});

test("흐름: 갈래가 하나면 거부", () => {
  assert.match(bad("흐름", "질문?\n- 예: 끝\n- 아니오: 다음?\n  - 예: 끝"), /갈래가 둘/);
});

test("제목은 블록 첫 줄. 언어 줄에 쓰면 편집기가 지우므로 거부", () => {
  assert.equal(parseDiagram("단계", "절차\n1. 가\n2. 나").diagram.title, "절차");
  assert.match(parseDiagram("단계", "1. 가\n2. 나", "절차").error, /첫 줄/);
});

test("구간: 작은 값부터", () => {
  assert.equal(ok("구간", "0 | 면제 | 가\n4,800만 원 | 간이 | 나\n1억 400만 원 | 일반 | 다").bands.length, 3);
  assert.match(bad("구간", "1억 원 | 가 | 가\n4,800만 원 | 나 | 나"), /작은 것부터/);
});

test("일정: 비례 위치, 강조, 기간", () => {
  const d = ok("일정", `2026-06-30 | 상반기 종료
2026-07-01 ~ 2026-08-31 | 신고 기간
2026-08-31 | 중간예납 기한 *
2026-10-31 | 분납 기한
2027-03-31 | 확정신고`);
  assert.deepEqual(d.points.map(p => Math.round(p.pos)), [0, 23, 45, 100]);
  assert.equal(d.points[1].hot, true);
  assert.equal(d.points[1].text, "중간예납 기한");
  assert.equal(d.windows.length, 1);
  assert.match(bad("일정", "2026-08-31 | 가\n2026-06-30 | 나\n2026-09-30 | 다"), /이른 것부터/);
});

test("계산: 검산이 맞아야 그린다", () => {
  const d = ok("계산", `직전 사업연도 산출세액 | 30,000,000
- 공제감면세액 등 | 4,000,000
= 차감 세액 | 26,000,000
× 6/12 = 중간예납세액 | 13,000,000`);
  assert.deepEqual(d.rows.map(r => r.tone), ["base", "minus", "mid", "res"]);
  assert.equal(Math.round(d.rows[1].left), 87);
  assert.match(bad("계산", "가 | 100\n- 나 | 30\n= 다 | 80"), /맞지 않는다/);
  assert.match(bad("계산", "가 | 100\n× 1/2 = 나 | 40"), /맞지 않는다/);
});

test("비교: 강조, 언제, 정도", () => {
  const d = ok("비교", `| | 직전 기준 | 가결산 * |
| 언제 | 비슷할 때 | 나빠졌을 때 |
| 준비 부담 | 간단 [1] | 반기 결산 [3] |`);
  assert.equal(d.cards[1].pick, true);
  assert.equal(d.cards[1].name, "가결산");
  assert.equal(d.cards[0].when, "비슷할 때");
  assert.deepEqual(d.cards[1].rows[0], { label: "준비 부담", value: "반기 결산", level: 3 });
});

test("단계", () => {
  assert.deepEqual(ok("단계", "1. 확인: 해제일 정리\n2. 발급").steps, [{ title: "확인", desc: "해제일 정리" }, { title: "발급", desc: undefined }]);
});
