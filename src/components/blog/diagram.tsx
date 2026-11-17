import type { CSSProperties } from "react";
import { parseDiagram } from "@/lib/diagram.mjs";

type Parsed = Extract<ReturnType<typeof parseDiagram>, { ok: true }>["diagram"];
type FlowQ = Extract<Parsed, { kind: "흐름" }>["root"];

const pct = (n: number) => `${n.toFixed(2)}%`;

/* 글 안의 도식. markdown.ts 의 remarkDiagrams 가 ```흐름 같은 코드 블록을 이 컴포넌트로 보낸다.
   형식이 틀린 블록은 코드 그대로 보여 준다. 관리자 게시 전 검사가 그런 블록을 오류로 막는다. */
export default function Diagram({ kind, meta, body }: { kind: string; meta: string; body: string }) {
  const parsed = parseDiagram(kind, body, meta);
  if (!parsed.ok) {
    return (
      <pre>
        <code>{body}</code>
      </pre>
    );
  }
  const d = parsed.diagram;
  return (
    <figure className={`dg dg-${KIND_CLASS[d.kind]}`}>
      <div className="dg-kind">{KIND_LABEL[d.kind]}</div>
      <div className="dg-title">{d.title}</div>
      <DiagramBody d={d} />
      {d.source && <figcaption>근거: {d.source}</figcaption>}
    </figure>
  );
}

const KIND_CLASS = { 흐름: "flow", 구간: "bands", 일정: "time", 계산: "calc", 비교: "cmp", 단계: "steps" } as const;
const KIND_LABEL = { 흐름: "판단 흐름", 구간: "기준 구간", 일정: "일정", 계산: "계산", 비교: "비교", 단계: "단계" } as const;

function DiagramBody({ d }: { d: Parsed }) {
  switch (d.kind) {
    case "흐름":
      return <div className="dg-fc"><FlowQuestion node={d.root} /></div>;

    case "구간":
      return (
        <div className="dg-scale" style={{ "--n": d.bands.length } as CSSProperties}>
          <ol className="dg-band-bar">
            {d.bands.map(b => (
              <li key={b.start}>
                <span className="dg-band-name">{b.name}</span>
                <span className="dg-band-start">{b.start}</span>
                {b.desc && <span className="dg-band-desc">{b.desc}</span>}
              </li>
            ))}
          </ol>
        </div>
      );

    case "일정":
      return (
        <div className="dg-rail">
          <div className="dg-rail-line" aria-hidden="true" />
          {d.windows.map(w => (
            <div key={w.text} className="dg-window" style={{ left: pct(w.left), width: pct(w.width) }}>
              <span>{w.text}</span>
            </div>
          ))}
          <ol>
            {d.points.map((p, i) => (
              <li
                key={p.date}
                className={[
                  "dg-ev",
                  p.hot && "hot",
                  p.below && "below",
                  i === 0 ? "first" : i === d.points.length - 1 ? "last" : "",
                ].filter(Boolean).join(" ")}
                style={{ left: pct(p.pos) }}
              >
                <time dateTime={p.date}>{formatDay(p.date, d.points[0].date)}</time>
                <span>{p.text}</span>
              </li>
            ))}
          </ol>
        </div>
      );

    case "계산":
      return (
        <div className="dg-wf">
          {d.rows.map((r, i) => (
            <div className={`dg-wf-row ${r.tone}`} key={i}>
              <span className="dg-wf-k">
                {r.op && <span className="dg-op">{r.op === "-" ? "−" : r.op}</span>} {r.label}
              </span>
              <span className="dg-wf-bar" aria-hidden="true">
                <i style={{ left: pct(r.left), width: pct(r.width) }} />
              </span>
              <span className="dg-wf-v">{r.amount.toLocaleString("ko-KR")}<small>원</small></span>
            </div>
          ))}
        </div>
      );

    case "비교":
      return (
        <div className="dg-cards" style={{ "--n": d.cards.length } as CSSProperties}>
          {d.cards.map(c => (
            <div className={c.pick ? "dg-card pick" : "dg-card"} key={c.name}>
              <div className="dg-card-name">{c.name}</div>
              {c.when && <span className="dg-when">{c.when}</span>}
              <dl>
                {c.rows.map(r => (
                  <div key={r.label}>
                    <dt>{r.label}</dt>
                    <dd>
                      {r.value}
                      {r.level && (
                        <span className="dg-meter" role="img" aria-label={`3단계 중 ${r.level}`}>
                          {[1, 2, 3].map(n => <i key={n} className={n <= (r.level ?? 0) ? "on" : undefined} />)}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      );

    case "단계":
      return (
        <ol className="dg-step-list">
          {d.steps.map(s => (
            <li key={s.title}>
              <b>{s.title}</b>
              {s.desc && <span>{s.desc}</span>}
            </li>
          ))}
        </ol>
      );
  }
}

function FlowQuestion({ node }: { node: FlowQ }) {
  return (
    <>
      <div className="dg-node"><span className="dg-node-tag">질문</span>{node.q}</div>
      <div className="dg-split" aria-hidden="true" style={{ "--n": node.branches.length } as CSSProperties} />
      <ul className="dg-cols" style={{ "--n": node.branches.length } as CSSProperties}>
        {node.branches.map(b => (
          <li key={b.answer}>
            <span className={/^(예|네|있다|해당)/.test(b.answer) ? "dg-yn" : "dg-yn no"}>{b.answer}</span>
            {"q" in b.node ? (
              <FlowQuestion node={b.node} />
            ) : (
              <div className={`dg-out ${b.node.tone}`}>
                {b.node.result}
                {b.node.note && <small>{b.node.note}</small>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

/** 2026-08-31 → "8월 31일". 첫 점과 해가 다르면 연도를 붙인다. */
function formatDay(date: string, first: string) {
  const [y, m, dd] = date.split("-").map(Number);
  const label = `${m}월 ${dd}일`;
  return date.slice(0, 4) === first.slice(0, 4) ? label : `${y}년 ${label}`;
}
