import type { Metadata } from "next";
/* 글꼴은 공개 사이트와 같은 Pretendard 를 저장소에서 가져온다. Next 가 woff2 를 /_next/static/media 로 내보내므로
   CSP font-src 'self' 그대로다. 글자 범위(unicode-range)마다 나뉘어 있어 쓰는 글자의 조각만 받는다. */
import "@/fonts/pretendard/PretendardVariable.css";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "메리디안 사이트 관리", template: "%s | 메리디안 사이트 관리" },
  robots: { index: false, follow: false },
};

/* 개발 서버에서는 맨 위에 띠를 둔다. 여기서 고친 내용이 운영 사이트에 반영된다고 착각하지 않게.
   ADMIN_ENV_BAND 가 「개발 서버 — 설명」 꼴이면 앞쪽을 꼬리표로 뗀다. 운영에서는 비워 띠가 없다. */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const band = process.env.ADMIN_ENV_BAND;
  const [tag, text] = band?.includes(" — ") ? band.split(" — ", 2) : ["안내", band];
  return (
    <html lang="ko">
      <body>
        {band ? (
          <div className="env-band" role="note">
            <b>{tag}</b>
            <span>{text}</span>
          </div>
        ) : null}
        {children}
      </body>
    </html>
  );
}
