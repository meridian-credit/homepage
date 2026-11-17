import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { DIAGRAM_KINDS } from "@/lib/diagram.mjs";

type MdNode = { type: string; lang?: string | null; meta?: string | null; value?: string; data?: object; children?: MdNode[] };

/* ```흐름 같은 도식 코드 블록을 <x-diagram> 요소로 바꾼다. post-body.tsx 가 그 요소를 도식으로 그린다.
   글에는 텍스트만 남아 편집기(Milkdown)가 코드 블록으로 그대로 지킨다. 문법은 src/lib/diagram.mjs. */
function remarkDiagrams() {
  const walk = (node: MdNode) => {
    node.children?.forEach((child, i) => {
      if (child.type === "code" && child.lang && DIAGRAM_KINDS.includes(child.lang)) {
        node.children![i] = {
          type: "diagram",
          data: { hName: "x-diagram", hProperties: { kind: child.lang, meta: child.meta ?? "", body: child.value ?? "" } },
        };
      } else walk(child);
    });
  };
  return walk;
}

/* 블로그 본문(GFM Markdown) → HTML 나무(hast). 공개 사이트가 그릴 때(src/components/blog/post-body.tsx)와 관리자가
   게시 전에 한 번 그려 볼 때가 같은 것을 쓴다. 본문 속 HTML 은 버린다(remark-rehype 기본값). */
const processor = unified().use(remarkParse).use(remarkGfm).use(remarkDiagrams).use(remarkRehype);

export function markdownToHast(source: string) {
  return processor.runSync(processor.parse(source));
}

/* 링크로 남길 주소: http(s), 사이트 안 주소(/…), 같은 쪽 안(#…). //로 시작하는 남의 주소는 막는다. */
export function isSafeHref(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value.startsWith("//")) return false;
  if (value.startsWith("/") || value.startsWith("#")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
