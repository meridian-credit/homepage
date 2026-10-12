import { z } from "zod";
import type { FaqItem } from "@/lib/faq";
import type { Change } from "./types";

/* 자주 묻는 질문의 규칙 · 비교. 편집 화면(브라우저)과 저장 액션(서버)이 같은 것을 쓴다. */

export type FaqData = { items: FaqItem[] };
export const FAQ_Q_MAX = 100;
export const FAQ_A_MAX = 600;
export const FAQ_ROWS_MAX = 30;

export const faqRow = z.object({
  q: z.string().trim().min(1, "질문을 적어 주세요.").max(FAQ_Q_MAX, `질문은 ${FAQ_Q_MAX}자 안으로 적어 주세요.`),
  a: z.string().trim().min(1, "답을 적어 주세요.").max(FAQ_A_MAX, `답은 ${FAQ_A_MAX}자 안으로 적어 주세요.`),
});

export const faqInput = z.object({
  items: z
    .array(faqRow)
    .min(1, "문답이 하나는 있어야 합니다.")
    .max(FAQ_ROWS_MAX, `문답은 ${FAQ_ROWS_MAX}개까지 둘 수 있습니다.`)
    /* 화면이 질문을 열쇠로 쓴다. 같은 질문이 둘이면 하나가 사라진다. */
    .refine((rows) => new Set(rows.map((r) => r.q)).size === rows.length, "같은 질문이 두 번 있습니다."),
});

export function faqRowIssues(row: FaqItem): Partial<Record<"q" | "a", string>> {
  const parsed = faqRow.safeParse(row);
  if (parsed.success) return {};
  const out: Partial<Record<"q" | "a", string>> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as "q" | "a";
    out[field] ??= issue.message;
  }
  return out;
}

/* 두 상태의 차이를 사람이 읽을 줄로.
   - 질문만 바꾼 문답(답이 그대로)은 「지움 + 추가」가 아니라 「질문 고침」으로 읽힌다.
   - 순서는 둘 다에 있는 문답끼리의 앞뒤가 달라졌을 때만 「순서 바꿈」이다. 하나를 지워 뒤가 당겨진 것은 순서를 바꾼 것이 아니다. */
export function describeFaq(before: Partial<FaqData>, after: Partial<FaqData>) {
  const a = before.items ?? [];
  const b = after.items ?? [];
  const aQ = new Map(a.map((it) => [it.q, it]));
  const bQ = new Set(b.map((it) => it.q));
  const renamed = new Map<string, string>(); // 옛 질문 → 새 질문
  const arrived = b.filter((it) => !aQ.has(it.q));
  const left = a.filter((it) => !bQ.has(it.q));
  for (const it of left) {
    const i = arrived.findIndex((x) => x.a === it.a);
    if (i >= 0) renamed.set(it.q, arrived.splice(i, 1)[0].q);
  }

  const added: Change[] = arrived.map((it) => ({ op: "add", text: `「${it.q}」`, detail: it.a }));
  const removed: Change[] = left.filter((it) => !renamed.has(it.q)).map((it) => ({ op: "del", text: `「${it.q}」`, detail: it.a }));
  const questions: Change[] = [...renamed].map(([was, now]) => ({ op: "mod", text: "질문", before: was, after: now }));
  const answers: Change[] = b
    .filter((it) => aQ.has(it.q) && aQ.get(it.q)!.a !== it.a)
    .map((it) => ({ op: "mod", text: `「${it.q}」의 답`, before: aQ.get(it.q)!.a, after: it.a, block: true }));

  /* 둘 다에 있는 문답의 순서(질문을 바꾼 것은 새 질문으로 맞춰 본다). */
  const beforeOrder = a.map((it) => renamed.get(it.q) ?? it.q).filter((q) => bQ.has(q));
  const both = new Set(beforeOrder);
  const afterOrder = b.map((it) => it.q).filter((q) => both.has(q));
  const moves: Change[] = [];
  if (beforeOrder.join("\n") !== afterOrder.join("\n")) {
    const was = new Map(a.map((it, i) => [renamed.get(it.q) ?? it.q, i + 1]));
    afterOrder.forEach((q, i) => {
      if (beforeOrder[i] === q) return;
      moves.push({ op: "mod", text: `「${q}」 ${was.get(q)}번째 → ${b.findIndex((x) => x.q === q) + 1}번째` });
    });
  }

  const changes = [...answers, ...questions, ...added, ...removed, ...moves];
  const summary =
    [
      answers.length && `답 ${answers.length}개 고침`,
      questions.length && `질문 ${questions.length}개 고침`,
      added.length && `문답 ${added.length}개 추가`,
      removed.length && `문답 ${removed.length}개 지움`,
      moves.length && "순서 바꿈",
    ]
      .filter(Boolean)
      .join(" · ") || "바뀐 것 없음";
  return { changes, summary };
}
