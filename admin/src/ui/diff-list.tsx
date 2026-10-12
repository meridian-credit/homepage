import type { Change } from "@admin/content/types";

/* 바뀐 내용 목록. 변경 기록 · 되돌리기 미리 보기 · 충돌 창이 같은 모양으로 그린다.
   +(새로) · −(빠짐) · ~(바뀜). 기호는 화면 읽기 프로그램에 읽히지 않으므로 숨은 글자로 뜻을 붙인다. */
const GLYPH = { add: "+", del: "−", mod: "~" } as const;
const SPOKEN = { add: "추가: ", del: "지움: ", mod: "고침: " } as const;

/* 긴 글(FAQ 답)의 앞뒤에서 같은 머리 · 꼬리를 떼고, 달라진 가운데만 칠한다. 600자 답에서 한 낱말을 고친 것도 바로 보인다. */
function split(before: string, after: string) {
  let head = 0;
  while (head < before.length && head < after.length && before[head] === after[head]) head++;
  let tail = 0;
  while (tail < before.length - head && tail < after.length - head && before.at(-1 - tail) === after.at(-1 - tail)) tail++;
  const cut = (s: string) => [s.slice(0, head), s.slice(head, s.length - tail), s.slice(s.length - tail)] as const;
  return { before: cut(before), after: cut(after) };
}

export function DiffList({
  changes,
  labels = SPOKEN,
  blockLabels = ["전", "후"],
}: {
  changes: Change[];
  labels?: Record<Change["op"], string>;
  blockLabels?: [string, string];
}) {
  return (
    <ul className="diff">
      {changes.map((c, i) => (
        <li key={i} className={c.op}>
          <span className="g" aria-hidden="true">
            {GLYPH[c.op]}
          </span>
          <span className="t">
            <span className="sr-only">{labels[c.op]}</span>
            {c.op === "mod" && c.before !== undefined && !c.block ? (
              <>
                {c.text} <del>{c.before}</del> → <ins>{c.after}</ins>
              </>
            ) : (
              c.text
            )}
            {c.op === "mod" && c.block ? <BeforeAfter before={c.before ?? ""} after={c.after ?? ""} labels={blockLabels} /> : null}
            {c.op !== "mod" && c.detail ? <span className="diff-detail">{c.detail}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function BeforeAfter({ before, after, labels }: { before: string; after: string; labels: [string, string] }) {
  const parts = split(before, after);
  return (
    <span className="before-after">
      <span>
        <span className="k">{labels[0]}</span>
        <span>
          {parts.before[0]}
          {parts.before[1] ? <del>{parts.before[1]}</del> : null}
          {parts.before[2]}
        </span>
      </span>
      <span>
        <span className="k">{labels[1]}</span>
        <span>
          {parts.after[0]}
          {parts.after[1] ? <ins>{parts.after[1]}</ins> : null}
          {parts.after[2]}
        </span>
      </span>
    </span>
  );
}

/* 복사용 글. 충돌 창의 「내 변경 복사」가 쓴다. */
export const changesAsText = (changes: Change[]) =>
  changes
    .map((c) =>
      c.op === "mod"
        ? c.before !== undefined
          ? `~ ${c.text}: ${c.before} → ${c.after}`
          : `~ ${c.text}`
        : `${GLYPH[c.op]} ${c.text}${c.detail ? `\n  ${c.detail}` : ""}`
    )
    .join("\n");
