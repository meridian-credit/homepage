import { toJsxRuntime, type Components } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { getUploadSizes } from "@/lib/content/read";
import { isSafeHref, markdownToHast } from "@/lib/content/markdown";
import { uploadName, uploadsIn } from "@/lib/content/post-data";

/* 블로그 본문(GFM Markdown)을 그린다. 2026-11-16 에 MDX(next-mdx-remote)에서 바꿨다.
 * - 글은 관리자가 DB 에 쓴다. MDX 는 본문의 { } 를 JS 로 실행하므로, 관리자 계정을 빼앗기면 공개 서버에서 코드가
 *   돈다. 그리고 본문에 { 나 < 하나만 있어도 글이 통째로 깨진다. 여기는 Markdown 만 읽고 아무것도 실행하지 않는다.
 * - 본문 속 HTML 은 그리지 않는다(remark-rehype 가 버린다). 관리자 게시 전 검사가 그 점을 미리 알린다.
 * - 링크는 http(s) · 사이트 안 주소 · # 만 남긴다. 사진은 관리자에서 올린 것(/uploads/…)만 그리고, DB 의
 *   가로 · 세로를 붙여 사진이 늦게 와도 글이 밀리지 않게 한다.
 * - 관리자의 편집기(Milkdown)도 remark 로 읽고 쓴다. 같은 해석이라 편집기에서 본 대로 나온다. */

export default function PostBody({ source }: { source: string }) {
  const sizes = getUploadSizes(uploadsIn({ body: source, cover: "" }));
  const components: Partial<Components> = {
    /* 쪽 맨 위의 글 제목이 제목 1 이다. 본문의 제목 1 은 제목 2 로 낮춘다(관리자는 게시 전에 알린다). */
    h1: (props) => <h2 {...props} />,
    a: ({ href, ...props }) => {
      if (!isSafeHref(href)) return <span {...props} />;
      const external = href.startsWith("http://") || href.startsWith("https://");
      return <a {...props} href={href} rel={external ? "noopener noreferrer" : undefined} />;
    },
    img: ({ src, alt, title }) => {
      const name = typeof src === "string" ? uploadName(src) : null;
      const size = name ? sizes.get(name) : undefined;
      if (!name || !size) return null;
      /* 사진은 올릴 때 이미 WebP · 가로 1600px 이하로 구웠다. next/image 로 한 번 더 굽지 않는다. */
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={`/uploads/${name}`} alt={alt ?? ""} title={title} width={size.width} height={size.height} loading="lazy" decoding="async" />;
    },
    /* 넓은 표는 표만 옆으로 밀리게 감싼다. 문서 전체가 가로로 늘지 않게. */
    table: (props) => (
      <div className="table-scroll">
        <table {...props} />
      </div>
    ),
  };
  return (
    <div className="prose max-w-none">
      {toJsxRuntime(markdownToHast(source), { Fragment, jsx, jsxs, components, passNode: false })}
    </div>
  );
}
