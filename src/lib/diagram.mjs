// 블로그 글 안의 도식 블록(```흐름 제목 ... ```)을 읽는다. 사이트(src/lib/content/markdown.ts)와 관리자 게시 전
// 검사(admin/src/content/post.ts)가 같이 쓰고, node --test 로 바로 돌도록 .mjs 로 둔다. 문법은 daily-tax-content 스킬의 references/diagrams.md 와 같다.

export const DIAGRAM_KINDS = ["흐름", "구간", "일정", "계산", "비교", "단계", "구성"];

/**
 * @typedef {{ answer: string, node: FlowNode }} FlowBranch
 * @typedef {{ q: string, branches: FlowBranch[] }} FlowQuestion
 * @typedef {FlowQuestion | { result: string, note?: string, tone: "good" | "pay" | "alt" }} FlowNode
 * @typedef {{ start: string, name: string, desc: string }} Band
 * @typedef {{ date: string, text: string, hot: boolean, pos: number, below: boolean }} TimePoint
 * @typedef {{ text: string, left: number, width: number }} TimeWindow
 * @typedef {{ op: string, label: string, amount: number, left: number, width: number, tone: "base" | "minus" | "plus" | "mid" | "res" }} CalcRow
 * @typedef {{ name: string, pick: boolean, when?: string, rows: { label: string, value: string, level?: number }[] }} CompareCard
 * @typedef {{ title: string, desc?: string }} Step
 * @typedef {{ name: string, note?: string, pick: boolean }} Box
 * @typedef {{ boxes: Box[], labels: string[] }} BoxRow
 * @typedef {{ kind: "흐름", root: FlowQuestion }
 *   | { kind: "구간", bands: Band[] }
 *   | { kind: "일정", points: TimePoint[], windows: TimeWindow[] }
 *   | { kind: "계산", rows: CalcRow[] }
 *   | { kind: "비교", cards: CompareCard[] }
 *   | { kind: "단계", steps: Step[] }
 *   | { kind: "구성", rows: BoxRow[] }} DiagramBody
 * @typedef {DiagramBody & { title: string, source?: string }} Diagram
 */

/** @param {string} s */
const split = s => s.split("|").map(t => t.trim());

/** "1억 400만 원", "4,800만 원", "30,000,000", "5명" 을 수로 읽는다. 못 읽으면 NaN. */
export function parseAmount(/** @type {string} */ text) {
  const s = text.replace(/[,\s]/g, "");
  const m = s.match(/^(?:(\d+(?:\.\d+)?)억)?(?:(\d+(?:\.\d+)?)만)?(\d+(?:\.\d+)?)?(?:원|명|개|%)?$/);
  if (!m || (!m[1] && !m[2] && !m[3])) return NaN;
  return (Number(m[1] ?? 0) * 1e8) + (Number(m[2] ?? 0) * 1e4) + Number(m[3] ?? 0);
}

/**
 * 블록 첫 줄이 제목이다. 관리자 편집기(Milkdown)는 코드 블록의 언어만 지키고 그 뒤 글자(```흐름 제목)는 지우므로,
 * 제목을 언어 줄에 두면 글을 한 번 열었다 저장하는 순간 사라진다.
 * @param {string} kind 코드 블록 언어(흐름, 구간 ...)
 * @param {string} body 블록 본문. 첫 줄은 제목
 * @param {string | null} [meta] 언어 뒤의 글자. 있으면 거부한다
 * @returns {{ ok: true, diagram: Diagram } | { ok: false, error: string }}
 */
export function parseDiagram(kind, body, meta) {
  if (!DIAGRAM_KINDS.includes(kind)) return { ok: false, error: `모르는 도식 종류 "${kind}"` };
  if (meta?.trim()) return { ok: false, error: `제목은 \`\`\`${kind} 줄이 아니라 블록 첫 줄에 쓴다(편집기가 지운다)` };
  let lines = body.split(/\r?\n/).filter(l => l.trim());
  const title = lines.shift()?.trim();
  if (!title) return { ok: false, error: "첫 줄에 제목이 없다" };
  let source;
  if (lines.length && /^근거\s*:/.test(lines.at(-1).trim())) {
    source = lines.at(-1).trim().replace(/^근거\s*:\s*/, "");
    lines = lines.slice(0, -1);
  }
  try {
    const parsed = PARSERS[kind](lines);
    return { ok: true, diagram: { ...parsed, title, source } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** @param {boolean} cond @param {string} msg */
function need(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** @type {Record<string, (lines: string[]) => DiagramBody>} */
const PARSERS = {
  흐름(lines) {
    need(lines.length >= 3, "질문 하나와 갈래 둘 이상이 필요하다");
    need(!/^\s*-/.test(lines[0]), "첫 줄은 질문이어야 한다");
    /** @type {FlowQuestion} */
    const root = { q: lines[0].trim(), branches: [] };
    /** @type {FlowQuestion[]} */
    const parents = [root];
    let results = 0;
    for (const line of lines.slice(1)) {
      const m = line.match(/^( *)-\s*([^:]+):\s*(.+)$/);
      need(!!m, `갈래 줄 형식이 아니다: "${line.trim()}"`);
      const [, indent, answer, rest] = /** @type {RegExpMatchArray} */ (m);
      const depth = Math.floor(indent.length / 2);
      const parent = parents[depth];
      need(!!parent, `들여쓰기가 맞지 않는다: "${line.trim()}"`);
      /** @type {FlowNode} */
      let node;
      if (rest.trim().endsWith("?")) {
        need(depth < 1, "질문은 두 층까지만 쓴다");
        node = { q: rest.trim(), branches: [] };
        parents[depth + 1] = node;
      } else {
        const tone = rest.match(/\((좋음|납부)\)\s*$/)?.[1];
        const [result, note] = split(rest.replace(/\((좋음|납부)\)\s*$/, ""));
        node = { result, note: note || undefined, tone: tone === "좋음" ? "good" : tone === "납부" ? "pay" : "alt" };
        results += 1;
      }
      parents.length = depth + 2;
      parent.branches.push({ answer: answer.trim(), node });
    }
    need(results <= 4, "결과는 네 개까지만 쓴다");
    const check = (/** @type {FlowQuestion} */ n) => {
      need(n.branches.length >= 2, `"${n.q}" 에 갈래가 둘 이상 있어야 한다`);
      n.branches.forEach(b => "q" in b.node && check(b.node));
    };
    check(root);
    return { kind: "흐름", root };
  },

  구간(lines) {
    need(lines.length >= 2 && lines.length <= 4, "구간은 두 개에서 네 개");
    const bands = lines.map(l => {
      const [start, name, desc = ""] = split(l);
      need(!!start && !!name, `"시작값 | 이름 | 설명" 형식이 아니다: "${l}"`);
      return { start, name, desc };
    });
    const values = bands.map(b => parseAmount(b.start));
    if (values.every(Number.isFinite)) need(values.every((v, i) => i === 0 || v > values[i - 1]), "시작값은 작은 것부터 쓴다");
    return { kind: "구간", bands };
  },

  일정(lines) {
    const day = (/** @type {string} */ s) => {
      need(/^\d{4}-\d{2}-\d{2}$/.test(s), `날짜는 YYYY-MM-DD: "${s}"`);
      const t = Date.parse(`${s}T00:00:00Z`);
      need(Number.isFinite(t), `없는 날짜: "${s}"`);
      return t;
    };
    /** @type {{ date: string, t: number, text: string, hot: boolean }[]} */
    const raw = [];
    /** @type {{ a: number, b: number, text: string }[]} */
    const spans = [];
    for (const l of lines) {
      const [when, text] = split(l);
      need(!!when && !!text, `"날짜 | 내용" 형식이 아니다: "${l}"`);
      const range = when.split("~").map(s => s.trim());
      if (range.length === 2) spans.push({ a: day(range[0]), b: day(range[1]), text });
      else {
        const hot = /\*\s*$/.test(text);
        raw.push({ date: when, t: day(when), text: text.replace(/\s*\*\s*$/, ""), hot });
      }
    }
    need(raw.length >= 3 && raw.length <= 6, "날짜는 세 개에서 여섯 개");
    need(raw.every((p, i) => i === 0 || p.t > raw[i - 1].t), "날짜는 이른 것부터 쓴다");
    const t0 = raw[0].t;
    const range = raw.at(-1).t - t0;
    const pos = (/** @type {number} */ t) => Math.min(100, Math.max(0, ((t - t0) / range) * 100));
    let lastTop = -100;
    const points = raw.map(p => {
      const at = pos(p.t);
      // 위 줄에서 앞 점과 너무 가까우면 글자가 겹치므로 아래 줄로 내린다
      const below = at - lastTop < 18 && at < 100;
      if (!below) lastTop = at;
      return { date: p.date, text: p.text, hot: p.hot, pos: at, below };
    });
    const windows = spans.map(s => ({ text: s.text, left: pos(s.a), width: pos(s.b) - pos(s.a) }));
    return { kind: "일정", points, windows };
  },

  계산(lines) {
    need(lines.length >= 2, "두 줄 이상");
    const parsed = lines.map(l => {
      const [left, amountText] = split(l);
      need(amountText !== undefined, `"항목 | 금액" 형식이 아니다: "${l}"`);
      const amount = parseAmount(amountText);
      need(Number.isFinite(amount), `금액을 읽지 못했다: "${amountText}"`);
      const op = /^[-+×=−]/.test(left) ? left[0].replace("−", "-") : "";
      return { op, label: left.replace(/^[-+×=−]\s*/, ""), amount };
    });
    need(parsed[0].op === "", "첫 줄은 시작 금액이다");
    // 따라 계산해 보고 틀리면 그리지 않는다. 세무 글의 계산 예시가 틀리면 신뢰를 잃는다.
    let run = parsed[0].amount;
    for (const r of parsed.slice(1)) {
      if (r.op === "-") run -= r.amount;
      else if (r.op === "+") run += r.amount;
      else if (r.op === "×") {
        const f = r.label.match(/^([\d.]+)\s*(?:\/\s*([\d.]+)|(%))?/);
        if (f) run = Math.floor(run * Number(f[1]) / (f[3] ? 100 : Number(f[2] ?? 1)));
        need(!f || run === r.amount, `계산이 맞지 않는다: "${r.label}" 은 ${run.toLocaleString("en-US")}`);
        run = r.amount;
      } else if (r.op === "=") need(run === r.amount, `계산이 맞지 않는다: "${r.label}" 은 ${run.toLocaleString("en-US")}`);
      else run = r.amount;
    }
    const max = Math.max(...parsed.map(r => r.amount), 1);
    let prev = 0;
    const rows = parsed.map((r, i) => {
      const w = (r.amount / max) * 100;
      const last = i === parsed.length - 1;
      /** @type {CalcRow} */
      const row = r.op === "-" ? { ...r, left: ((prev - r.amount) / max) * 100, width: w, tone: "minus" }
        : r.op === "+" ? { ...r, left: (prev / max) * 100, width: w, tone: "plus" }
        : { ...r, left: 0, width: w, tone: last ? "res" : i === 0 ? "base" : "mid" };
      row.left = Math.max(0, Math.min(100 - row.width, row.left));
      prev = r.amount;
      return row;
    });
    return { kind: "계산", rows };
  },

  비교(lines) {
    const cells = lines.map(l => {
      need(l.trim().startsWith("|"), `표 줄은 | 로 시작한다: "${l}"`);
      return split(l.trim().replace(/^\||\|$/g, ""));
    }).filter(r => !r.every(c => /^:?-+:?$/.test(c)));
    need(cells.length >= 2, "머리 줄과 내용 줄이 필요하다");
    const names = cells[0].slice(1);
    need(names.length >= 2 && names.length <= 3, "비교 대상은 두세 개");
    const cards = names.map((n, i) => {
      /** @type {CompareCard} */
      const card = { name: n.replace(/\s*\*$/, ""), pick: /\*$/.test(n), rows: [] };
      for (const r of cells.slice(1)) {
        need(r.length === names.length + 1, `칸 수가 머리 줄과 다르다: "${r.join(" | ")}"`);
        const v = r[i + 1];
        if (r[0] === "언제") { card.when = v; continue; }
        const lv = v.match(/\s*\[([1-3])\]$/);
        card.rows.push({ label: r[0], value: v.replace(/\s*\[[1-3]\]$/, ""), level: lv ? Number(lv[1]) : undefined });
      }
      return card;
    });
    return { kind: "비교", cards };
  },

  단계(lines) {
    need(lines.length >= 2 && lines.length <= 8, "단계는 두 개에서 여덟 개");
    const steps = lines.map(l => {
      const m = l.trim().match(/^\d+\.\s*([^:]+?)(?::\s*(.+))?$/);
      need(!!m, `"번호. 제목: 설명" 형식이 아니다: "${l}"`);
      const [, title, desc] = /** @type {RegExpMatchArray} */ (m);
      return { title, desc };
    });
    return { kind: "단계", steps };
  },

  // 정해진 모양이 없는 그림(관계, 돈의 흐름)을 상자와 화살표로 조립한다. 한 줄이 가로 한 줄이다.
  구성(lines) {
    need(lines.length >= 1 && lines.length <= 6, "줄은 한 개에서 여섯 개");
    const rows = lines.map(l => {
      const parts = l.trim().split(/\s*(?:→|->)\s*/);
      /** @type {BoxRow} */
      const row = { boxes: [], labels: [] };
      let label = null;
      for (const p of parts) {
        const m = p.match(/^\[([^\]|]+?)(?:\s*\|\s*([^\]]+?))?\s*\](\*)?$/);
        if (m) {
          if (row.boxes.length) row.labels.push(label ?? "");
          row.boxes.push({ name: m[1].trim(), note: m[2]?.trim() || undefined, pick: !!m[3] });
          label = null;
        } else {
          need(row.boxes.length > 0 && label === null && !!p, `"[상자] → 설명 → [상자]" 형식이 아니다: "${l.trim()}"`);
          label = p;
        }
      }
      need(label === null && row.boxes.length >= 2, `줄은 상자로 시작하고 상자로 끝난다: "${l.trim()}"`);
      need(row.boxes.length <= 3, `한 줄에 상자는 세 개까지: "${l.trim()}"`);
      return row;
    });
    need(rows.flatMap(r => r.boxes).filter(b => b.pick).length <= 1, "강조(*)는 한 도식에 하나");
    return { kind: "구성", rows };
  },
};
