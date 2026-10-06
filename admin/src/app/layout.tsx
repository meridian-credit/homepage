import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "메리디안 관리자", template: "%s | 메리디안 관리자" },
  robots: { index: false, follow: false },
};

/* 개발 서버에서는 맨 위에 띠를 둔다. 여기서 고친 내용이 운영 사이트에 반영된다고 착각하지 않게. */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const band = process.env.ADMIN_ENV_BAND;
  return (
    <html lang="ko">
      <body>
        {band ? <div className="env-band">{band}</div> : null}
        {children}
      </body>
    </html>
  );
}
