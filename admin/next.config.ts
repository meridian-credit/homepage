import path from "node:path";
import type { NextConfig } from "next";

/* 관리자 앱. 공개 사이트와 같은 저장소 · 같은 node_modules 를 쓰지만 따로 빌드하고 따로 띄운다
   (`next build admin`, `next start admin`). 공개 사이트와 콘텐츠 코드(../src)를 같이 쓰므로 turbopack 의
   뿌리는 저장소 맨 위다.

   공개 사이트에 넣지 않은 까닭: 공개 쪽 layout(머리 · 바닥 · 스크롤)과 따로 놀아야 하고, /contract 가
   같은 주소에서 남의 앱을 돌리므로 관리자 세션은 다른 호스트(accounting-admin.teamcredit.kr)에 둔다. */
const root = path.resolve(__dirname, "..");
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "script-src-attr 'none'",
  "connect-src 'self'",
  isDev ? "" : "upgrade-insecure-requests",
]
  .filter(Boolean)
  .join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root },
  outputFileTracingRoot: root,
  serverExternalPackages: ["better-sqlite3"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
