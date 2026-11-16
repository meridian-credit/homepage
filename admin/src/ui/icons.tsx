/* 아이콘. 선 하나짜리 24×24 를 직접 둔다 — 아이콘 묶음 패키지 하나보다 작고, CSP('self')에 걸릴 것이 없다.
   색은 글자색(currentColor)을 따른다. 뜻은 늘 옆 글자나 aria-label 이 전하고, 아이콘 자체는 읽히지 않는다. */
const PATHS = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h5v-6h4v6h5V9.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  faq: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.8" />
      <path d="M12 17.2h.01" />
    </>
  ),
  history: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3.5 4.5v4h4" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  pencil: (
    <>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4.5h6V7" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  chevron: <path d="M6 9l6 6 6-6" />,
  right: <path d="M9 6l6 6-6 6" />,
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  down: <path d="M12 5v14M6 13l6 6 6-6" />,
  swap: (
    <>
      <path d="M8 20V4M4 8l4-4 4 4" />
      <path d="M16 4v16M12 16l4 4 4-4" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  alert: (
    <>
      <path d="M12 4 2.8 19.5h18.4L12 4z" />
      <path d="M12 10v4.5M12 17.3h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.8h.01" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 16l-4-4 4-4M6 12h10" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
      <path d="M20 20v-4h-4" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" />
      <path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.6c.5-.1.9-.1 1.4-.1 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.9 3.6M6.5 7.2C4 8.9 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.3-1.1" />
      <path d="M9.9 10a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  /* 블로그 글 편집(2026-11-16) */
  post: (
    <>
      <path d="M6 3.5h8.5L19 8v12.5H6z" />
      <path d="M14 3.5V8h5M9 12h7M9 15.5h7M9 9h3" />
    </>
  ),
  bold: <path d="M7 4.5h6a3.75 3.75 0 0 1 0 7.5H7zM7 12h7a4 4 0 0 1 0 8H7z" />,
  italic: <path d="M10 4.5h8M6 19.5h8M14.5 4.5l-5 15" />,
  strike: (
    <>
      <path d="M4 12h16" />
      <path d="M16.5 7.5c-.6-1.8-2.3-3-4.6-3-2.7 0-4.4 1.5-4.4 3.4 0 1.4.9 2.4 2.6 3.1M8 16.5c.5 1.9 2.3 3 4.3 3 2.8 0 4.7-1.4 4.7-3.5 0-.7-.2-1.3-.6-1.8" />
    </>
  ),
  paragraph: <path d="M13 4.5v15M17 4.5v15M17 4.5H10a4 4 0 0 0 0 8h3" />,
  h2: <path d="M4 5v14M12 5v14M4 12h8M15.5 9.5a2.5 2.5 0 0 1 5 .4c0 1.9-5 4.4-5 9.1h5" />,
  h3: <path d="M4 5v14M12 5v14M4 12h8M15.5 8h5l-3 4a3.2 3.2 0 1 1-2.3 5.4" />,
  "list-ul": <path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />,
  "list-ol": <path d="M10 6.5h10M10 12h10M10 17.5h10M4 5l1.5-.5V9M3.8 14.5a1.3 1.3 0 0 1 2.4.7L3.8 19h2.6" />,
  indent: <path d="M4 6h16M10 10h10M10 14h10M4 18h16M4 9.5l3 2.5-3 2.5" />,
  outdent: <path d="M4 6h16M10 10h10M10 14h10M4 18h16M7 9.5 4 12l3 2.5" />,
  quote: <path d="M5 11.5h4.5V17H5v-5.5c0-2.8 1.5-4.7 4-5.5M14 11.5h4.5V17H14v-5.5c0-2.8 1.5-4.7 4-5.5" />,
  hr: <path d="M3.5 12h17M7 7h10M7 17h10" />,
  table: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10M15 9.5v10" />
    </>
  ),
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  unlink: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1M3.5 3.5l17 17" />,
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M20.5 15.5 16 11l-8.5 8.5" />
    </>
  ),
  redo: (
    <>
      <path d="M15 8.5h-5.5a5 5 0 0 0 0 10H14" />
      <path d="M12 5l3.5 3.5L12 12" />
    </>
  ),
  more: <path d="M5.5 12h.01M12 12h.01M18.5 12h.01" />,
  send: (
    <>
      <path d="M12 16V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4.5 14v4.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V14" />
    </>
  ),
  unpublish: (
    <>
      <path d="M12 4v12M7.5 11.5 12 16l4.5-4.5" />
      <path d="M4.5 14v4.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V14" />
    </>
  ),
  "row-add": (
    <>
      <rect x="3.5" y="4" width="17" height="10" rx="1.5" />
      <path d="M3.5 9h17M12 16.5v5M9.5 19h5" />
    </>
  ),
  "col-add": (
    <>
      <rect x="3.5" y="3.5" width="10" height="17" rx="1.5" />
      <path d="M8.5 3.5v17M16.5 12h5M19 9.5v5" />
    </>
  ),
  "row-del": (
    <>
      <rect x="3.5" y="4" width="17" height="10" rx="1.5" />
      <path d="M3.5 9h17M9.5 19h5" />
    </>
  ),
  "col-del": (
    <>
      <rect x="3.5" y="3.5" width="10" height="17" rx="1.5" />
      <path d="M8.5 3.5v17M16.5 12h5" />
    </>
  ),
  "align-left": <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />,
  "align-center": <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />,
  "align-right": <path d="M4 6h16M10 10h10M4 14h16M10 18h10" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.3-4.3" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, small, className }: { name: IconName; small?: boolean; className?: string }) {
  return (
    <svg className={["i", small ? "i-sm" : "", className ?? ""].filter(Boolean).join(" ")} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

/* 메리디안 표식. 공개 사이트의 남색 위에 자오선(MERIDIAN) 하나. */
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0E1D4A" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="#fff" strokeWidth="1.6" />
      <ellipse cx="16" cy="16" rx="3.6" ry="8.5" fill="none" stroke="#7E9CFF" strokeWidth="1.6" />
      <path d="M16 7.5v17" stroke="#fff" strokeWidth="1.6" />
    </svg>
  );
}
